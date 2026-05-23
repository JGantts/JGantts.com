import { fileURLToPath, URL } from "node:url";
import { defineConfig, type ServerOptions } from "vite";
import vue from "@vitejs/plugin-vue";
import svgLoader from "vite-svg-loader";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig(({ command }) => {
  const isBuild = command === "build";

  let server: ServerOptions;
  let publicDir: string | boolean = "PUBLIC";

  if (!isBuild) {
    server = {
      host: true,
      port: 42301,
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
      svgLoader(),

      {
        name: "watch-and-hmr",
        configureServer(server) {
          const dir = "./PUBLIC/assets/kovyalo/";

          server.watcher.add(dir);

          server.watcher.on("change", (file) => {
            if (file.includes("my-special-dir")) {
              console.log("[hmr] changed:", file);

              server.ws.send({
                type: "custom",
                event: "my-dir-update",
                data: { file },
              });
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