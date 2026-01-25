import { Client } from "pg"

function buildDbUrlWithDb(url: string, dbName: string) {
  const u = new URL(url)
  u.pathname = `/${dbName}`
  return u.toString()
}

module.exports = async function globalTeardown() {
  const baseUrl = process.env.MEDUSA_DATABASE_URL || process.env.DATABASE_URL
  const dbName = (global as any).__TEST_DB_NAME__ as string | undefined
  if (!baseUrl || !dbName) {
    return
  }

  const adminUrl = buildDbUrlWithDb(baseUrl, "postgres")
  const client = new Client({ connectionString: adminUrl })
  await client.connect()
  try {
    // Terminate all connections to the test database
    await client.query(
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1`,
      [dbName]
    )
    await client.query(`DROP DATABASE IF EXISTS ${JSON.stringify(dbName).replace(/\"/g, "")}`)
  } finally {
    await client.end()
  }
}

