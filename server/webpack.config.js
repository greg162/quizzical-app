const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');


module.exports = {
  watch: true,
  entry: './front.js',
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'public'),
  },
  devtool: 'source-map',
  plugins: [
    new CopyPlugin([
        { from: 'node_modules/socket.io-client/dist/socket.io.js', to: 'js/socket.io.js' }
    ]),
  ],
  module: {
    rules: [
      {
        test: /\.s[ac]ss$/i,
        use: [
          // Creates `style` nodes from JS strings
          'style-loader',
          // Translates CSS into CommonJS
          'css-loader',
          // Compiles Sass to CSS
          'sass-loader',
        ],
      },
    ],
  },
};
