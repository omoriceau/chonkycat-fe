// src/utils/cartApi.js
//
// Talks to the backend's /cart* endpoints (chonky-cat-be). Every request
// carries either a signed-in shopper's Cognito bearer token or a guest id
// (see guestId.js) — the backend resolves whichever is present into a
// user_id (see lambdas/orders/identity.py), so the same routes work for
// guest and logged-in carts alike.
import { fetchAuthSession } from 'aws-amplify/auth';
import { API_BASE_URL } from '../config';
import { getOrCreateGuestId } from './guestId';

async function identityHeaders() {
  try {
    const { tokens } = await fetchAuthSession();
    const idToken = tokens?.idToken?.toString();
    if (idToken) {
      return { Authorization: `Bearer ${idToken}` };
    }
  } catch {
    // Not signed in — fall through to the guest id.
  }
  return { 'X-Guest-Id': getOrCreateGuestId() };
}

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(await identityHeaders()),
    ...options.headers,
  };
  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request to ${path} failed (${response.status})`);
  }
  return data;
}

export const cartApi = {
  getCart: () => request('/cart').then((r) => r.cart),

  addItem: (productId, quantity) =>
    request('/cart/items', {
      method: 'POST',
      body: JSON.stringify({ product_id: productId, quantity }),
    }).then((r) => r.cart),

  updateItemQuantity: (productId, quantity) =>
    request(`/cart/items/${encodeURIComponent(productId)}`, {
      method: 'PUT',
      body: JSON.stringify({ quantity }),
    }).then((r) => r.cart),

  removeItem: (productId) =>
    request(`/cart/items/${encodeURIComponent(productId)}`, { method: 'DELETE' }).then((r) => r.cart),

  checkout: (orderId, payload) =>
    request(`/cart/${encodeURIComponent(orderId)}/checkout`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }).then((r) => r.order),

  // Behind the Cognito authorizer on the backend (see template.yaml) — only
  // callable once signed in, since it needs a real bearer token rather than
  // a guest id.
  claimGuestCart: async (guestId) => {
    const { tokens } = await fetchAuthSession();
    const idToken = tokens?.idToken?.toString();
    if (!idToken) {
      throw new Error('claimGuestCart requires a signed-in session');
    }
    const response = await fetch(`${API_BASE_URL}/cart/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ guest_id: guestId }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || `Failed to claim guest cart (${response.status})`);
    }
    return data.cart;
  },
};
