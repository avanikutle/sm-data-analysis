import { useState, useCallback } from 'react';

export interface FyersCredentials {
  appId: string;
  accessToken: string;
}

export interface DhanCredentials {
  clientId: string;
  accessToken: string;
}

export function useFyersCredentials() {
  const [creds, setCreds] = useState<FyersCredentials>(() => ({
    appId: localStorage.getItem('fyers_app_id') || '',
    accessToken: localStorage.getItem('fyers_access_token') || '',
  }));

  const save = useCallback((c: FyersCredentials) => {
    localStorage.setItem('fyers_app_id', c.appId);
    localStorage.setItem('fyers_access_token', c.accessToken);
    localStorage.setItem('fyers_auth', `${c.appId}:${c.accessToken}`);
    setCreds(c);
  }, []);

  const clear = useCallback(() => {
    localStorage.removeItem('fyers_app_id');
    localStorage.removeItem('fyers_access_token');
    localStorage.removeItem('fyers_auth');
    setCreds({ appId: '', accessToken: '' });
  }, []);

  const isConfigured = Boolean(creds.appId && creds.accessToken);
  return { creds, save, clear, isConfigured };
}

export function useDhanCredentials() {
  const [creds, setCreds] = useState<DhanCredentials>(() => ({
    clientId: localStorage.getItem('dhan_client') || '',
    accessToken: localStorage.getItem('dhan_token') || '',
  }));

  const save = useCallback((c: DhanCredentials) => {
    localStorage.setItem('dhan_client', c.clientId);
    localStorage.setItem('dhan_token', c.accessToken);
    setCreds(c);
  }, []);

  const clear = useCallback(() => {
    localStorage.removeItem('dhan_client');
    localStorage.removeItem('dhan_token');
    setCreds({ clientId: '', accessToken: '' });
  }, []);

  const isConfigured = Boolean(creds.clientId && creds.accessToken);
  return { creds, save, clear, isConfigured };
}
