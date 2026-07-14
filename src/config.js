// src/config.js
// Projenin tüm ayarlarını buradan yönetiyoruz.

export const config = {
  // Foundry Local'de kullanılacak model (foundry model list çıktısındaki "Alias" sütunu)
  model: "qwen2.5-1.5b",

  // Sunucu ayarları
  port: 3000,

  // Doküman parçalama (chunking) ayarları
  chunking: {
    chunkSize: 500,      // her parçanın yaklaşık karakter sayısı
    chunkOverlap: 100,   // parçalar arası örtüşme (bağlamı korumak için)
  },

  // Retrieval (getirme) ayarları
  retrieval: {
    topK: 5,
    minScoreThreshold: 0.1,
    weights: {
      lexical: 1.0,
      semantic: 1.3,   // semantic sinyale biraz öncelik ver
    },
  },

  // Veritabanı dosya yolu
  dbPath: "./data/rag.db",

  // Doküman klasörü
  docsPath: "./docs",
};