import { fileURLToPath, URL } from 'node:url'
import { defineConfig,loadEnv  } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default ({ mode }) => {
  // carica variabili d'ambiente da .env, .env.production, ecc.
  const env = loadEnv(mode, process.cwd(), '');
  // usa VITE_BASE e VITE_OUTDIR se presenti, altrimenti valori di default
  const base = env.BASE_URL || '/';
  const outDir = 'docs';

  return defineConfig({
    base,
    plugins: [
      vue(),
      vueDevTools(),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      },
    },
    build: {
      outDir, // esempio: 'dist', 'public/build', '../backend/public/app'
      sourcemap: false, // opzione a piacere
    },

  })
}
