const path = require('path');
const webpack = require('webpack');
const nodeExternals = require('webpack-node-externals');
const { RunScriptWebpackPlugin } = require('run-script-webpack-plugin');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const { sentryWebpackPlugin } = require("@sentry/webpack-plugin");
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');

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
    allowlist: isDevelopment
      ? ['webpack/hot/poll?100', '@idea/editor', /^@idea\/editor\//]
      : ['@idea/editor', /^@idea\/editor\//],
    // Bundle @idea/editor since it's now ESM-only with ESM-only dependencies
  }),],
  // ignore tests hot reload
  watchOptions: {
    ignored: ['**/test/**', '**/*.spec.ts','**/*.test.ts',  '**/node_modules/**', '**/dist/**'],
    poll: 1000,
  },
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
      {
        test: /\.m?js$/,
        resolve: {
          fullySpecified: false,
        },
        type: 'javascript/auto',
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.mjs'],
    mainFields: ['module', 'main'],
    conditionNames: ['import', 'require', 'node', 'default'],
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
  cache: {
    type: 'filesystem',
    allowCollectingMemory: true,
    buildDependencies: {
      config: [__filename],
    },
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
    isDevelopment && new ForkTsCheckerWebpackPlugin({
      typescript: {
        configFile: path.resolve(__dirname, 'tsconfig.json'),
      },
    }),
    // !isDevelopment && sentryWebpackPlugin({
    //   org: "yorkchan6228",
    //   project: "idea-forge-client",
    //   authToken: process.env.SENTRY_AUTH_TOKEN,
    //   silent: true,
    // }),
  ].filter(Boolean),
}; 