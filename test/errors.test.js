import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  AppError,
  ModelLoadError,
  RetrievalError,
  ConfigError,
  DatabaseError,
  ValidationError,
  retryWithBackoff,
} from "../src/utils/errors.js";

describe("Hata sınıfları", () => {
  test("ModelLoadError doğru kod ve isRecoverable=true taşır", () => {
    const err = new ModelLoadError("qwen2.5-1.5b", new Error("network timeout"));
    assert.equal(err.code, "MODEL_LOAD_FAILED");
    assert.equal(err.isRecoverable, true);
    assert.ok(err.message.includes("qwen2.5-1.5b"));
    assert.ok(err instanceof AppError);
  });

  test("ConfigError isRecoverable=false taşır (config hatası kurtarılamaz, düzeltilmeli)", () => {
    const err = new ConfigError(["config.port geçersiz", "config.model eksik"]);
    assert.equal(err.code, "CONFIG_INVALID");
    assert.equal(err.isRecoverable, false);
    assert.ok(err.message.includes("config.port geçersiz"));
    assert.ok(err.message.includes("config.model eksik"));
  });

  test("ValidationError doğru kodu taşır", () => {
    const err = new ValidationError("Soru boş olamaz.");
    assert.equal(err.code, "VALIDATION_ERROR");
    assert.equal(err.isRecoverable, false);
  });

  test("RetrievalError ve DatabaseError isRecoverable=true taşır", () => {
    assert.equal(new RetrievalError(new Error("x")).isRecoverable, true);
    assert.equal(new DatabaseError(new Error("x")).isRecoverable, true);
  });

  test("tüm özel hatalar instanceof AppError ve instanceof Error'dır", () => {
    const errors = [
      new ModelLoadError("m", new Error()),
      new RetrievalError(new Error()),
      new ConfigError(["x"]),
      new DatabaseError(new Error()),
      new ValidationError("x"),
    ];
    errors.forEach((e) => {
      assert.ok(e instanceof AppError);
      assert.ok(e instanceof Error);
    });
  });
});

describe("retryWithBackoff", () => {
  test("ilk denemede başarılı olursa tekrar denemez", async () => {
    let callCount = 0;
    const result = await retryWithBackoff(
      async () => {
        callCount++;
        return "başarılı";
      },
      { retries: 3, baseDelayMs: 1 }
    );
    assert.equal(result, "başarılı");
    assert.equal(callCount, 1);
  });

  test("başarısız olursa retries kadar dener, sonra hatayı fırlatır", async () => {
    let callCount = 0;
    await assert.rejects(
      () =>
        retryWithBackoff(
          async () => {
            callCount++;
            throw new Error("hep başarısız");
          },
          { retries: 3, baseDelayMs: 1 }
        ),
      /hep başarısız/
    );
    assert.equal(callCount, 3, "tam olarak 3 kez denemeli");
  });

  test("2. denemede başarılı olursa orada durur", async () => {
    let callCount = 0;
    const result = await retryWithBackoff(
      async () => {
        callCount++;
        if (callCount < 2) throw new Error("henüz değil");
        return "sonunda başarılı";
      },
      { retries: 5, baseDelayMs: 1 }
    );
    assert.equal(result, "sonunda başarılı");
    assert.equal(callCount, 2);
  });
});