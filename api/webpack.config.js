const { sentryWebpackPlugin } = require("@sentry/webpack-plugin");

module.exports = {
  // ... other options
  devtool: "source-map", // Source map generation must be turned on
  plugins: [
    // Put the Sentry Webpack plugin after all other plugins
    sentryWebpackPlugin({
      authToken: process.env.SENTRY_AUTH_TOKEN,
      org: "yorkchan6228", // TODO: maybe make this configurable later
      project: "idea-forge-api",
    }),
  ],
}