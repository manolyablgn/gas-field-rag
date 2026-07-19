// src/ingestion/pdfLoader.js
// PDF dosyasından düz metin çıkarır (pdf-parse v2 API kullanır).

import fs from "fs/promises";
import { PDFParse } from "pdf-parse";

export async function extractPdfText(filePath) {
  let buffer;
  try {
    buffer = await fs.readFile(filePath);
  } catch (err) {
    throw new Error(`PDF dosyası okunamadı: ${filePath}. Detay: ${err.message}`);
  }

  const parser = new PDFParse({ data: buffer });
  let result;
  try {
    result = await parser.getText();
  } catch (err) {
    throw new Error(`PDF ayrıştırılamadı (bozuk veya şifreli olabilir): ${filePath}. Detay: ${err.message}`);
  } finally {
    await parser.destroy();
  }

  const text = result.text.replace(/\r\n/g, "\n").trim();
  if (text.length === 0) {
    throw new Error(`PDF'ten metin çıkarılamadı (taranmış/görüntü tabanlı bir PDF olabilir): ${filePath}`);
  }

  return text;
}