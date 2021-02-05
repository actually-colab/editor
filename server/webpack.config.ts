import type { Configuration } from 'webpack';

import path from 'path';
import nodeExternals from 'webpack-node-externals';
import slsw from 'serverless-webpack';

const config: Configuration = {
  mode: slsw.lib.webpack.isLocal ? 'development' : 'production',
  entry: slsw.lib.entries,
  devtool: 'source-map',
  output: {
    libraryTarget: 'commonjs',
    path: path.join(__dirname, '.webpack'),
    filename: '[name].js',
  },
  target: 'node',
  externals: [nodeExternals()],
  resolve: {
    extensions: ['.js', '.jsx', '.json', '.d.ts', '.ts', '.tsx'],
    alias: {
      src: path.resolve(__dirname, 'src/'),
      middleware: path.resolve(__dirname, 'src/middleware/'),
      models: path.resolve(__dirname, 'src/models/'),
      routes: path.resolve(__dirname, 'src/routes/'),
      'input-schemas': path.resolve(__dirname, 'src/input-schemas/'),
    },
  },
  module: {
    rules: [
      // all files with a `.ts` or `.tsx` extension will be handled by `ts-loader`
      { test: /\.tsx?$/, loader: 'ts-loader' },
    ],
  },
};

module.exports = config;
