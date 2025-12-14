# Integration Tests

This directory contains HTTP integration tests for the Medusa backend API.

## Running Tests

### Run all HTTP integration tests
```bash
yarn tests
# or
yarn test:integration:http
```

### Run specific test file
```bash
yarn test:integration:http -- experience-types.spec.ts
```

### Run with coverage
```bash
yarn test:integration:http -- --coverage
```

## Test Setup

Tests use Jest setup files configured in `jest.config.js`:

- **`jest.setup-env.ts`**: Configures environment variables before tests run
  - Sets `MEDUSA_DISABLE_TELEMETRY=true`
  - Configures `DATABASE_URL` (defaults to `postgresql://postgres:postgres@localhost:5432/postgres`)
  - Sets logging levels and other test-specific env vars

- **`jest.setup-mocks.ts`**: Sets up mocks for external dependencies (currently placeholder for v2)

The `medusaIntegrationTestRunner` automatically:
- Creates temporary databases for each test suite
- Runs migrations
- Cleans up databases after tests complete

## Test Files

### `health.spec.ts`
Basic health check endpoint tests.

### `experience-types.spec.ts`
Tests for the experience types API endpoints:
- Store API (`/store/experience-types`)
  - GET list of active experience types
  - GET by slug
- Admin API (`/admin/experience-types`)
  - GET list (all types)
  - POST create
  - GET by id
  - PUT update
  - DELETE

### `chef-events-flow.spec.ts`
Tests for chef events creation flows:
- Pickup flow with product selection
- Event flow (plated dinner, buffet style) regression tests
- Experience type integration
- Validation tests

## Test Structure

All tests use `medusaIntegrationTestRunner` from `@medusajs/test-utils`, which:
- Sets up a test Medusa instance
- Provides an `api` helper for making HTTP requests
- Provides a `getContainer()` helper for accessing services
- Handles cleanup automatically

## Writing New Tests

1. Import `medusaIntegrationTestRunner` from `@medusajs/test-utils`
2. Set timeout: `jest.setTimeout(60 * 1000)`
3. Use the test runner with your test suite:

```typescript
medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ api, getContainer }) => {
    describe('Your Feature', () => {
      it('should do something', async () => {
        const response = await api.get('/your-endpoint');
        expect(response.status).toEqual(200);
      });
    });
  },
});
```

## Best Practices

1. **Cleanup**: Always clean up test data you create (use `afterAll` or `afterEach`)
2. **Isolation**: Each test should be independent and not rely on other tests
3. **Assertions**: Test both success and error cases
4. **Timeouts**: Set appropriate timeouts for long-running operations
5. **Error Handling**: Test validation errors and edge cases
