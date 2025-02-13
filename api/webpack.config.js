const path = require('path');
const nodeExternals = require('webpack-node-externals');
const { RunScriptWebpackPlugin } = require('run-script-webpack-plugin');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const { sentryWebpackPlugin } = require("@sentry/webpack-plugin");

const isDevelopment = process.env.NODE_ENV !== 'production';

module.exports = {
  devtool: "source-map", 
  entry: ['./src/main.ts'],
  target: 'node',
  mode: isDevelopment ? 'development' : 'production',
  externals: [nodeExternals()],
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
  ...(isDevelopment && {
    watch: true,
    plugins: [
      new RunScriptWebpackPlugin({ 
        name: 'main.js',
        autoRestart: true
      }),
    ],
  }),
  plugins: [
    sentryWebpackPlugin({
      org: "yorkchan6228",
      project: "idea-forge-client",
      authToken: process.env.SENTRY_AUTH_TOKEN,
      silent: true,
    }),
  ],
}; 