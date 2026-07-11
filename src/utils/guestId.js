// src/utils/guestId.js
//
// Anonymous shoppers are identified by a client-generated id persisted in
// localStorage — the backend keys their cart on "guest_<id>" until they log
// in or sign up, at which point it gets claimed onto their real account
// (see cartApi.claimGuestCart).
const STORAGE_KEY = 'chonky_guest_id';

export function getOrCreateGuestId() {
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}

export function clearGuestId() {
  localStorage.removeItem(STORAGE_KEY);
}

// Read-only lookup — unlike getOrCreateGuestId(), doesn't fabricate an id
// just to check whether one exists (used before deciding to call
// cartApi.claimGuestCart on login).
export function peekGuestId() {
  return localStorage.getItem(STORAGE_KEY);
}
