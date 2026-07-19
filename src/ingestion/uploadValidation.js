// src/ingestion/uploadValidation.js
// Yüklenen dosya adlarını doğrular - path traversal saldırılarına ve
// desteklenmeyen dosya türlerine karşı korur.

const ALLOWED_EXTENSIONS = [".md", ".pdf"];
const MAX_FILENAME_LENGTH = 200;

export function validateUploadFilename(filename) {
  const errors = [];

  if (typeof filename !== "string" || filename.trim().length === 0) {
    return { valid: false, errors: ["Dosya adı boş olamaz."] };
  }

  if (filename.length > MAX_FILENAME_LENGTH) {
    errors.push(`Dosya adı çok uzun (maksimum ${MAX_FILENAME_LENGTH} karakter).`);
  }

  if (filename.includes("/") || filename.includes("\\") || filename.includes("..")) {
    errors.push("Dosya adı klasör ayırıcı veya '..' içeremez.");
  }

  if (filename.includes("\0")) {
    errors.push("Geçersiz dosya adı.");
  }

  const lowerName = filename.toLowerCase();
  const hasAllowedExtension = ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
  if (!hasAllowedExtension) {
    errors.push(`Sadece ${ALLOWED_EXTENSIONS.join(", ")} dosyaları yüklenebilir.`);
  }

  return { valid: errors.length === 0, errors };
}

// Timestamp + rastgele ek kullanır (sadece timestamp yeterli değildir,
// aynı milisaniyede iki çağrı çakışabilir - bunu test sırasında gerçekten yakaladık).
export function sanitizeUploadFilename(filename) {
  const ext = ALLOWED_EXTENSIONS.find((e) => filename.toLowerCase().endsWith(e)) || "";
  const base = filename.slice(0, filename.length - ext.length);

  const cleanBase = base
    .replace(/[^\w\sçğıöşüÇĞİÖŞÜ-]/g, "")
    .trim()
    .slice(0, 100);

  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).slice(2, 8);
  return `${cleanBase}-${timestamp}-${randomSuffix}${ext}`;
}