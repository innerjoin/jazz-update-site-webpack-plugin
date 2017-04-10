'use strict';

var glob = require('glob-all');
// var zipper = require('zip-local');
var fs = require('fs');
// var path = require('path');
// var archiver = require('archiver');
var RawSource = require('webpack-sources').RawSource;
var yazl = require('yazl');

function JazzUpdateSitePlugin(options) {
	this.options = options || {};
    this.options.projectInfo = options.projectInfo || {};
}

JazzUpdateSitePlugin.prototype.apply = function(compiler) {
	const options = this.options;
    const appType = this.options.appType;
    const projectId = this.options.projectId;

    const projectInfo = this.options.projectInfo;
    console.log(projectInfo);
    const author = projectInfo.author;
    const version = projectInfo.version;
    const description = projectInfo.description;
    const copyright = projectInfo.copyright;
    const license = projectInfo.license;

    const featureId = `${projectId}.feature`; 
    const folderId = `${projectId}_updatesite`;
    
    const provisionProfileFile = `${folderId}.ini`;
    const siteFile = `${folderId}/site.xml`;
    const featuresFolder = `${folderId}/features`;
    const featureContainer = `${featuresFolder}/${featureId}_${version}`;
    const featureFile = `${featureContainer}/feature.xml`;
    const pluginsFolder = `${folderId}/plugins`;

    const provisionProfile = `#Copy this file into conf/${appType}/provision_profiles folder\n`
                           + `url=file:${appType}/sites/${folderId}\n`
                           + `featureid=${featureId}`;
    const site = `<?xml version="1.0" encoding="UTF-8"?>\n`
               + `<site>\n`
               + `  <feature id="${featureId}" url="features/${featureId}_${version}.jar" version="${version}" />\n`
               + `</site>`;
    const feature = `<?xml version="1.0" encoding="UTF-8"?>\n`
                  + `<feature id="${featureId}" label="Feature" provider-name="${author}" version="${version}">\n`
                  + `  <description>${description}</description>\n`
                  + `  <copyright>${copyright}</copyright>\n`
                  + `  <license>${license}</license>\n`
                       /*<requires>
                          <import match="greaterOrEqual" plugin="net.jazz.ajax" version="2.3.2" />
                          <import match="greaterOrEqual" plugin="com.ibm.team.workitem.web" version="3.1.1100" />
                       </requires>*/
                  + `  <plugin download-size="0" id="${projectId}" install-size="0" version="${version}" />\n`
                  + `</feature>`;

	compiler.plugin('emit', (compilation, callback) => {

        const base = compilation.options.output.path;
        console.log('base: ', base);
        //const temp = path.relative(base, 'tmp');
        const path = `./tmp/${provisionProfileFile}`;
        console.log('path: ', path);
        var featureData = [{source: new Buffer(feature), name: "feature.xml"}];
        var artifactData = [
            {source: new Buffer(provisionProfile), name: "profProf.ini"},
            {source: new Buffer(site), name: "site.xml"}
        ];
        //var pluginData = [{source: new Buffer(plugin), name: "feature.xml"}];

        this.createZipFromBuffer(featureData).then((rawFeature) => {
            artifactData.push({source: rawFeature, name: "feature.jar"});
            return this.createZipFromPattern();
        }).then((rawPlugin) => {
            artifactData.push({source: rawPlugin, name: "plugins.jar"});
            return this.createZipFromBuffer(artifactData);
        }).then((rawArtifacts) => {
            compilation.assets[`./tmp/all-the-artifacts.zip`] = new RawSource(rawArtifacts);
            callback();
        });
        // // create provision profile
        // compilation.assets[`./tmp/${provisionProfileFile}`] = this.createAsset(provisionProfile);
        // // create site xml
        // compilation.assets[`./tmp/${siteFile}`] = this.createAsset(site);
        // // create feature xml
        // compilation.assets[`./tmp/${featureFile}`] = this.createAsset(feature);

        // var f_output = fs.createWriteStream(`./tmp/feature.zip`);
        // var f_archive = archiver('zip');
        // f_archive.pipe(f_output);
        // f_archive.append(new Buffer(feature), { name: `${featureFile}` });
        // f_archive.finalize();
        // f_output.on('close', function() {
        //     console.log("feature.zip closed");
        // });

        // var p_output = fs.createWriteStream(`./tmp/plugin.zip`);
        // var p_archive = archiver('zip');
        // p_archive.pipe(p_output);
        // p_archive.directory("META-INF/");
        // p_archive.directory("resources/");
        // p_archive.file("plugin.xml");
        // p_archive.finalize();
        // p_output.on('close', function() {
        //     console.log("plugin.zip closed");
        // });

        // var output = fs.createWriteStream(`./tmp/my.zip`);
        // var archive = archiver('zip');
        // archive.pipe(output);
        // archive.file(`./tmp/plugin.zip`);
        // archive.file(`./tmp/feature.zip`);
        // archive.append(new Buffer(provisionProfile), { name: `${provisionProfileFile}` });
        // archive.append(new Buffer(site), { name: `${siteFile}` });
        // archive.finalize();
        // output.on('data',function(databuf) {
        //     console.log("data!!!", typeof databuf);
        // });
        // output.on('close', function() {
        //     console.log("my.zip closed");
        // });

        //compilation.assets[`./tmp/my.zip`] = this.createAsset(output);

        // var buf = new Buffer(compilation.assets[`./tmp/${featureFile}`].source());
        // zipper.sync.zip(buf).save(`./tmp/${featureContainer}.jar`);
        //callback();
        // // create feature jar
        // this.createZip(`./tmp/${featureContainer}.jar`, `${featureContainer}/**/*`, function() {
        //     console.log("zip ended");
        //     // 
        //     callback();
        // });
        // compilation.assets[`./tmp/feature.xml`] = this.createAsset(feature);
        // this.createZipFile(`./tmp/feature.jar`, './tmp/feature.xml', function() {
        //     console.log("done");
        // });
	});
};

