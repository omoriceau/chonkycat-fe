// src/config.js
//
// Single place for the backend API base URL. VITE_API_BASE_URL is normally
// set by scripts/resolve-api-url.mjs (predev/prebuild) into .env.local from
// live AWS state — this hardcoded value is only the last-resort fallback
// when that script couldn't reach AWS.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.chonkycat.ca';

// Product images: img.chonkycat.ca -> Cloudflare -> CloudFront (OAC) ->
// private S3 bucket (chonky-images-<env>, see scripts/push-images.mjs).
// image_url values already include the "img/" prefix (e.g.
// "img/dry-cp-001.jpg"), so this is just the host to prepend.
export const IMAGES_BASE_URL = import.meta.env.VITE_IMAGES_BASE_URL || 'https://img.chonkycat.ca';
