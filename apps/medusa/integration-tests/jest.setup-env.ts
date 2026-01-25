// Jest environment setup for integration tests
// This file is loaded before tests run to configure environment variables

// Disable Medusa telemetry BEFORE anything else loads
process.env.MEDUSA_DISABLE_TELEMETRY = 'true'

// Set NODE_ENV to test if not already set
process.env.NODE_ENV = process.env.NODE_ENV || 'test'

// Skip OTP verification in tests
process.env.SKIP_OTP = process.env.SKIP_OTP || 'true'

// Reduce Medusa logging noise during tests
process.env.MEDUSA_LOG_LEVEL = process.env.MEDUSA_LOG_LEVEL || 'error'

// Use real Medusa services in tests (fewer surprises)
process.env.MEDUSA_LOADER_IS_TEST = process.env.MEDUSA_LOADER_IS_TEST || 'false'

// Disable admin UI rebuild during tests
process.env.DONT_RUN_ADMIN = process.env.DONT_RUN_ADMIN || 'true'

// Ensure DATABASE_URL is set for test runner
// The medusaIntegrationTestRunner will create temporary databases,
// but needs a base connection string
// Try MEDUSA_DATABASE_URL first (as used in Medusa v1 projects), fallback to DATABASE_URL

const dbUrlEnvVar = process.env.MEDUSA_DATABASE_URL || process.env.DATABASE_URL;


// Function to ensure DATABASE_URL has a password and uses 'postgres' database
// The test runner needs to connect to 'postgres' database to create temporary databases
function ensureDatabaseUrlHasPassword(dbUrl: string | undefined): string {
  const defaultUrl = 'postgresql://postgres:postgres@localhost:5432/postgres';
  
  if (!dbUrl || dbUrl.trim() === '') {
    return defaultUrl;
  }
  
  
  try {
    // Use Node's URL class for proper parsing - handles all edge cases
    let url: URL;
    try {
      url = new URL(dbUrl);
    } catch {
      // If URL parsing fails, try adding postgresql:// prefix
      if (!dbUrl.startsWith('postgresql://') && !dbUrl.startsWith('postgres://')) {
        url = new URL(`postgresql://${dbUrl}`);
      } else {
        throw new Error('Invalid URL format');
      }
    }
    
    const username = url.username || 'postgres';
    let password = url.password || '';
    const host = url.hostname || 'localhost';
    const port = url.port || '5432';
    
    
    // If password is missing or empty, add default password
    if (!password || password.trim() === '') {
      password = 'postgres';
    }
    
    // Always use 'postgres' database for test runner (needed to create temporary databases)
    // Reconstruct URL using simple format (no encoding for simple passwords like 'postgres')
    // The test runner should handle this format correctly
    const fixedUrl = `postgresql://${username}:${password}@${host}:${port}/postgres`;
    
    
    return fixedUrl;
  } catch (e) {
    return defaultUrl;
  }
}

// Force DATABASE_URL to use the correct format for test runner
// The test runner needs 'postgres' database to create temporary databases
// and MUST have a password (even if empty, it must be explicitly set)
const finalDbUrl = ensureDatabaseUrlHasPassword(dbUrlEnvVar);

// Set both MEDUSA_DATABASE_URL and DATABASE_URL for compatibility
// (Medusa v1 projects use MEDUSA_DATABASE_URL, v2 uses DATABASE_URL)
process.env.MEDUSA_DATABASE_URL = finalDbUrl;
process.env.DATABASE_URL = finalDbUrl;

// Also ensure it's explicitly set as a string (in case of any type coercion issues)
if (typeof process.env.DATABASE_URL !== 'string') {
  process.env.DATABASE_URL = String(process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres');
  process.env.MEDUSA_DATABASE_URL = process.env.DATABASE_URL;
}

// CRITICAL: The test runner uses DB_USERNAME, DB_PASSWORD, and DB_HOST environment variables
// NOT DATABASE_URL! We must extract these from DATABASE_URL and set them explicitly.
// This is why the password was being lost - the test runner doesn't read DATABASE_URL!
try {
  const dbUrl = new URL(finalDbUrl);
  process.env.DB_USERNAME = dbUrl.username || 'postgres';
  process.env.DB_PASSWORD = dbUrl.password || 'postgres'; // Explicitly set password
  process.env.DB_HOST = dbUrl.hostname || 'localhost';
} catch (e) {
  // Fallback to defaults
  process.env.DB_USERNAME = process.env.DB_USERNAME || 'postgres';
  process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'postgres';
  process.env.DB_HOST = process.env.DB_HOST || 'localhost';
}


// Redis URL (optional for tests, but good to have)
if (!process.env.REDIS_URL) {
  process.env.REDIS_URL = 'redis://localhost:6379'
}

// JWT and Cookie secrets (required)
process.env.JWT_SECRET = process.env.JWT_SECRET || 'supersecret'
process.env.COOKIE_SECRET = process.env.COOKIE_SECRET || 'supersecret'

// CORS (optional for tests)
process.env.STORE_CORS = process.env.STORE_CORS || 'http://localhost:8000'
process.env.ADMIN_CORS = process.env.ADMIN_CORS || 'http://localhost:7000,http://localhost:7001'
process.env.AUTH_CORS = process.env.AUTH_CORS || 'http://localhost:7000,http://localhost:7001'

// Admin backend URL (optional for tests)
process.env.ADMIN_BACKEND_URL = process.env.ADMIN_BACKEND_URL || 'http://localhost:9000'

