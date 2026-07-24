// scripts/setup.js
// Tek komutla kurulum: .env oluşturur, Foundry Local'i kontrol eder, ingest çalıştırır.

import fs from "fs";
import { execSync } from "child_process";

console.log("🚀 Kurulum başlıyor...\n");

// 1. .env dosyası yoksa .env.example'dan oluştur
if (!fs.existsSync(".env")) {
  if (fs.existsSync(".env.example")) {
    fs.copyFileSync(".env.example", ".env");
    console.log("✅ .env dosyası oluşturuldu (.env.example'dan kopyalandı)");
  } else {
    console.log("⚠️  .env.example bulunamadı, .env dosyasını elle oluşturman gerekebilir");
  }
} else {
  console.log("✅ .env dosyası zaten var, dokunulmadı");
}

// 2. Foundry Local kurulu mu kontrol et
try {
  execSync("foundry --version", { stdio: "ignore" });
  console.log("✅ Foundry Local kurulu");
} catch {
  console.log("❌ Foundry Local bulunamadı!");
  console.log("   Kurulum için: https://github.com/microsoft/Foundry-Local");
  process.exit(1);
}

// 3. docs/ klasörü var mı, boş mu kontrol et
if (!fs.existsSync("docs") || fs.readdirSync("docs").filter(f => f.endsWith(".md") || f.endsWith(".pdf")).length === 0) {
  console.log("⚠️  docs/ klasöründe doküman bulunamadı, ingest sonrası boş bir veritabanı oluşabilir");
} else {
  console.log("✅ docs/ klasöründe dokümanlar mevcut");
}

// 4. İlk ingestion'ı çalıştır
console.log("\n📥 İlk indeksleme başlıyor (bu birkaç dakika sürebilir)...\n");
try {
  execSync("node src/ingest.js", { stdio: "inherit" });
} catch (err) {
  console.log("\n❌ Indeksleme başarısız oldu, yukarıdaki hataya bakın.");
  process.exit(1);
}

console.log("\n🎉 Kurulum tamamlandı! Başlatmak için: npm start");