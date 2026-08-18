module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // Inject required env vars BEFORE any module (including env.ts) is loaded
  setupFiles: ['<rootDir>/src/__tests__/jest.setup.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: false,
        tsconfig: {
          module: 'commonjs',
          moduleResolution: 'node',
          esModuleInterop: true,
        },
      },
    ],
  },
  testMatch: ['**/__tests__/**/*.test.ts'],
  forceExit: true,
  clearMocks: true,
};
