const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
  entry: "./src/Main.ts",
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "dist"), // Specify the 'dist' directory
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: "node_modules/pdfjs-dist/build/pdf.worker.js", to: "." },
        { from: "node_modules/pdfjs-dist/cmaps/", to: "cmaps" },
        { from: "node_modules/pdfjs-dist/web/pdf_viewer.css", to: "." },
        { from: "node_modules/pdfjs-dist/web/images/", to: "images" },
      ],
    }),
  ],
};
