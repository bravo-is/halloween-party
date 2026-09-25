import { defineConfig } from 'astro/config';
// Share previews need an absolute, publicly reachable image URL.
// Netlify's URL can still refer to its original domain after a domain change.
const site = process.env.PUBLIC_SITE_URL
  || (['deploy-preview', 'branch-deploy'].includes(process.env.CONTEXT)
    ? process.env.DEPLOY_PRIME_URL : undefined)
  || 'https://h7event.com';
export default defineConfig({ site, output: 'static', vite: { build: { assetsInlineLimit: 0 } } });
