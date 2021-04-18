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
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: 'ts-loader',
        options: {
          transpileOnly: !slsw.lib.webpack.isLocal,
        },
      },
    ],
  },
};

module.exports = config;
