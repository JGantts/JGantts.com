import { fileURLToPath, URL } from "node:url";
import { readFile } from "node:fs/promises";
import { defineConfig, type ServerOptions } from "vite";
import { localMapBuild } from "./dev/mapBuild";
import vue from "@vitejs/plugin-vue";
import svgLoader from "vite-svg-loader";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig(({ command }) => {
  const isBuild = command === "build";
  const backendTarget = process.env.VITE_BACKEND_TARGET ?? 'local';
  const backendOrigin = {
    local: 'http://localhost:3000',
    live: 'https://jgantts.com',
  }[backendTarget];

  if (!isBuild && !backendOrigin) {
    throw new Error('VITE_BACKEND_TARGET must be either "local" or "live".');
  }

  let server: ServerOptions;
  let publicDir: string | boolean = "PUBLIC";

  if (!isBuild) {
    server = {
      host: true,
      port: 42301,
      proxy: {
        '/api': {
          changeOrigin: true,
          target: backendOrigin,
        },
        '/media': {
          changeOrigin: true,
          target: backendOrigin,
        },
        '/feed.xml': {
          changeOrigin: true,
          target: backendOrigin,
        },
        '/sitemap.xml': {
          changeOrigin: true,
          target: backendOrigin,
        },
      },
      strictPort: true,
    };
  } else {
    publicDir = false;
    server = { host: false };
  }

  return {
    publicDir,
    server,
    build: {
      emptyOutDir: true,
      outDir: "./dist/",
    },

    plugins: [
      vue(),
      localMapBuild(),
      svgLoader(),

      {
        name: "compiled-map-regions",
        configureServer(server) {
          const regionsPath = fileURLToPath(new URL("./PUBLIC/assets/maps/geo-data/regions.json", import.meta.url));
          // Serve generated readings, never the uncompiled source metadata.
          server.middlewares.use(async (req, res, next) => {
            if (req.url?.split('?')[0] !== '/assets/maps/geo-data/regions.json'
              || !['GET', 'HEAD'].includes(req.method ?? '')) return next();
            try {
              const json = await readFile(regionsPath);
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.setHeader('Cache-Control', 'no-store');
              res.end(req.method === 'HEAD' ? undefined : json);
            } catch (error) {
              next(error);
            }
          });

        },
      },

      // ONLY in build mode
      /*...((isBuild)
        ? [
            visualizer({
              open: true,
              gzipSize: true,
              brotliSize: true,
              filename: "./dist/stats.html",
            }),
          ]
        : []),*/
    ],

    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
  };
});
