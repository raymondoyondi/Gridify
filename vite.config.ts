import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

// React 19 ships with the React Compiler, which auto-memoizes components and
// hooks at build time. Enabling it lets us delete manual useMemo/useCallback
// bookkeeping on the dashboard components while keeping referential stability.
const ReactCompilerConfig = {
  // Only compile our own source; skip node_modules for faster builds.
  sources: (filename: string) => filename.includes('/src/'),
};

export default defineConfig(() => {
  return {
    plugins: [
      react({
        babel: {
          plugins: [['babel-plugin-react-compiler', ReactCompilerConfig]],
        },
      }),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // Bind to all interfaces (0.0.0.0 + ::) instead of only IPv6 "localhost"
      // (::1). Vite 6 resolves the default host to ::1, which leaves IPv4
      // 127.0.0.1 unreachable. CI (start-server-and-test / wait-on) polls
      // http://127.0.0.1:3000, so without this the readiness check times out.
      host: true,
      port: 3000,
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
        },
      },
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
