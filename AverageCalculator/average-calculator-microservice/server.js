const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 9876;

// Configuration
const WINDOW_SIZE = 10;
const TIMEOUT_MS = 500;
const TEST_SERVER = 'http://20.244.56.144/evaluation-service';
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiZXhwIjoxNzQ0OTU3OTc0LCJpYXQiOjE3NDQ5NTc2NzQsImlzcyI6IkFmZm9yZG1lZCIsImp0aSI6ImM2ZTYyM2M5LWFjN2MtNGM1MC05MWE4LTQ4MWU1ZTliNDdmZCIsInN1YiI6InJvaGl0Lmd1cHRhX2NzMjJAZ2xhLmFjLmluIn0sImVtYWlsIjoicm9oaXQuZ3VwdGFfY3MyMkBnbGEuYWMuaW4iLCJuYW1lIjoicm9oaXQgZ3VwdGEiLCJyb2xsTm8iOiIyMjE1MDAxNDg3IiwiYWNjZXNzQ29kZSI6IkNObmVHVCIsImNsaWVudElEIjoiYzZlNjIzYzktYWM3Yy00YzUwLTkxYTgtNDgxZTVlOWI0N2ZkIiwiY2xpZW50U2VjcmV0IjoicUpxTmJkR2tVcURUZ1dnSiJ9.PPeGPnkdb7ge2-s7FexmSnOw1-L8n1F6PdCg6gSDc0k';

// Storage for different number types
const storage = {
  p: { numbers: [], windowPrevState: [], windowCurrState: [] },
  f: { numbers: [], windowPrevState: [], windowCurrState: [] },
  e: { numbers: [], windowPrevState: [], windowCurrState: [] },
  r: { numbers: [], windowPrevState: [], windowCurrState: [] }
};

// Helper to fetch numbers from the test server based on type
async function fetchNumbers(type) {
  let endpoint;
  switch (type) {
    case 'p': endpoint = '/primes'; break;
    case 'f': endpoint = '/fibo'; break;
    case 'e': endpoint = '/even'; break;
    case 'r': endpoint = '/rand'; break;
    default: throw new Error('Invalid number type');
  }

  let timeoutId;

  try {
    const controller = new AbortController();
    timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await axios.get(`${TEST_SERVER}${endpoint}`, {
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`
      }
    });

    clearTimeout(timeoutId);
    return response.data.numbers;
  } catch (error) {
    if (timeoutId) clearTimeout(timeoutId);
    return [];
  }
}

// Helper to store numbers uniquely and maintain window size
function storeNumbers(type, newNumbers) {
  const store = storage[type];
  store.windowPrevState = [...store.windowCurrState];

  for (const num of newNumbers) {
    if (!store.numbers.includes(num)) {
      store.numbers.push(num);
    }
  }

  if (store.numbers.length > WINDOW_SIZE) {
    store.numbers = store.numbers.slice(-WINDOW_SIZE);
  }

  store.windowCurrState = [...store.numbers];
  const avg = store.numbers.length > 0
    ? (store.numbers.reduce((sum, num) => sum + num, 0) / store.numbers.length).toFixed(2)
    : 0;

  return {
    windowPrevState: store.windowPrevState,
    windowCurrState: store.windowCurrState,
    numbers: store.numbers,
    avg: parseFloat(avg)
  };
}

// API Endpoint for numbers
app.get('/numbers/:numberid', async (req, res) => {
  const type = req.params.numberid;
  if (!['p', 'f', 'e', 'r'].includes(type)) {
    return res.status(400).json({ error: 'Invalid number type. Use p, f, e, or r.' });
  }

  try {
    const newNumbers = await fetchNumbers(type);
    const result = storeNumbers(type, newNumbers);
    res.json({
      windowPrevState: result.windowPrevState,
      windowCurrState: result.windowCurrState,
      numbers: result.numbers,
      avg: result.avg
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'Average Calculator Microservice is running',
    storage: {
      p: { count: storage.p.numbers.length },
      f: { count: storage.f.numbers.length },
      e: { count: storage.e.numbers.length },
      r: { count: storage.r.numbers.length }
    }
  });
});

// Start the server
app.listen(PORT);
