// Jest mocks setup for integration tests
// Lightweight mocks to speed up Medusa boot in tests

import { jest } from '@jest/globals'

// Optionally skip file-based route scanning to avoid expensive glob + dynamic imports
// This can speed up test startup time
if (process.env.JEST_SKIP_ROUTE_LOADING !== 'false') {
  // Note: Medusa v2 may not have the same route loading mechanism as v1
  // This is kept for reference but may need adjustment for v2
  // Uncomment and adapt if needed:
  /*
  jest.mock('@medusajs/framework/dist/loaders/helpers/routing', () => {
    class RoutesLoaderMock {
      async load() {
        // no-op: do not scan or register routes
      }
    }
    return { RoutesLoader: RoutesLoaderMock }
  })
  */
}

// Note: Map prototype issues with --experimental-vm-modules are a known limitation
// when running multiple test files together in the same Jest process. The module loader's
// internal Maps become incompatible across different module contexts created by Jest.
// 
// Solution: The default test:integration:http command now uses run-tests-isolated.js,
// which runs each test file in a separate process to ensure complete isolation.
// 
// Alternative commands:
// - Run single test file: `yarn test:integration:http -- health.spec.ts`
// - Run all tests together (may have Map errors): `yarn test:integration:http:all`

// Add other mocks here as needed
// For example, external API calls, file system operations, etc.

