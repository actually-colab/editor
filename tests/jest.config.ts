import type { Config } from '@jest/types';

const esModules = ['@actually-colab/editor-types', '@actually-colab/editor-client'].join(
  '|'
);

const config: Config.InitialOptions = {
  preset: 'ts-jest',
  verbose: true,
  transformIgnorePatterns: [`/node_modules/(?!${esModules})`],
  testEnvironment: 'node',
  forceExit: true,
};

export default config;
