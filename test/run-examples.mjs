/**
 * Example runner — tests that all examples execute without errors.
 */

import { execSync } from 'child_process';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';

const examplesDir = 'examples';
const examples = [];

// Recursively find all .mjs files
function findExamples(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      findExamples(full);
    } else if (full.endsWith('.mjs')) {
      examples.push(full);
    }
  }
}

findExamples(examplesDir);

console.log('═'.repeat(60));
console.log(`Running ${examples.length} examples...`);
console.log('═'.repeat(60));

let passed = 0;
let failed = 0;

for (const ex of examples) {
  try {
    console.log(`\n▶ ${ex}`);
    const output = execSync(`node ${ex}`, {
      timeout: 30000,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    // Show first few lines
    const lines = output.split('\n').slice(0, 8);
    for (const line of lines) {
      console.log(`  ${line}`);
    }
    if (output.split('\n').length > 8) console.log('  ...');
    passed++;
    console.log(`  ✅ PASSED`);
  } catch (e) {
    failed++;
    const stderr = e.stderr?.substring(0, 200) || e.message?.substring(0, 200);
    console.log(`  ❌ FAILED: ${stderr}`);
  }
}

console.log('\n' + '═'.repeat(60));
console.log(`Examples: ✅ ${passed} passed | ❌ ${failed} failed`);
console.log('═'.repeat(60));
