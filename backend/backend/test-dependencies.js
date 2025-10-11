// Test file to check dependencies
const axios = require('axios');
const { Configuration, OpenAIApi } = require('openai');
const Anthropic = require('@anthropic-ai/sdk');

console.log('Dependencies loaded successfully:');
console.log('- axios version:', axios.VERSION || 'unknown');
console.log('- openai package loaded:', !!Configuration);
console.log('- anthropic package loaded:', !!Anthropic);

console.log('All dependencies are working correctly!'); 