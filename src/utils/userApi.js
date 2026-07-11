// src/utils/userApi.js
//
// Talks to the backend's self-service profile routes (GET/PUT
// /users/{userId}) — behind a Cognito authorizer on the backend
// (template.yaml), which also checks the caller's own sub matches the id
// in the path, so this can only ever read/write the signed-in shopper's
// own row. Unlike cartApi.js there's no guest fallback: profile editing
// only makes sense once signed in.
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

async function ownProfilePath() {
  const { tokens, userSub } = await fetchAuthSession();
  const idToken = tokens?.idToken?.toString();
  if (!idToken || !userSub) {
    throw new Error('You must be signed in to do that.');
  }
  return { path: `/users/${userSub}`, headers: { Authorization: `Bearer ${idToken}` } };
}

export const userApi = {
  getProfile: async () => {
    const { path, headers } = await ownProfilePath();
    const data = await authedRequest(path, { headers });
    return data.user;
  },

  updateProfile: async (updates) => {
    const { path, headers } = await ownProfilePath();
    const data = await authedRequest(path, { method: 'PUT', headers, body: JSON.stringify(updates) });
    return data.user;
  },
};
