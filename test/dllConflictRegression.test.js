import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_ROOT = path.join(__dirname, "..", "src");

const SAFE_TO_IMPORT_TRANSFORMERS = new Set(["embedBatch.js", "embedQuery.js"]);

function extractImportSpecifiers(source) {
  const matches = [...source.matchAll(/^\s*import\s+.*?\s+from\s+["'](.+?)["']/gm)];
  return matches.map((m) => m[1]);
}

function resolveRelative(fromFile, specifier) {
  if (!specifier.startsWith(".")) return null;
  return path.normalize(path.join(path.dirname(fromFile), specifier));
}

function scanImportChainForPackage(entryFile, forbiddenPackage, visited = new Set()) {
  if (visited.has(entryFile)) return [];
  visited.add(entryFile);
  if (!fs.existsSync(entryFile)) return [];

  const source = fs.readFileSync(entryFile, "utf-8");
  const specifiers = extractImportSpecifiers(source);
  const violations = [];

  for (const spec of specifiers) {
    if (spec === forbiddenPackage) {
      violations.push(entryFile);
      continue;
    }
    const resolved = resolveRelative(entryFile, spec);
    if (!resolved) continue;

    const basename = path.basename(resolved);
    if (SAFE_TO_IMPORT_TRANSFORMERS.has(basename)) continue;

    violations.push(...scanImportChainForPackage(resolved, forbiddenPackage, visited));
  }

  return violations;
}

describe("DLL çakışma regresyon koruması (statik import analizi)", () => {
  test("ingest.js'in import zinciri hiçbir yerde @xenova/transformers'a doğrudan bağlanmaz", () => {
    const entry = path.join(SRC_ROOT, "ingest.js");
    const violations = scanImportChainForPackage(entry, "@xenova/transformers");
    assert.deepEqual(violations, [],
      `Şu dosya(lar) @xenova/transformers'ı doğrudan import ediyor: ${violations.join(", ")}. ` +
      `Bu, server.js'in process'ine sızıp Foundry Local ile DLL çakışmasına yol açar.`
    );
  });

  test("server.js'in import zinciri hiçbir yerde @xenova/transformers'a doğrudan bağlanmaz", () => {
    const entry = path.join(SRC_ROOT, "server.js");
    const violations = scanImportChainForPackage(entry, "@xenova/transformers");
    assert.deepEqual(violations, [],
      `server.js'in import zinciri @xenova/transformers'a bağlanıyor: ${violations.join(", ")}.`
    );
  });

  test("server.js'in import zinciri hiçbir yerde onnxruntime-node'a doğrudan bağlanmaz", () => {
    const entry = path.join(SRC_ROOT, "server.js");
    const violations = scanImportChainForPackage(entry, "onnxruntime-node");
    assert.deepEqual(violations, []);
  });
});