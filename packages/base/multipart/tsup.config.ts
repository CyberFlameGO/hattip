import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["./src/multipart.ts"],
    format: ["esm"],
    platform: "node",
    target: "node14",
    dts: true,
  },
]);
