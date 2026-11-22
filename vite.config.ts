import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Relative base: funktioniert auf GitHub Pages (/LvLUp/) und auf Vercel (/) gleichermaßen.
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icon-180.png', 'favicon.png'],
      manifest: {
        name: 'Soul Quest',
        short_name: 'Soul Quest',
        description: 'Trainings-RPG für den Soul Trail 2027',
        lang: 'de',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#17141A',
        theme_color: '#17141A',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff,woff2}'],
        navigateFallback: 'index.html',
      },
    }),
  ],
  test: {
    include: ['src/**/*.test.ts'],
  },
});
