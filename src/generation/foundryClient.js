// src/generation/foundryClient.js
import { FoundryLocalManager } from "foundry-local-sdk";
import { config } from "../config.js";
import { ModelLoadError, retryWithBackoff } from "../utils/errors.js";

let manager = null;
const clients = new Map();

async function getManager() {
  if (!manager) {
    console.log("🔌 Foundry Local SDK başlatılıyor...");
    try {
      manager = FoundryLocalManager.create({ appName: "gas-field-rag", logLevel: "info" });
    } catch (err) {
      throw new ModelLoadError("Foundry Local SDK", err);
    }
  }
  return manager;
}

async function getClientFor(modelAlias) {
  if (clients.has(modelAlias)) return clients.get(modelAlias);

  const mgr = await getManager();

  let model;
  try {
    console.log(`📦 Model alınıyor: ${modelAlias}`);
    model = await mgr.catalog.getModel(modelAlias);
  } catch (err) {
    throw new ModelLoadError(modelAlias, err);
  }

  try {
    await retryWithBackoff(
      async () => {
        console.log(`⬇️  Model indiriliyor (${modelAlias})...`);
        await model.download((progress) => {
          process.stdout.write(`\r   İndirme: ${progress.toFixed(1)}%   `);
        });
        console.log(`\n✅ Model indirildi: ${modelAlias}`);

        await model.load();
        console.log(`✅ Model hazır: ${modelAlias}`);
      },
      { retries: 3, baseDelayMs: 1000, label: `${modelAlias} indirme/yükleme` }
    );
  } catch (err) {
    throw new ModelLoadError(modelAlias, err);
  }

  const chatClient = model.createChatClient();
  clients.set(modelAlias, chatClient);
  return chatClient;
}

export async function getChatClient() {
  return getClientFor(config.model);
}

export async function getRerankClient() {
  return getClientFor(config.rerankModel);
}