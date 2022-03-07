import { build, BuildOptions } from "esbuild";
import { builtinModules } from "module";

export interface BundleOptions {
  entry: string;
  output: string;
}

export default async function bundle(
  options: BundleOptions,
  esbuildOptionsOverride?: BuildOptions,
) {
  const { entry, output } = options;

  await build({
    bundle: true,
    minify: true,
    entryPoints: [entry],
    outfile: output,
    platform: "browser",
    target: "chrome96",
    format: "esm",
    mainFields: ["module", "main", "browser"],
    conditions: ["worker", "import", "require"],
    external: [...builtinModules, "__STATIC_CONTENT_MANIFEST"],
    ...esbuildOptionsOverride,
  });
}
