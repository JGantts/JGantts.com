import { fileURLToPath, URL } from "node:url";

import { defineConfig, type ServerOptions } from "vite";
import vue from "@vitejs/plugin-vue";
import svgLoader from 'vite-svg-loader'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode, ssrBuild }) => {
  let server: ServerOptions
  let publicDir: string|boolean = "PUBLIC"
  if (command === 'serve' ) {
    // dev
    server = {
      host: true,
      port: 42301,
      strictPort: true
    }
  } else { // command === build
    // prod
    publicDir = false
    server = {
      host: false
    }
  }
  let outDir: string
  outDir = './dist/'

  return {
    publicDir : publicDir,
    server,
    build: {
      emptyOutDir: true,
      outDir
    },
    plugins: [
      vue(),
      svgLoader(),
      {
      name: 'watch-and-hmr',
      configureServer(server) {
        const dir = './PUBLIC/assets/kovyalo/'

        server.watcher.add(dir)

        server.watcher.on('change', (file) => {
          if (file.includes('my-special-dir')) {
            console.log('[hmr] changed:', file)

            server.ws.send({
              type: 'custom',
              event: 'my-dir-update',
              data: { file }
            })
          }
        })
      }
    }
    ],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
  },
}});
