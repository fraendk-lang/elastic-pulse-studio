import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
          '@src': path.resolve(__dirname, 'src'),
        }
      },
      optimizeDeps: {
        include: ['monaco-editor'],
      },
      build: {
        rollupOptions: {
          output: {
            manualChunks: {
              'monaco-editor': ['monaco-editor'],
            },
          },
        },
        // Ensure assets are relative paths for Electron
        assetsDir: 'assets',
        base: './',
      },
    };
});
