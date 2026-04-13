import axios from 'axios';

function getCredHeaders(): Record<string, string> {
  const fyersAuth = localStorage.getItem('fyers_auth') || '';
  const dhanToken = localStorage.getItem('dhan_token') || '';
  const dhanClient = localStorage.getItem('dhan_client') || '';
  return {
    'x-fyers-auth': fyersAuth,
    'x-dhan-token': dhanToken,
    'x-dhan-client': dhanClient,
  };
}

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const headers = getCredHeaders();
  Object.entries(headers).forEach(([k, v]) => {
    if (v) config.headers.set(k, v);
  });
  return config;
});

// Fyers
export const fyers = {
  ping: () => api.get('/fyers/ping'),
  positions: () => api.get('/fyers/positions'),
  holdings: () => api.get('/fyers/holdings'),
  funds: () => api.get('/fyers/funds'),
  history: (params: {
    symbol: string;
    resolution: string;
    date_format: number;
    range_from: number;
    range_to: number;
    cont_flag?: number;
  }) => api.get('/fyers/history', { params }),
  quotes: (symbols: string) => api.get('/fyers/quotes', { params: { symbols } }),
};

// Storage (FastAPI /api/store/*)
export const store = {
  fetchAndSave: (params: {
    symbol: string;
    resolution: string;
    range_from: number;
    range_to: number;
  }) => api.post('/store/candles/fetch-and-save', null, { params }),
  getCandles: (symbol: string, resolution: string, range_from?: number, range_to?: number) =>
    api.get('/store/candles', { params: { symbol, resolution, range_from, range_to } }),
  available: () => api.get('/store/candles/available'),
};

// Dhan
export const dhan = {
  ping: () => api.get('/dhan/ping'),
  positions: () => api.get('/dhan/positions'),
  holdings: () => api.get('/dhan/holdings'),
  funds: () => api.get('/dhan/funds'),
};