JazzUpdateSitePlugin.prototype.createZipFromPattern = function() {
    var files = glob.sync([
        'resources/**',
        'META-INF/**',
        'plugin.xml'
    ], {mark: true});
    console.log(files);
    const pluginFiles = files.filter(function(f) { return !/\/$/.test(f); })
        .map((file) => { return {source: fs.readFileSync(file), name: file};});
    console.log("read successful");
    return this.createZipFromBuffer(pluginFiles);
};

JazzUpdateSitePlugin.prototype.createZipFromBuffer = function(elements) {
    return new Promise((resolve, reject) => {
        var zip = new yazl.ZipFile();
        elements.forEach((element) => {
            console.log("read: ", element.name);
            zip.addBuffer(new Buffer(element.source), element.name);
        });
        zip.end();
        var bufs = [];
        zip.outputStream.on('data', function(buf) {
            bufs.push(buf);
        });
        zip.outputStream.on('end', function() {
            console.log("end this...");
            resolve(Buffer.concat(bufs));
        });
    });
};
// JazzUpdateSitePlugin.prototype.createZipFile = function(zipFile, file, callback) {
//     var output = fs.createWriteStream(zipFile);
// 	var zipArchive = archiver('zip');
// 	output.on('close', function() {
// 		callback();
// 	});
// 	zipArchive.pipe(output);
//     zipArchive.file(file);
// 	zipArchive.finalize(function(err, bytes) {
// 		if(err) {
// 			callback(err);
// 		}
// 	});    
// };

// JazzUpdateSitePlugin.prototype.createZip = function(zipFile, filePattern, callback) {
//     // var archive = archiver('zip');
//     // //archive.pipe(destination);
//     // archive.glob(filePattern);
//     // archive.on('data', function(buf) {
// 	// 	return buf;
// 	// });
//     // archive.finalize();
//     var output = fs.createWriteStream(zipFile);
// 	var zipArchive = archiver('zip');

// 	output.on('close', function() {
// 		callback();
// 	});

// 	zipArchive.pipe(output);

// 	// zipArchive.bulk([
// 	// 	{ cwd: srcFolder, src: ['**/*'], expand: true }
// 	// ]);
//     zipArchive.glob(filePattern, );

// 	zipArchive.finalize(function(err, bytes) {
// 		if(err) {
// 			callback(err);
// 		}
// 	});
// };

JazzUpdateSitePlugin.prototype.createAsset = function(sourceString) {
    return {
        source: function() {
            return sourceString;
        },
        size: function() {
            return sourceString.length;
        }
    };
};

module.exports = JazzUpdateSitePlugin;