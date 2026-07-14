// src/generation/foundryClient.js
// Foundry Local SDK bağlantısını ve model yaşam döngüsünü yönetir.
// İki farklı model destekler: hızlı generation modeli ve güçlü reranking modeli.

import { FoundryLocalManager } from "foundry-local-sdk";
import { config } from "../config.js";

let manager = null;
const clients = new Map(); // modelAlias -> chatClient

async function getManager() {
  if (!manager) {
    console.log("🔌 Foundry Local SDK başlatılıyor...");
    manager = FoundryLocalManager.create({ appName: "gas-field-rag", logLevel: "info" });
  }
  return manager;
}

async function getClientFor(modelAlias) {
  if (clients.has(modelAlias)) return clients.get(modelAlias);

  const mgr = await getManager();
  console.log(`📦 Model alınıyor: ${modelAlias}`);
  const model = await mgr.catalog.getModel(modelAlias);

  console.log(`⬇️  Model indiriliyor (${modelAlias})...`);
  await model.download((progress) => {
    process.stdout.write(`\r   İndirme: ${progress.toFixed(1)}%   `);
  });
  console.log(`\n✅ Model indirildi: ${modelAlias}`);

  await model.load();
  console.log(`✅ Model hazır: ${modelAlias}`);

  const chatClient = model.createChatClient();
  clients.set(modelAlias, chatClient);
  return chatClient;
}

// Cevap üretme (generation) için hızlı model
export async function getChatClient() {
  return getClientFor(config.model);
}

// Alaka değerlendirme (reranking) için güçlü model
export async function getRerankClient() {
  return getClientFor(config.rerankModel);
}