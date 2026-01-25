#!/usr/bin/env node
/**
 * Integration test runner that runs each test file in an isolated process.
 * 
 * This prevents Map.prototype.set errors when using --experimental-vm-modules with Jest.
 * The issue: Jest's --experimental-vm-modules creates separate module contexts for each
 * test file, and Medusa's module loader caches Maps internally. When Maps from one
 * context are reused in another, they become incompatible.
 * 
 * Solution: Run each test file in a separate Node.js process to ensure complete isolation.
 * 
 * Usage: node integration-tests/run-tests-isolated.js
 *        or: yarn test:integration:http
 */

const { execSync } = require('child_process');
const { readdirSync } = require('fs');
const { join } = require('path');

const testDir = join(__dirname, 'http');
const testFiles = readdirSync(testDir)
  .filter(file => file.endsWith('.spec.ts') || file.endsWith('.spec.js'))
  .map(file => join(testDir, file));

console.log(`Running ${testFiles.length} test files in isolated processes...\n`);

let passed = 0;
let failed = 0;
const failedFiles = [];

for (const testFile of testFiles) {
  console.log(`\n[${passed + failed + 1}/${testFiles.length}] Running ${testFile}...`);
  try {
    execSync(
      `TEST_TYPE=integration:http NODE_OPTIONS=--experimental-vm-modules jest --silent=false --runInBand --forceExit "${testFile}"`,
      { stdio: 'inherit', cwd: join(__dirname, '..') }
    );
    passed++;
    console.log(`✓ ${testFile} passed`);
  } catch (error) {
    failed++;
    failedFiles.push(testFile);
    console.error(`✗ ${testFile} failed`);
  }
}

console.log(`\n\nSummary: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.log('Failed files:');
  failedFiles.forEach(file => console.log(`  - ${file}`));
  process.exit(1);
}

