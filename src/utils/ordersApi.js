// src/utils/ordersApi.js
//
// Talks to the backend's self-service order history route (GET
// /users/orders) — self-verifying bearer token via the orders Lambda's
// identity.py (same mechanism as cartApi.js), not the admin authorizer
// that gates GET /orders. Only ever returns the signed-in shopper's own
// orders. No guest fallback: order history only makes sense once signed in.
import { fetchAuthSession } from 'aws-amplify/auth';
import { API_BASE_URL } from '../config';

async function authedRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request to ${path} failed (${response.status})`);
  }
  return data;
}

async function authHeaders() {
  const { tokens } = await fetchAuthSession();
  const idToken = tokens?.idToken?.toString();
  if (!idToken) {
    throw new Error('You must be signed in to do that.');
  }
  return { Authorization: `Bearer ${idToken}` };
}

export const ordersApi = {
  getMyOrders: async () => {
    const headers = await authHeaders();
    const data = await authedRequest('/users/orders', { headers });
    return data.orders;
  },
};
