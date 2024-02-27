import { fileURLToPath, URL } from "node:url";

import { defineConfig, type ServerOptions } from "vite";
import vue from "@vitejs/plugin-vue";

// https://vitejs.dev/config/
export default defineConfig(({ command, mode, ssrBuild }) => {
  let server: ServerOptions
  if (command === 'serve' ) {
    // dev
    server = {
      host: true,
      port: 42301,
      strictPort: true
    }
  } else { // command === build
    // prod
    server = {
      host: false
    }
  }
  let outDir: string
  if (command === 'serve' ) {
    // dev
    outDir = 'dist'
  } else { // command === build
    // prod
    outDir = './dist/app/'
  }

  return {
    server,
    build: {
      emptyOutDir: true,
      outDir
    },
    plugins: [vue()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
  },
}});
