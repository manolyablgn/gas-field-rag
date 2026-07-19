// src/ingestion/embedBatchSync.js
// ingest.js'in (ve dolayısıyla server.js'in) ana process'inde @xenova/transformers'ı
// HİÇ import etmemesini sağlar - tüm embedding hesaplaması izole bir alt process'te olur.

import { execFileSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scriptPath = path.join(__dirname, "embedBatch.js");

export function embedTextsSync(texts) {
  const output = execFileSync("node", [scriptPath], {
    input: JSON.stringify(texts),
    encoding: "utf-8",
    maxBuffer: 1024 * 1024 * 50,
  });
  const lines = output.trim().split("\n").filter(Boolean);
  return JSON.parse(lines[lines.length - 1]);
}