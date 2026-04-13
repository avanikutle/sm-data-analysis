const express = require('express');
const axios = require('axios');
const router = express.Router();

const DHAN_BASE = 'https://api.dhan.co/v2';

function dhanClient(token, clientId) {
  return axios.create({
    baseURL: DHAN_BASE,
    headers: {
      'access-token': token,
      'client-id': clientId,
      'Content-Type': 'application/json',
    },
  });
}

function getCredentials(req) {
  const token = req.headers['x-dhan-token'];
  const clientId = req.headers['x-dhan-client'];
  if (!token || !clientId) {
    throw new Error('Missing Dhan credentials. Set Client ID and Access Token via the Connectivity page.');
  }
  return { token, clientId };
}

async function proxyGet(req, res, path) {
  try {
    const { token, clientId } = getCredentials(req);
    const client = dhanClient(token, clientId);
    const response = await client.get(path, { params: req.query });
    res.json(response.data);
  } catch (err) {
    const status = err.response?.status || 500;
    const message = err.response?.data?.message || err.message;
    res.status(status).json({ error: true, message });
  }
}

// Connectivity test - use profile endpoint
router.get('/ping', async (req, res) => {
  try {
    const { token, clientId } = getCredentials(req);
    const client = dhanClient(token, clientId);
    const response = await client.get('/profile');
    res.json(response.data);
  } catch (err) {
    const status = err.response?.status || 500;
    const message = err.response?.data?.message || err.message;
    res.status(status).json({ error: true, message });
  }
});

// Portfolio
router.get('/positions', async (req, res) => {
  await proxyGet(req, res, '/positions');
});

router.get('/holdings', async (req, res) => {
  await proxyGet(req, res, '/holdings');
});

router.get('/funds', async (req, res) => {
  await proxyGet(req, res, '/fundlimit');
});

module.exports = router;
