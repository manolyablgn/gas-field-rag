import { test, describe } from "node:test";
import assert from "node:assert/strict";

function slugify(filename) {
  const base = filename.replace(/\.[^/.]+$/, "");
  return base
    .toLowerCase()
    .replace(/[^a-z0-9çğıöşü]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

describe("slugify (PDF dosya adından ID üretme)", () => {
  test("basit dosya adını temiz bir id'ye çevirir", () => {
    assert.equal(slugify("Vana Bakim Raporu.pdf"), "vana-bakim-raporu");
  });

  test("Türkçe karakterleri korur", () => {
    assert.equal(slugify("Basınç Güvenlik Prosedürü.pdf"), "basınç-güvenlik-prosedürü");
  });

  test("özel karakterleri tire ile değiştirir", () => {
    assert.equal(slugify("Rapor_v2 (final)!!.pdf"), "rapor-v2-final");
  });

  test("başta/sonda tire bırakmaz", () => {
    assert.equal(slugify("---Rapor---.pdf"), "rapor");
  });

  test("farklı iki dosya adı farklı id üretir", () => {
    const id1 = slugify("Vana Bakim.pdf");
    const id2 = slugify("Kompresor Bakim.pdf");
    assert.notEqual(id1, id2);
  });
});