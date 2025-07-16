#!/usr/bin/env node

import { spawn } from 'child_process';
import { promises as fs } from 'fs';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const testEndpoint = async (url, expectedStatus = 200) => {
  try {
    const response = await fetch(url);
    return {
      url,
      status: response.status,
      success: response.status === expectedStatus,
      data: await response.text()
    };
  } catch (error) {
    return {
      url,
      status: 'ERROR',
      success: false,
      error: error.message
    };
  }
};

const runTests = async () => {
  console.log('🚀 Starting NodeJS PDF Service Tests...\n');

  // Test 1: Check if packages are installed correctly
  console.log('📦 Testing npm dependencies...');
  try {
    await fs.access('node_modules');
    console.log('✅ node_modules exists');
  } catch {
    console.log('❌ node_modules missing - run npm install');
    return;
  }

  // Test 2: Try to start the application
  console.log('\n🔄 Starting application...');
  const appProcess = spawn('node', ['src/app.js'], {
    detached: false,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let startupError = '';
  appProcess.stderr.on('data', (data) => {
    startupError += data.toString();
  });

  let startupOutput = '';
  appProcess.stdout.on('data', (data) => {
    startupOutput += data.toString();
  });

  // Wait for startup
  await delay(5000);

  if (appProcess.exitCode !== null) {
    console.log('❌ Application failed to start');
    console.log('STDERR:', startupError);
    console.log('STDOUT:', startupOutput);
    return;
  }

  console.log('✅ Application started successfully');
  console.log('Startup output:', startupOutput);

  // Test 3: Test endpoints
  console.log('\n🧪 Testing endpoints...');

  const tests = [
    { url: 'http://localhost:3001/', name: 'Root endpoint' },
    { url: 'http://localhost:3001/api/health', name: 'Health check' },
    { url: 'http://localhost:3001/swagger', name: 'Swagger UI' },
    { url: 'http://localhost:3001/api/metrics', name: 'Metrics endpoint' }
  ];

  const results = [];
  for (const test of tests) {
    console.log(`Testing ${test.name}...`);
    const result = await testEndpoint(test.url);
    results.push({ ...test, ...result });

    if (result.success) {
      console.log(`✅ ${test.name} - OK (${result.status})`);
    } else {
      console.log(`❌ ${test.name} - FAILED (${result.status || result.error})`);
    }
  }

  // Test 4: Test PDF operations
  console.log('\n📄 Testing PDF operations...');

  try {
    // Simple JSON test to security endpoint
    const securityTest = await fetch('http://localhost:3001/api/security/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: true })
    });

    console.log(`Security endpoint test: ${securityTest.status}`);
  } catch (error) {
    console.log(`Security endpoint test failed: ${error.message}`);
  }

  // Cleanup
  console.log('\n🧹 Cleaning up...');
  appProcess.kill('SIGTERM');
  await delay(2000);
  if (!appProcess.killed) {
    appProcess.kill('SIGKILL');
  }

  // Summary
  console.log('\n📊 Test Summary:');
  const passed = results.filter(r => r.success).length;
  const total = results.length;
  console.log(`Passed: ${passed}/${total}`);

  if (passed === total) {
    console.log('🎉 All tests passed! Application is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Check the output above.');
  }

  return { passed, total, results };
};

// Add global fetch polyfill for older Node versions
if (!global.fetch) {
  import('node-fetch').then(({ default: fetch }) => {
    global.fetch = fetch;
    runTests().catch(console.error);
  });
} else {
  runTests().catch(console.error);
}
