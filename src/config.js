// src/config.js
// Projenin tüm ayarlarını buradan yönetiyoruz.

export const config = {
  // Foundry Local'de kullanılacak model (foundry model list çıktısındaki "Alias" sütunu)
  model: "qwen2.5-1.5b",        // hızlı, cevap üretme (generation) için
  rerankModel: "qwen2.5-7b",    // güçlü, alaka değerlendirme (reranking) için

  // Sunucu ayarları
  port: 3000,

  // Doküman parçalama (chunking) ayarları
  chunking: {
    chunkSize: 500,      // her parçanın yaklaşık karakter sayısı
    chunkOverlap: 100,   // parçalar arası örtüşme (bağlamı korumak için)
  },

  // Retrieval (getirme) ayarları
  retrieval: {
    topK: 3,
    minScoreThreshold: 0.1,
    absoluteRelevanceThreshold: 6,  // 0-10 üzerinden, bunun altındaki adaylar elenir
    weights: {
      lexical: 1.0,
      semantic: 1.3,
    },
  },

  // Veritabanı dosya yolu
  dbPath: "./data/rag.db",

  // Doküman klasörü
  docsPath: "./docs",
};