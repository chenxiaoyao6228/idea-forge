const path = require('path');
const webpack = require('webpack');
const nodeExternals = require('webpack-node-externals');
const { RunScriptWebpackPlugin } = require('run-script-webpack-plugin');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const { sentryWebpackPlugin } = require("@sentry/webpack-plugin");

const isDevelopment = process.env.NODE_ENV !== 'production';

module.exports = {
  devtool: "source-map", 
  entry: ['webpack/hot/poll?100', './src/main.ts'],
  target: 'node',
  mode: isDevelopment ? 'development' : 'production',
  externals: [nodeExternals({
    allowlist: ['webpack/hot/poll?100'],
  }),],
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'swc-loader',
          options: {
            jsc: {
              parser: {
                syntax: 'typescript',
                decorators: true,
                dynamicImport: true,
              },
              target: 'es2021',
              transform: {
                legacyDecorator: true,
                decoratorMetadata: true,
              },
            },
          },
        },
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    plugins: [new TsconfigPathsPlugin()],
  },
  output: {
    path: path.join(__dirname, 'dist'),
    filename: 'main.js',
  },
  watch: true,
  plugins: [
    isDevelopment && new webpack.HotModuleReplacementPlugin(),
    isDevelopment && new RunScriptWebpackPlugin({ 
      name: 'main.js',
      autoRestart: false,
      nodeArgs: ['--inspect=9333'],
    }),
    sentryWebpackPlugin({
      org: "yorkchan6228",
      project: "idea-forge-client",
      authToken: process.env.SENTRY_AUTH_TOKEN,
      silent: true,
    }),
  ].filter(Boolean),
}; 