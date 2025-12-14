const { loadEnv } = require('@medusajs/utils');
loadEnv('test', process.cwd());

module.exports = {
  transform: {
    '^.+\\.[jt]sx?$': [
      '@swc/jest',
      {
        jsc: {
          parser: { syntax: 'typescript', decorators: true, tsx: true },
          transform: {
            react: {
              runtime: 'automatic',
            },
          },
        },
      },
    ],
  },
  testEnvironment: 'node',
  moduleFileExtensions: ['js', 'ts', 'tsx', 'json'],
  modulePathIgnorePatterns: ['dist/'],
  setupFiles: ['<rootDir>/integration-tests/jest.setup-env.ts'],
  setupFilesAfterEnv: ['<rootDir>/integration-tests/jest.setup-mocks.ts'],
  // Note: resetModules must stay false - medusaIntegrationTestRunner needs module state
  // However, the Map prototype issue occurs because --experimental-vm-modules creates
  // separate module contexts. Each test suite should get its own isolated context.
  resetModules: false,
  clearMocks: true,
  restoreMocks: true,
  // Use maxWorkers=1 to ensure tests run sequentially (already using --runInBand)
  maxWorkers: 1,
  // #region agent log - Commented out globalSetup/Teardown to test hypothesis 2
  // globalSetup: '<rootDir>/integration-tests/jest.global-setup.ts',
  // globalTeardown: '<rootDir>/integration-tests/jest.global-teardown.ts',
  // #endregion
};

if (process.env.TEST_TYPE === 'integration:http') {
  module.exports.testMatch = ['**/integration-tests/http/*.spec.[jt]s'];
} else if (process.env.TEST_TYPE === 'integration:modules') {
  module.exports.testMatch = ['**/src/modules/*/__tests__/**/*.[jt]s'];
} else if (process.env.TEST_TYPE === 'unit') {
  module.exports.testMatch = ['**/src/**/__tests__/**/*.unit.spec.[jt]s'];
}
