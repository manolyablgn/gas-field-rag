// src/utils/errors.js
// Özel hata sınıfları ve retry (tekrar deneme) yardımcı fonksiyonu.
// Amaç: hatanın nereden geldiğini ve kurtarılabilir olup olmadığını net söylemek,
// "Bir hata oluştu, tekrar deneyin" gibi belirsiz mesajlar yerine.

export class AppError extends Error {
  constructor(message, code, isRecoverable = false) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.isRecoverable = isRecoverable;
  }
}

export class ModelLoadError extends AppError {
  constructor(modelAlias, cause) {
    super(
      `Model yüklenemedi: ${modelAlias}. Sebep: ${cause?.message || cause}`,
      "MODEL_LOAD_FAILED",
      true
    );
    this.modelAlias = modelAlias;
  }
}

export class RetrievalError extends AppError {
  constructor(cause) {
    super(`Arama işlemi başarısız oldu: ${cause?.message || cause}`, "RETRIEVAL_FAILED", true);
  }
}

export class ConfigError extends AppError {
  constructor(issues) {
    super(`Yapılandırma hatası:\n- ${issues.join("\n- ")}`, "CONFIG_INVALID", false);
    this.issues = issues;
  }
}

export class DatabaseError extends AppError {
  constructor(cause) {
    super(`Veritabanı hatası: ${cause?.message || cause}`, "DB_ERROR", true);
  }
}

export class ValidationError extends AppError {
  constructor(message) {
    super(message, "VALIDATION_ERROR", false);
  }
}

// Bir işlemi, başarısız olursa artan bekleme süreleriyle (exponential backoff) tekrar dener.
export async function retryWithBackoff(fn, { retries = 3, baseDelayMs = 500, label = "işlem" } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        console.log(`   ⚠️ ${label} başarısız (deneme ${attempt}/${retries}), ${delay}ms sonra tekrar denenecek...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}