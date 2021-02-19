import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  forceExit: true,
  preset: 'ts-jest',
  verbose: true,
  setupFilesAfterEnv: ['<rootDir>/start-offline.ts'],
};

export default config;
