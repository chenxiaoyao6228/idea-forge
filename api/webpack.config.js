const path = require('path');
const webpack = require('webpack');
const nodeExternals = require('webpack-node-externals');
const { RunScriptWebpackPlugin } = require('run-script-webpack-plugin');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const { sentryWebpackPlugin } = require("@sentry/webpack-plugin");

const isDevelopment = process.env.NODE_ENV !== 'production';
const isDebug = process.env.DEBUG === 'true';

module.exports = {
  // watch: isDevelopment, 
  devtool: isDebug?  "source-map" : false,
  entry: isDevelopment 
    ? ['webpack/hot/poll?100', './src/main.ts']
    : ['./src/main.ts'],
  target: 'node',
  mode: isDevelopment ? 'development' : 'production',
  externals: [nodeExternals({
    allowlist: isDevelopment ? ['webpack/hot/poll?100'] : [],
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
    mainFields: ['main'],
    plugins: [new TsconfigPathsPlugin({ configFile: 'tsconfig.json' })],
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist/'),
  },
  node: {
    __dirname: false,
    __filename: false,
  },
  plugins: [
    isDevelopment && new webpack.HotModuleReplacementPlugin(),
    isDevelopment && new RunScriptWebpackPlugin({ 
      name: 'main.js',
      // FIXME: webpack hmr not working, no time to fix it, should change to false after fixing it
      // https://github.com/nestjs/nest-cli/issues/1614
      autoRestart: true,
      nodeArgs: isDebug ? ['--inspect=9333'] : [],
    }),
    // !isDevelopment && sentryWebpackPlugin({
    //   org: "yorkchan6228",
    //   project: "idea-forge-client",
    //   authToken: process.env.SENTRY_AUTH_TOKEN,
    //   silent: true,
    // }),
  ].filter(Boolean),
}; 