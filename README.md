[![npm-v-svg][npm-v-svg]][npm-url]
[![npm-dt-svg][npm-dt-svg]][npm-url]
[![issues-svg][issues-svg]][issues-url]

# Jazz compatible update-site packaging for Webpack
Webpack 2 plugin to package IBM Jazz Extension into a valid update-site format. This is a required step to package client-side extensions built with webpack.

## Installation
The plug-in is published on `npm`, so running the following installation command is sufficient to get started using this plug-in
`npm install --save-dev jazz-update-site-webpack-plugin`

## Usage
This plug-in requires a valid webpack configuration. In order to use the plugin, modify your webpack configuration based on this example. Please note that you have to place the plug-in after (almost) any other plug-in, as it packs the final plug-in code into a publishable package. 

```javascript
const packageJson = require('./package.json');
...
plugins: [
    ...
    // place other plug-ins here
    ...
    new JazzUpdateSitePlugin({
        // Jazz application type, e.g. ccm, rm, qm, ...
        appType: 'ccm',
        // identifier of the project, will be used for JAR and folder names
        projectId: 'com.example.my.project',
        // the path to subtract from 'acceptGlobPattern' while creating the ZIP file
        pluginBasePath: 'subFolder/',
        // the files to be copied to the plugin
        acceptGlobPattern: [
            'subFolder/resources/**',
            'subFolder/META-INF/**',
            'subFolder/plugin.xml',
            'subFolder/deployment-properties.ini',
        ],
        // project meta information, in this example directly read from package.json file
        projectInfo: {
            author: packageJson.author,
            copyright: packageJson.copyright,
            description: packageJson.description,
            license: packageJson.license,
            version: packageJson.version,
        },
    }),
],
...
```

## Projects using this plug-in
You are using this plug-in in your project? Add your project to this list, either via pull request or by dropping me a line.
- [Jazz Work Item Bulk Mover](https://github.com/jazz-community/rtc-workitem-bulk-mover-ui)

## Contributing
Please use the [Issue Tracker](https://github.com/innerjoin/jazz-update-site-webpack-plugin/issues) of this repository to report issues or suggest enhancements. 

Pull requests are very welcome.

## Licensing & Copyright
This project is published under the `MIT` license. See `LICENSE` for more information.

Copyright (c) Lukas Steiger. All rights reserved.


[npm-dt-svg]: https://img.shields.io/npm/dt/jazz-update-site-webpack-plugin.svg
[npm-v-svg]: https://img.shields.io/npm/v/jazz-update-site-webpack-plugin.svg
[npm-url]: https://www.npmjs.com/package/jazz-update-site-webpack-plugin
[issues-svg]: https://img.shields.io/github/issues/innerjoin/jazz-update-site-webpack-plugin.svg
[issues-url]: https://github.com/innerjoin/jazz-update-site-webpack-plugin/issues
