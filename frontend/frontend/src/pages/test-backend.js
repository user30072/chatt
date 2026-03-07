import { useEffect, useState } from 'react';

export default function TestBackend() {
  const [healthResult, setHealthResult] = useState({ loading: true, data: null, error: null });
  const [chatbotsResult, setChatbotsResult] = useState({ loading: true, data: null, error: null });
  
  const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
  
  useEffect(() => {
    // Test health endpoint
    fetch(`${BACKEND_URL}/health`)
      .then(res => res.json())
      .then(data => setHealthResult({ loading: false, data, error: null }))
      .catch(error => setHealthResult({ loading: false, data: null, error: error.message }));
    
    // Test chatbots endpoint
    fetch(`${BACKEND_URL}/chatbots`)
      .then(res => res.json())
      .then(data => setChatbotsResult({ loading: false, data, error: null }))
      .catch(error => setChatbotsResult({ loading: false, data: null, error: error.message }));
  }, [BACKEND_URL]);
  
  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Backend Connection Test</h1>
      <p>Testing connection to: <code>{BACKEND_URL}</code></p>
      
      <div style={{ marginTop: '20px' }}>
        <h2>Health Endpoint Test</h2>
        {healthResult.loading ? (
          <p>Loading...</p>
        ) : healthResult.error ? (
          <div style={{ color: 'red' }}>
            <p>Error: {healthResult.error}</p>
          </div>
        ) : (
          <div>
            <p style={{ color: 'green' }}>✅ Connection successful!</p>
            <pre style={{ background: '#f4f4f4', padding: '10px', borderRadius: '4px' }}>
              {JSON.stringify(healthResult.data, null, 2)}
            </pre>
          </div>
        )}
      </div>
      
      <div style={{ marginTop: '20px' }}>
        <h2>Chatbots Endpoint Test</h2>
        {chatbotsResult.loading ? (
          <p>Loading...</p>
        ) : chatbotsResult.error ? (
          <div style={{ color: 'red' }}>
            <p>Error: {chatbotsResult.error}</p>
          </div>
        ) : (
          <div>
            <p style={{ color: 'green' }}>✅ Connection successful!</p>
            <pre style={{ background: '#f4f4f4', padding: '10px', borderRadius: '4px' }}>
              {JSON.stringify(chatbotsResult.data, null, 2)}
            </pre>
          </div>
        )}
      </div>
      
      <div style={{ marginTop: '20px' }}>
        <h2>Direct POST Request Test</h2>
        <button
          onClick={async () => {
            try {
              const response = await fetch(`${BACKEND_URL}/chatbots`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  name: 'Test Bot',
                  description: 'Created from test page',
                  model: 'gpt-3.5-turbo'
                })
              });
              
              const data = await response.json();
              alert(JSON.stringify(data, null, 2));
            } catch (error) {
              alert(`Error: ${error.message}`);
            }
          }}
          style={{
            padding: '10px 15px',
            background: '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Test Create Chatbot
        </button>
      </div>
    </div>
  );
} 