'use strict';

var glob = require('glob-all');
var fs = require('fs');
var RawSource = require('webpack-sources').RawSource;
var yazl = require('yazl');

// the project files to be included in the plugin.jar
const defaultAcceptGlobPattern = [
    'resources/**',
    'META-INF/**',
    'plugin.xml'
];

function JazzUpdateSitePlugin(options) {
    this.options = options || {};
    this.options.projectInfo = options.projectInfo || {};
}

/**
 * create a zip file of the following structure:
 * - <pluginID>.zip/
 * --- provision-profile.ini
 * --- updatesite/
 * ----- site.xml
 * ----- features/
 * ------- feature.jar/
 * --------- feature.xml
 * ----- plugins/
 * ------- plugins.jar/
 * --------- << content of your project filtered by glob pattern >>
 */
JazzUpdateSitePlugin.prototype.apply = function(compiler) {
    const options = this.options;
    
    // options to be configured by the caller
    const appType = this.options.appType || 'ccm';
    const projectId = this.options.projectId;
    const projectInfo = this.options.projectInfo;
    const acceptGlobPattern = this.options.acceptGlobPattern || defaultAcceptGlobPattern;
    const pluginBasePath = this.options.pluginBasePath || '';

    // shorthand variables for project info
    const author = projectInfo.author;
    const version = projectInfo.version;
    const description = projectInfo.description;
    const copyright = projectInfo.copyright;
    const license = projectInfo.license;

    // basic identifiers
    const resourceID = `${projectId}_${version}`;
    const featureId = `${projectId}.feature`; 
    const folderId = `${projectId}_updatesite`;
    
    // file paths for file generation
    const provisionProfileFile = `${folderId}.ini`;
    const siteFile = `${folderId}/site.xml`;
    const featureJar = `${folderId}/features/${featureId}_${version}.jar`;
    const nestedFeatureXml = 'feature.xml';
    const pluginsJar = `${folderId}/plugins/${resourceID}.jar`;
    const zipAsset = `./${resourceID}.zip`;

    // provision-profile.ini file content
    const provisionProfile = `#Copy this file into conf/${appType}/provision_profiles folder\n`
                           + `url=file:${appType}/sites/${folderId}\n`
                           + `featureid=${featureId}`;
    
    // site.xml content
    const site = `<?xml version="1.0" encoding="UTF-8"?>\n`
               + `<site>\n`
               + `  <feature id="${featureId}" url="features/${featureId}_${version}.jar" version="${version}" />\n`
               + `</site>`;
    
    // feature.xml content
    const feature = `<?xml version="1.0" encoding="UTF-8"?>\n`
                  + `<feature id="${featureId}" label="Feature" provider-name="${author}" version="${version}">\n`
                  + `  <description>${description}</description>\n`
                  + `  <copyright>${copyright}</copyright>\n`
                  + `  <license>${license}</license>\n`
                  + `  <plugin download-size="0" id="${projectId}" install-size="0" version="${version}" />\n`
                  + `</feature>`;

	compiler.plugin('after-emit', (compilation, callback) => {

        var featureData = [{source: new Buffer(feature), name: nestedFeatureXml}];
        var artifactData = [
            {source: new Buffer(provisionProfile), name: provisionProfileFile},
            {source: new Buffer(site), name: siteFile}
        ];

        this.createZipFromBuffer(featureData, pluginBasePath)
        .then((rawFeature) => {
            artifactData.push({source: rawFeature, name: featureJar});
            return this.createZipFromPattern(acceptGlobPattern, pluginBasePath);
        })
        .then((rawPlugin) => {
            artifactData.push({source: rawPlugin, name: pluginsJar});
            return this.createZipFromBuffer(artifactData, pluginBasePath);
        })
        .then((rawArtifacts) => {
            fs.writeFileSync(zipAsset, rawArtifacts);
            console.log("jazz-update-site-webpack-plugin execution finished");
            callback();
        });
    });
};

JazzUpdateSitePlugin.prototype.createZipFromPattern = function(globPattern, pluginBasePath) {
    // get all files matching the glob pattern, mark directories
    var files = glob.sync(globPattern, {mark: true});
   
    // remove all directories using filter() and create an array holding all read files
    const pluginFiles = files
                        .filter(function(f) { return !/\/$/.test(f); })
                        .map((file) => { return {source: fs.readFileSync(file), name: file};});
    
    // create a zip including all the above read files
    return this.createZipFromBuffer(pluginFiles, pluginBasePath);
};

JazzUpdateSitePlugin.prototype.createZipFromBuffer = function(elements, pluginBasePath) {
    return new Promise((resolve, reject) => {
        var bufs = [];

        // create a new zip file
        var zip = new yazl.ZipFile();
        
        // create a new virtual file for each entry
        elements.forEach((element) => {
            let name = element.name;
            if(name.indexOf(pluginBasePath) === 0) {
                name = name.replace(pluginBasePath, "");
            }
            zip.addBuffer(new Buffer(element.source), name);
        });
        
        // finish zip file creation
        zip.end();

        // as soon as new data is received, add it to the buffer
        zip.outputStream.on('data', function(buf) {
            bufs.push(buf);
        });

        // when all data is added, concat the buffer and resolve the asynchronous promise
        zip.outputStream.on('end', function() {
            resolve(Buffer.concat(bufs));
        });
    });
};

JazzUpdateSitePlugin.prototype.createAsset = function(sourceString) {
    // webpack requires this format for an asset
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