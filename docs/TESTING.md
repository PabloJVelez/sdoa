# Testing Guide

This document provides information about running and writing tests for the SDOA application.

## Test Structure

The project uses Jest for testing with the following test types:

1. **Unit Tests**: Test individual functions and services in isolation
2. **Integration Tests (HTTP)**: Test API endpoints end-to-end
3. **Integration Tests (Modules)**: Test module interactions

## Running Tests

### All Tests

```bash
# From the medusa app directory
cd apps/medusa
npm test
```

### Specific Test Types

```bash
# HTTP Integration Tests
npm run test:integration:http

# Module Integration Tests
npm run test:integration:modules

# Unit Tests
npm run test:unit
```

### Specific Test Files

```bash
# Run a specific test file
npm test -- experience-types.spec.ts

# Run tests matching a pattern
npm test -- --testNamePattern="pickup"
```

### With Coverage

```bash
npm test -- --coverage
```

## Test Files

### Integration Tests (HTTP)

Located in `apps/medusa/integration-tests/http/`:

- **`health.spec.ts`**: Basic health check tests
- **`experience-types.spec.ts`**: Experience Types API tests
  - Store API endpoints
  - Admin API CRUD operations
  - Validation tests
- **`chef-events-flow.spec.ts`**: Chef Events flow tests
  - Pickup flow with product selection
  - Event flow (plated dinner, buffet style)
  - Experience type integration
  - Validation and error handling

### Unit Tests

Located in `apps/medusa/src/modules/*/__tests__/`:

- **`experience-type/__tests__/service.unit.spec.ts`**: Experience Type service unit tests
  - `listActiveExperienceTypes()` method
  - `getBySlug()` method
  - CRUD operations

## Writing Tests

### Integration Test Example

```typescript
import { medusaIntegrationTestRunner } from '@medusajs/test-utils';

jest.setTimeout(60 * 1000);

medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ api, getContainer }) => {
    describe('Your Feature', () => {
      it('should do something', async () => {
        const response = await api.get('/your-endpoint');
        expect(response.status).toEqual(200);
        expect(response.data).toHaveProperty('expectedField');
      });
    });
  },
});
```

### Unit Test Example

```typescript
import { createMedusaContainer } from '@medusajs/framework/utils';
import YourService from '../service';

describe('YourService', () => {
  let container: any;
  let service: YourService;

  beforeEach(() => {
    container = createMedusaContainer();
    container.register('yourService', YourService);
    service = container.resolve('yourService');
  });

  it('should do something', async () => {
    const result = await service.someMethod();
    expect(result).toBeDefined();
  });
});
```

## Test Best Practices

### 1. Cleanup

Always clean up test data:

```typescript
afterAll(async () => {
  if (createdId) {
    await service.delete(createdId);
  }
});
```

### 2. Isolation

Each test should be independent:

```typescript
// ❌ Bad - depends on previous test
it('should update', async () => {
  const item = await getItemFromPreviousTest();
  // ...
});

// ✅ Good - creates its own data
it('should update', async () => {
  const item = await service.create({ name: 'Test' });
  const updated = await service.update(item.id, { name: 'Updated' });
  // ...
  await service.delete(item.id);
});
```

### 3. Assertions

Test both success and error cases:

```typescript
it('should return 200 for valid request', async () => {
  const response = await api.post('/endpoint', validData);
  expect(response.status).toEqual(200);
});

it('should return 400 for invalid request', async () => {
  const response = await api.post('/endpoint', invalidData);
  expect(response.status).toEqual(400);
  expect(response.data).toHaveProperty('errors');
});
```

### 4. Timeouts

Set appropriate timeouts:

```typescript
jest.setTimeout(60 * 1000); // 60 seconds for integration tests
```

### 5. Error Handling

Test error scenarios:

```typescript
it('should handle missing required field', async () => {
  const response = await api.post('/endpoint', { /* missing field */ });
  expect(response.status).toEqual(400);
});
```

## Test Coverage Goals

- **Unit Tests**: Aim for >80% coverage of business logic
- **Integration Tests**: Cover all API endpoints and critical user flows
- **E2E Tests**: Cover complete user journeys (pickup flow, event flow)

## Continuous Integration

Tests should run automatically on:
- Pull requests
- Commits to main branch
- Before deployment

## Debugging Tests

### Run with Verbose Output

```bash
npm test -- --verbose
```

### Run Single Test

```bash
npm test -- --testNamePattern="should create experience type"
```

### Debug in VS Code

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "--no-cache"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

## Common Issues

### Tests Hanging

- Check for unclosed database connections
- Ensure cleanup is happening in `afterAll`/`afterEach`
- Increase timeout if needed

### Database Conflicts

- Each test should use unique data
- Use UUIDs or timestamps for unique identifiers
- Clean up test data after each test

### Module Resolution Errors

- Ensure all dependencies are installed
- Check `tsconfig.json` paths
- Verify module exports

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Medusa Test Utils](https://docs.medusajs.com/resources/development-resources/testing)
- [Integration Test Examples](./integration-tests/http/README.md)

