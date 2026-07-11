#!/usr/bin/env node
// scripts/init-images.mjs
//
// Seeds local placeholder product images so a fresh environment (empty S3
// bucket) doesn't render as a wall of emoji. For every product returned by
// the product API, copies the base image matching its category into
// ./img/<sku>.jpg (lowercased), matching the image_url naming convention
// already used by real product records (e.g. "img/dry-cp-001.jpg").
//
// This only produces local files — it does not upload anything to S3.
// ./img is gitignored; re-run any time the product catalog changes.

import { readdirSync, existsSync, mkdirSync, rmSync, copyFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const BASE_IMG_DIR = path.join(ROOT, 'base_imgs');
const OUT_DIR = path.join(ROOT, 'img');

const API_BASE_URL = process.env.VITE_API_BASE_URL || process.env.API_BASE_URL || 'https://api.chonkycat.ca';

// category (as returned by the product API) -> base image in ./base_imgs
const CATEGORY_BASE_IMAGE = {
  'wet food': 'wet.jpg',
  'dry food': 'dry.jpg',
  'snacks':   'treat.jpg',
};

async function fetchProducts() {
  const res = await fetch(`${API_BASE_URL}/products`);
  if (!res.ok) {
    throw new Error(`Product API returned status ${res.status}`);
  }

  const raw = await res.json();
  // Mirrors the response-shape handling already in src/App.jsx: some
  // paths return the parsed body directly, others return a Lambda-proxy
  // envelope with a stringified body.
  const body = raw.body ? (typeof raw.body === 'string' ? JSON.parse(raw.body) : raw.body) : raw;
  return body.data || body.products || body;
}

function main() {
  for (const [key, file] of Object.entries(CATEGORY_BASE_IMAGE)) {
    const p = path.join(BASE_IMG_DIR, file);
    if (!existsSync(p)) {
      throw new Error(`Missing base image for '${key}': expected ${p}`);
    }
  }

  return fetchProducts().then((products) => {
    if (!Array.isArray(products)) {
      throw new Error('Unexpected product API response shape — expected an array of products');
    }

    rmSync(OUT_DIR, { recursive: true, force: true });
    mkdirSync(OUT_DIR, { recursive: true });

    const counts = {};
    const skipped = [];

    for (const product of products) {
      const sku = product.sku;
      const category = (product.category || '').trim().toLowerCase();

      if (!sku) {
        skipped.push(`(missing sku) ${product.name || product.id}`);
        continue;
      }

      const baseImage = CATEGORY_BASE_IMAGE[category];
      if (!baseImage) {
        skipped.push(`${sku} (unrecognized category '${product.category}')`);
        continue;
      }

      const src = path.join(BASE_IMG_DIR, baseImage);
      const dest = path.join(OUT_DIR, `${sku.toLowerCase()}.jpg`);
      copyFileSync(src, dest);

      counts[category] = (counts[category] || 0) + 1;
    }

    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    console.log(`[init-images] Wrote ${total} image(s) to ${path.relative(ROOT, OUT_DIR)}/`);
    for (const [category, count] of Object.entries(counts)) {
      console.log(`  ${category}: ${count}`);
    }
    if (skipped.length > 0) {
      console.warn(`[init-images] Skipped ${skipped.length} product(s):`);
      for (const s of skipped) console.warn(`  - ${s}`);
    }
  });
}

main().catch((err) => {
  console.error(`[init-images] Failed: ${err.message}`);
  process.exit(1);
});
