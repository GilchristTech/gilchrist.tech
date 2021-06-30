const Path                 = require('path');
const HtmlWebpackPlugin    = require('html-webpack-plugin');
const CopyWebpackPlugin    = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

function src ()          { return Path.resolve(__dirname, 'src', ...arguments);          }
function dist ()         { return Path.resolve(__dirname, 'dist', ...arguments);         }

module.exports = {
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
			{ test: /\.css$/i, use: [ MiniCssExtractPlugin.loader, 'css-loader' ] }
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
		}),

		new MiniCssExtractPlugin()
	]
};
