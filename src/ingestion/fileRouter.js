// src/ingestion/fileRouter.js
// Bir klasördeki dosyaları uzantılarına göre sınıflandırır (case-insensitive).

import fs from "fs";
import path from "path";

const SUPPORTED_EXTENSIONS = {
  ".md": "markdown",
  ".pdf": "pdf",
};

export function classifyFile(filename) {
  const ext = path.extname(filename).toLowerCase();
  return SUPPORTED_EXTENSIONS[ext] || null;
}

export function listSupportedFiles(dirPath) {
  const allFiles = fs.readdirSync(dirPath);
  return allFiles
    .map((filename) => ({ filename, type: classifyFile(filename) }))
    .filter((f) => f.type !== null);
}