// src/ingestion/chunker.js
// Markdown dosyalarını okur, front-matter'ı ayırır, metni parçalara böler

import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { config } from "../config.js";

// Bir klasördeki tüm .md dosyalarını okur
export function loadDocuments(docsPath = config.docsPath) {
  const files = fs.readdirSync(docsPath).filter((f) => f.endsWith(".md"));

  return files.map((filename) => {
    const fullPath = path.join(docsPath, filename);
    const raw = fs.readFileSync(fullPath, "utf-8");
    const { data, content } = matter(raw); // data = front-matter, content = metin
    const normalizedContent = content.replace(/\r\n/g, "\n").trim();

    return {
      id: data.id || filename.replace(".md", ""),
      title: data.title || filename,
      category: data.category || "Genel",
      filename,
      content: normalizedContent,
    };
  });
}

// Metni chunk'lara böler (kelime bazlı, overlap'li, ilerlemesi garanti)
export function splitIntoChunks(text, chunkSize = config.chunking.chunkSize, overlap = config.chunking.chunkOverlap) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const chunks = [];
  const overlapWords = Math.max(1, Math.floor(overlap / 6)); // ~6 karakter/kelime varsayımı
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

    if (j >= words.length) break; // metin bitti

    // İlerlemeyi garanti et: overlap uygula ama asla geriye/yerinde sayma
    const nextStart = j - overlapWords;
    i = nextStart > i ? nextStart : j;
  }

  return chunks.filter((c) => c.length > 0);
}