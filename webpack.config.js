const path = require('path');

module.exports = {
  entry: './src/Main.ts',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'), // Specify the 'dist' directory
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
};