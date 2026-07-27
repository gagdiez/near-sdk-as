#!/usr/bin/env node
import { existsSync, realpathSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import asc from "assemblyscript/asc";
import {
  discoverEndpoints,
  generateContractModule,
  generateEntry,
} from "../compiler/endpoints.mjs";

function usage(message) {
  if (message) console.error(message);
  console.error(
    "Usage: near-as build <contract.ts> [--out build/contract.wasm] [--sdk near-sdk-as] [--debug]",
  );
  process.exitCode = 1;
}

function modulePath(fromFile, target) {
  let relative = path.relative(path.dirname(fromFile), target).replaceAll(path.sep, "/");
  if (!relative.startsWith(".")) relative = `./${relative}`;
  return relative.replace(/\.ts$/, "");
}

function parseArguments(argv) {
  const { positionals, values } = parseArgs({
    args: argv,
    allowPositionals: true,
    strict: true,
    options: {
      out: { type: "string", default: "build/contract.wasm" },
      sdk: { type: "string", default: "near-sdk-as" },
      debug: { type: "boolean", default: false },
    },
  });
  if (positionals.length !== 2 || positionals[0] !== "build") return null;
  return {
    source: positionals[1],
    out: values.out,
    sdk: values.sdk,
    debug: values.debug,
  };
}

async function expandEmbeddedBytes(sourceText, sourcePath) {
  const pattern = /embed\.bytes\(\s*(["'])([^"']+)\1\s*\)/g;
  const matches = [...sourceText.matchAll(pattern)];
  if (matches.length === 0) return sourceText;

  let result = "";
  let cursor = 0;
  for (const match of matches) {
    result += sourceText.slice(cursor, match.index);
    const file = path.resolve(path.dirname(sourcePath), match[2]);
    const bytes = await readFile(file);
    result += `embed.fromMemory(memory.data<u8>([${bytes.join(",")}]), ${bytes.length})`;
    cursor = match.index + match[0].length;
  }
  return result + sourceText.slice(cursor);
}

export async function build(options, cwd = process.cwd()) {
  const source = path.resolve(cwd, options.source);
  const output = path.resolve(cwd, options.out);
  const generated = path.resolve(cwd, ".near/generated-entry.ts");
  const generatedContract = source.replace(/\.ts$/, ".near.generated.ts");
  const sourceText = await readFile(source, "utf8");
  const expandedSourceText = await expandEmbeddedBytes(sourceText, source);
  const endpoints = discoverEndpoints(sourceText);

  let sdkTarget = options.sdk.endsWith(".ts") || options.sdk.startsWith(".")
    ? path.resolve(cwd, options.sdk)
    : null;
  const sdkAlias = sdkTarget && path.join(path.dirname(sdkTarget), "near-sdk-as.ts");
  if (sdkAlias && existsSync(sdkAlias)) sdkTarget = sdkAlias;
  // Use the same module identity in the generated entry and every contract
  // source file. A relative path here would create a second copy when a helper
  // module imports the package by name (for example in a multi-file contract).
  const sdkImport = sdkTarget ? "near-sdk-as" : options.sdk;
  const contractSdkImport = sdkImport;
  const contractModule = generateContractModule(expandedSourceText, contractSdkImport);
  const entry = generateEntry({
    sourceImport: modulePath(generated, generatedContract),
    sdkImport,
    endpoints,
    panicOnDefault: contractModule.panicOnDefault,
  });

  await mkdir(path.dirname(generated), { recursive: true });
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(generatedContract, contractModule.source);
  await writeFile(generated, entry);

  const compilerArgs = [
    generated,
    "--path",
    cwd,
    "--outFile",
    output,
    "--runtime",
    "stub",
    "--transform",
    "json-as",
    "--exportTable",
  ];
  if (sdkTarget) compilerArgs.push("--lib", path.dirname(sdkTarget));
  if (options.debug) compilerArgs.push("--debug", "--sourceMap");
  else compilerArgs.push("--optimizeLevel", "3", "--shrinkLevel", "2");

  const result = await asc.main(compilerArgs, {
    stdout: process.stdout,
    stderr: process.stderr,
  });
  if (result.error) throw result.error;
  return { endpoints, generated, generatedContract, output };
}

async function main() {
  try {
    const options = parseArguments(process.argv.slice(2));
    if (!options) return usage();
    const result = await build(options);
    console.log(`Built ${path.relative(process.cwd(), result.output)}`);
  } catch (error) {
    usage(error instanceof Error ? error.message : String(error));
  }
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
