// Simple script to test backend connectivity
const fetch = require('node-fetch');

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

async function testBackendConnection() {
  console.log(`Testing connection to backend at: ${BACKEND_URL}`);
  
  try {
    // Test health endpoint
    console.log('\nTesting health endpoint...');
    const healthResponse = await fetch(`${BACKEND_URL}/health`);
    const healthData = await healthResponse.json();
    console.log(`Status: ${healthResponse.status}`);
    console.log('Response:', healthData);
    
    // Test chatbots endpoint
    console.log('\nTesting chatbots endpoint...');
    const chatbotsResponse = await fetch(`${BACKEND_URL}/chatbots`);
    const chatbotsData = await chatbotsResponse.json();
    console.log(`Status: ${chatbotsResponse.status}`);
    console.log('Response:', chatbotsData);
    
    console.log('\nAll tests completed.');
  } catch (error) {
    console.error('\nError connecting to backend:', error.message);
    if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN') {
      console.error('DNS resolution failed. The backend domain may not exist.');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('Connection refused. The backend server may not be running.');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('Connection timed out. There may be network issues or the server is not responding.');
    }
  }
}

testBackendConnection(); 