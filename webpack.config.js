const Path              = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const webpackMerge      = require('webpack-merge').merge;

const imposition_config = require('./node_modules/web-imposition/webpack.config');

function src ()          { return Path.resolve(__dirname, 'src', ...arguments);          }
function dist ()         { return Path.resolve(__dirname, 'dist', ...arguments);         }
function node_modules () { return Path.resolve(__dirname, 'node_modules', ...arguments); }


// Modify web-imposition webpack config to generate files at a different public
// URL path, and use its own webpack bundle. After modifying the imposition
// webpack configuration to output to a sub-path of the main site, merge it with
// the root webpack config.

imposition_config.entry = {
	imposition: {
		publicPath: "imposition",
		import:     "web-imposition/src/index",
		filename:   "[name].js"
	}
};

// Move the outputs of all HtmlWebpackPlugins and CopyPlugins to ./dist/imposition/

imposition_config.plugins.map( plugin => {
	switch (plugin.constructor.name) {
		case "HtmlWebpackPlugin":
			plugin.userOptions.filename = Path.join("imposition", plugin.userOptions.filename ?? "index.html");
			plugin.userOptions.chunks   = ["imposition"];
			plugin.userOptions.template = Path.join("node_modules", "web-imposition", plugin.userOptions.template);
			plugin.userOptions.publicPath = "imposition/";
			break;

		case "CopyPlugin":
			plugin.patterns.map( pattern => {
				pattern.from = Path.join("node_modules", "web-imposition", pattern.from ?? "");
				pattern.to   = Path.join("imposition", pattern.to ?? "");
			});
			break;

		default:
			// The plugin is unmodified
			break;
	}
});


// Merge the imposition page into the root site webpack config

module.exports = webpackMerge(imposition_config, {
	mode: "development",

	devServer: {
		contentBase: dist(),
		publicPath: "/"
	},

	entry: {
		main: src('index.js'),
	},

	output: {
		publicPath: "/",
		path: dist(),
		filename: '[name].js'
	},

	module: {
		rules: [
			{ test: /\.css$/, use: [ 'style-loader', 'css-loader' ] }
		]
	},

	plugins: [
		new HtmlWebpackPlugin({
			template: src("index.html"),
			chunks: ['main'],
			filename: 'index.html'
		}),

		new CopyWebpackPlugin({
			patterns: [{
				from: 'static',
				to: 'static'
			}]
		})
	]
});
