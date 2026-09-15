import { defineConfig } from 'astro/config';
// Netlify supplies URL for production and DEPLOY_PRIME_URL for deploy previews.
const site = process.env.PUBLIC_SITE_URL
  || (process.env.CONTEXT === 'production' ? process.env.URL : process.env.DEPLOY_PRIME_URL)
  || process.env.URL
  || 'http://localhost:8888';
export default defineConfig({ site, output: 'static', vite: { build: { assetsInlineLimit: 0 } } });
