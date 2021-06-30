const base_config       = require('./webpack.config');
const webpackMerge      = require('webpack-merge').merge;
const { NetlifyPlugin } = require('netlify-webpack-plugin');

module.exports = webpackMerge(base_config, {
	mode: "production",

	plugins: [
		new NetlifyPlugin({
			redirects: [
				{
					from: "/imposition/*",
					to: "https://web-imposition.netlify.com/:splat",
					force: true,
					status: 200,
				}
			]
		})
	]
});
