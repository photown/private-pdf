const path = require('path');

module.exports = {
  entry: './build/Main.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'), // Specify the 'dist' directory
  },
};