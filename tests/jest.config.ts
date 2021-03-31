import type { Config } from '@jest/types';

const esModules = ['@actually-colab/editor-types', '@actually-colab/editor-client'].join(
  '|'
);

const config: Config.InitialOptions = {
  forceExit: true,
  preset: 'ts-jest',
  verbose: true,
  transformIgnorePatterns: [`/node_modules/(?!${esModules})`],
  testEnvironment: 'node',
  // setupFilesAfterEnv: ['<rootDir>/start-offline.ts'],
};

export default config;
