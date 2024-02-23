const Path                  = require('path');
const HtmlWebpackPlugin     = require('html-webpack-plugin');
const CopyWebpackPlugin     = require('copy-webpack-plugin');
const MiniCssExtractPlugin  = require('mini-css-extract-plugin');

function src ()  { return Path.resolve(__dirname, 'src', ...arguments);  }
function dist () { return Path.resolve(__dirname, 'dist', ...arguments); }

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
			{ test: /\.(png|tiff|jpe?g|svg|gif|webp|ico)$/i,
				type: 'asset/resource',
				generator: {
					filename: 'static/img/[name]-[hash:8][ext]'
				}
			},

			{ test: /^background(-.+)?\.(png|tiff|jpe?g|webp)$/i,
				loader: "responsive-loader",
				options: {
					publicPath: "static/bg/[name]-[hash:8][ext]",
					min: 300,
					max: 2000,
					steps: 10
				}
			},

			{ test: /\.css$/i, use: [ MiniCssExtractPlugin.loader, 'css-loader' ] },

			{ test: /\.(html|njk)$/i, use: [ 
				{
					loader: 'simple-nunjucks-loader',
					options: {
						searchPaths: src(),
						assetsPaths: [
							'static'
						],
						dev: process.env.NODE_ENV === "development"
					}
				}
			]}
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
