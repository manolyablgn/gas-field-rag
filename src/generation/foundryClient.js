// src/generation/foundryClient.js
// Foundry Local SDK bağlantısını ve model yaşam döngüsünü yönetir

import { FoundryLocalManager } from "foundry-local-sdk";
import { config } from "../config.js";

let manager = null;
let model = null;
let chatClient = null;

// Modeli bir kez indirir, yükler ve chat client oluşturur (sonraki çağrılarda tekrar kullanılır)
export async function getChatClient() {
  if (chatClient) return chatClient;

  console.log("🔌 Foundry Local SDK başlatılıyor...");
  manager = FoundryLocalManager.create({ appName: "gas-field-rag", logLevel: "info" });

  console.log(`📦 Model alınıyor: ${config.model}`);
  model = await manager.catalog.getModel(config.model);

  console.log("⬇️  Model indiriliyor (ilk seferde ~2GB olabilir, sabırlı ol)...");
  await model.download((progress) => {
    process.stdout.write(`\r   İndirme: ${progress.toFixed(1)}%   `);
  });
  console.log("\n✅ Model indirildi.");

  console.log("🚀 Model belleğe yükleniyor...");
  await model.load();
  console.log("✅ Model hazır.");

  chatClient = model.createChatClient();
  return chatClient;
}

export async function unloadModel() {
  if (model) {
    await model.unload();
    console.log("🛑 Model bellekten kaldırıldı.");
  }
}