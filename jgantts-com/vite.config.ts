import { execFileSync } from "node:child_process";
import { fileURLToPath, URL } from "node:url";
import { defineConfig, type ServerOptions } from "vite";
import vue from "@vitejs/plugin-vue";
import svgLoader from "vite-svg-loader";
import { visualizer } from "rollup-plugin-visualizer";

function getCommitId() {
  const environmentCommit =
    process.env.VITE_COMMIT_SHA ?? process.env.GITHUB_SHA ?? process.env.COMMIT_SHA;
  if (environmentCommit) return environmentCommit.trim();

  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: fileURLToPath(new URL("..", import.meta.url)),
      encoding: "utf8",
    }).trim();
  } catch {
    return "dev";
  }
}

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
    define: {
      __APP_COMMIT__: JSON.stringify(getCommitId()),
    },
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
