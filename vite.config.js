import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const openaiKey = env.OPENAI_API_KEY;

  return {
    root: '.',
    publicDir: 'public',
    server: openaiKey
      ? {
          proxy: {
            '/__openai': {
              target: 'https://api.openai.com',
              changeOrigin: true,
              rewrite: p => p.replace(/^\/__openai/, ''),
              configure(proxy) {
                proxy.on('proxyReq', proxyReq => {
                  proxyReq.setHeader('Authorization', `Bearer ${openaiKey}`);
                });
              },
            },
          },
        }
      : {},
    build: {
      outDir: 'dist',
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
          paceLabPage: resolve(__dirname, 'pace-lab.html'),
          '100m': resolve(__dirname, 'events/100m.html'),
          '200m': resolve(__dirname, 'events/200m.html'),
          '400m': resolve(__dirname, 'events/400m.html'),
          '800m': resolve(__dirname, 'events/800m.html'),
          '1500m': resolve(__dirname, 'events/1500m.html'),
          '2mile': resolve(__dirname, 'events/2mile.html'),
          '5k': resolve(__dirname, 'events/5k.html'),
          videoLab: resolve(__dirname, 'video-lab.html'),
        },
      },
    },
  };
});
