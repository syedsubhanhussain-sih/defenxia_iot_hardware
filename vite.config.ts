import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      '/api/leakcheck': {
        target: 'https://leakcheck.io/api',
        changeOrigin: true,
        rewrite: (path) => {
          const withoutPrefix = path.replace(/^\/api\/leakcheck/, '');
          if (withoutPrefix.startsWith('/public')) return withoutPrefix;
          return '/public' + withoutPrefix;
        }
      }
    }
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
