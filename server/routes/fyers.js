const express = require('express');
const axios = require('axios');
const router = express.Router();

const FYERS_BASE = 'https://api-t1.fyers.in/api/v3';

function fyersClient(authHeader) {
  return axios.create({
    baseURL: FYERS_BASE,
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
  });
}

function getAuth(req) {
  const auth = req.headers['x-fyers-auth'];
  if (!auth) throw new Error('Missing Fyers credentials. Set APP_ID:ACCESS_TOKEN via the Connectivity page.');
  return auth;
}

async function proxyGet(req, res, path, params = {}) {
  try {
    const client = fyersClient(getAuth(req));
    const response = await client.get(path, { params: { ...req.query, ...params } });
    res.json(response.data);
  } catch (err) {
    const status = err.response?.status || 500;
    const message = err.response?.data?.message || err.message;
    res.status(status).json({ error: true, message });
  }
}

// Connectivity test
router.get('/ping', async (req, res) => {
  await proxyGet(req, res, '/profile');
});

// Portfolio
router.get('/positions', async (req, res) => {
  await proxyGet(req, res, '/positions');
});

router.get('/holdings', async (req, res) => {
  await proxyGet(req, res, '/holdings');
});

router.get('/funds', async (req, res) => {
  await proxyGet(req, res, '/funds');
});

// Historical data
// Query params: symbol, resolution, date_format, range_from, range_to, cont_flag
router.get('/history', async (req, res) => {
  await proxyGet(req, res, '/data/history');
});

// Live quotes
// Query params: symbols (comma-separated, e.g. NSE:SBIN-EQ,NSE:RELIANCE-EQ)
router.get('/quotes', async (req, res) => {
  await proxyGet(req, res, '/quotes');
});

module.exports = router;
