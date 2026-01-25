import { medusaIntegrationTestRunner } from '@medusajs/test-utils';
jest.setTimeout(60 * 1000);

medusaIntegrationTestRunner({
  inApp: true,
  env: {
    // The test runner uses DB_USERNAME, DB_PASSWORD, and DB_HOST (set in jest.setup-env.ts)
    // DATABASE_URL is set for other parts of the system that need it
    DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres',
  },
  testSuite: ({ api }) => {
    describe('Ping', () => {
      it('ping the server health endpoint', async () => {
        const response = await api.get('/health');
        expect(response.status).toEqual(200);
      });
    });
  },
});
