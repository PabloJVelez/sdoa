import dotenv from "dotenv"
import { execSync } from "node:child_process"
import path from "node:path"
import { Client } from "pg"

// Disable Medusa telemetry BEFORE anything else loads
process.env.MEDUSA_DISABLE_TELEMETRY = "true"

function buildDbUrlWithDb(url: string, dbName: string) {
  const u = new URL(url)
  u.pathname = `/${dbName}`
  return u.toString()
}

module.exports = async function globalSetup() {
  // Load .env files from package root
  const rootDir = path.resolve(__dirname, "..", "..")
  dotenv.config({ path: path.join(rootDir, ".env.development") })
  dotenv.config({ path: path.join(rootDir, ".env.local") })
  dotenv.config({ path: path.join(rootDir, ".env.test") })
  
  // Get base connection URL (should point to postgres database for admin operations)
  let baseUrl = process.env.MEDUSA_DATABASE_URL || process.env.DATABASE_URL
  if (!baseUrl) {
    // Default to local PostgreSQL
    baseUrl = "postgresql://postgres:postgres@localhost:5432/postgres"
  }

  // Ensure baseUrl points to 'postgres' database for admin operations
  const baseUrlParsed = new URL(baseUrl)
  if (baseUrlParsed.pathname !== "/postgres" && baseUrlParsed.pathname !== "/") {
    baseUrlParsed.pathname = "/postgres"
    baseUrl = baseUrlParsed.toString()
  }

  const testDbName = `test_sdoa_${Date.now()}_${Math.floor(Math.random() * 10000)}`

  // Connect to postgres database to create new test database
  // Use the baseUrl which should point to 'postgres' database
  const adminUrl = buildDbUrlWithDb(baseUrl, "postgres")
  const client = new Client({ connectionString: adminUrl })
  await client.connect()
  try {
    await client.query(`CREATE DATABASE ${JSON.stringify(testDbName).replace(/\"/g, "")}`)
  } finally {
    await client.end()
  }

  const testDbUrl = buildDbUrlWithDb(baseUrl, testDbName)
  process.env.MEDUSA_DATABASE_URL = testDbUrl
  process.env.DATABASE_URL = testDbUrl

  // Run migrations against the new DB
  const pkgDir = path.resolve(__dirname, "..")
  execSync("yarn migrate", {
    cwd: pkgDir,
    stdio: "inherit",
    env: {
      ...process.env,
      MEDUSA_DATABASE_URL: testDbUrl,
      DATABASE_URL: testDbUrl,
      MEDUSA_DISABLE_TELEMETRY: "true",
      NODE_ENV: "test",
    },
  })

  // Persist chosen DB name for teardown
  ;(global as any).__TEST_DB_NAME__ = testDbName
  ;(global as any).__TEST_DB_URL__ = testDbUrl
}

