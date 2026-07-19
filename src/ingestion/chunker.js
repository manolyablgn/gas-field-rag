// src/ingestion/chunker.js
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { listSupportedFiles } from "./fileRouter.js";
import { extractPdfText } from "./pdfLoader.js";
import { config } from "../config.js";
import { detectSuspiciousContent } from "./promptInjectionDetector.js";

function slugify(filename) {
  const base = filename.replace(/\.[^/.]+$/, "");
  return base
    .toLowerCase()
    .replace(/[^a-z0-9çğıöşü]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function loadMarkdown(fullPath, filename) {
  const raw = fs.readFileSync(fullPath, "utf-8");
  const { data, content } = matter(raw);
  const normalizedContent = content.replace(/\r\n/g, "\n").trim();
  detectSuspiciousContent(normalizedContent, filename);

  return {
    id: data.id || slugify(filename),
    title: data.title || filename,
    category: data.category || "Genel",
    filename,
    content: normalizedContent,
  };
}

async function loadPdf(fullPath, filename) {
  const text = await extractPdfText(fullPath);
  detectSuspiciousContent(text, filename);
  return {
    id: slugify(filename),
    title: filename.replace(/\.pdf$/i, ""),
    category: "Genel",
    filename,
    content: text,
  };
}

export async function loadDocuments(docsPath = config.docsPath) {
  const files = listSupportedFiles(docsPath);
  const documents = [];

  for (const { filename, type } of files) {
    const fullPath = path.join(docsPath, filename);
    try {
      if (type === "markdown") {
        documents.push(loadMarkdown(fullPath, filename));
      } else if (type === "pdf") {
        documents.push(await loadPdf(fullPath, filename));
      }
    } catch (err) {
      console.error(`⚠️  "${filename}" işlenemedi, atlanıyor: ${err.message}`);
    }
  }

  return documents;
}

export function splitIntoChunks(text, chunkSize = 500, overlap = 100) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const chunks = [];
  const overlapWords = Math.max(1, Math.floor(overlap / 6));
  let i = 0;

  while (i < words.length) {
    let chunkWords = [];
    let length = 0;
    let j = i;

    while (j < words.length && length < chunkSize) {
      chunkWords.push(words[j]);
      length += words[j].length + 1;
      j++;
    }

    chunks.push(chunkWords.join(" "));

    if (j >= words.length) break;

    const nextStart = j - overlapWords;
    i = nextStart > i ? nextStart : j;
  }

  return chunks.filter((c) => c.length > 0);
}