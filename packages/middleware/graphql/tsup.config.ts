import { defineConfig } from "tsup";
import path from "path";
import { fileURLToPath } from "url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig([
  {
    entry: ["./src/index.ts"],
    format: ["esm"],
    platform: "node",
    target: "node14",
    shims: false,
    dts: true,
    esbuildPlugins: [
      {
        name: "mmm",
        setup(build) {
          build.onResolve(
            {
              filter: /^cross-undici-fetch$/,
            },
            async () => ({
              path: path.resolve(dirname, "./fetch.shim.js"),
            }),
          );
        },
      },
    ],
  },
]);
