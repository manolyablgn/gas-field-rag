// src/ingestion/tfidf.js
// Basit TF-IDF hesaplama: metinleri sayısal vektörlere çevirir

// Metni temizleyip kelimelere ayırır
function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^\wçğıöşü\s]/gi, " ") // noktalama işaretlerini temizle (TR karakterleri koru)
    .split(/\s+/)
    .filter((w) => w.length > 2); // 2 harften kısa kelimeleri at
}

// Bir chunk listesi için TF-IDF vektörleri ve kelime dağarcığını (vocabulary) hesaplar
export function computeTfidf(chunkTexts) {
  const tokenizedChunks = chunkTexts.map(tokenize);

  // 1. Vocabulary (tüm benzersiz kelimeler) oluştur
  const vocabSet = new Set();
  tokenizedChunks.forEach((tokens) => tokens.forEach((t) => vocabSet.add(t)));
  const vocabulary = Array.from(vocabSet);

  // 2. IDF hesapla: her kelime kaç farklı chunk'ta geçiyor
  const df = {}; // document frequency
  vocabulary.forEach((word) => (df[word] = 0));
  tokenizedChunks.forEach((tokens) => {
    const uniqueWords = new Set(tokens);
    uniqueWords.forEach((word) => df[word]++);
  });

  const N = chunkTexts.length;
  const idf = {};
  vocabulary.forEach((word) => {
    idf[word] = Math.log(N / (1 + df[word])) + 1; // +1 smoothing
  });

  // 3. Her chunk için TF-IDF vektörü hesapla
  const vectors = tokenizedChunks.map((tokens) => {
    const tf = {};
    tokens.forEach((word) => {
      tf[word] = (tf[word] || 0) + 1;
    });
    const totalWords = tokens.length || 1;

    const vector = {};
    Object.keys(tf).forEach((word) => {
      vector[word] = (tf[word] / totalWords) * idf[word];
    });

    return vector;
  });

  return { vectors, vocabulary, idf };
}

// Bir sorgu metnini, mevcut vocabulary ve idf'e göre vektöre çevirir
export function vectorizeQuery(query, idf) {
  const tokens = tokenize(query);
  const tf = {};
  tokens.forEach((word) => {
    tf[word] = (tf[word] || 0) + 1;
  });
  const totalWords = tokens.length || 1;

  const vector = {};
  Object.keys(tf).forEach((word) => {
    if (idf[word] !== undefined) {
      vector[word] = (tf[word] / totalWords) * idf[word];
    }
  });

  return vector;
}

// İki seyrek (sparse) vektör arasında kosinüs benzerliği hesaplar
export function cosineSimilarity(vecA, vecB) {
  const keysA = Object.keys(vecA);
  const keysB = Object.keys(vecB);

  let dotProduct = 0;
  keysA.forEach((key) => {
    if (vecB[key] !== undefined) {
      dotProduct += vecA[key] * vecB[key];
    }
  });

  const magA = Math.sqrt(keysA.reduce((sum, k) => sum + vecA[k] ** 2, 0));
  const magB = Math.sqrt(keysB.reduce((sum, k) => sum + vecB[k] ** 2, 0));

  if (magA === 0 || magB === 0) return 0;
  return dotProduct / (magA * magB);
}