import { describe, expect, it } from "bun:test";
import { checkSourceEvidence } from "../src/lib/source-evidence";

const complete = {
  datasetUrl: "https://example.org/dataset/2026.csv",
  version: "2026-11",
  termsUrl: "https://example.org/terms",
  attribution: "Example agency, 2026",
  retrievedAt: "2026-11-17T00:00:00Z",
  sha256: "a".repeat(64),
  yearMeaning: "registration_year",
  rightsReviewed: true,
  reviewedBy: "human-reviewer",
};

describe("offline source provenance review gate", () => {
  it("allows only a complete manifest to reach human review, not import", () => {
    expect(checkSourceEvidence(complete)).toEqual({ readyForHumanReview: true, missing: [] });
  });
  it("fails closed for absent evidence and missing rights review", () => {
    expect(checkSourceEvidence(null).readyForHumanReview).toBe(false);
    expect(checkSourceEvidence({ ...complete, rightsReviewed: false }).missing).toContain(
      "rightsReviewed",
    );
    expect(checkSourceEvidence({ ...complete, reviewedBy: "" }).missing).toContain("reviewedBy");
  });
  it("rejects non-HTTPS links, credentials, invalid hash, year semantics and timestamp", () => {
    const invalid = {
      ...complete,
      datasetUrl: "http://example.org/data",
      termsUrl: "https://user:password@example.org/terms",
      sha256: "not-a-hash",
      yearMeaning: "fitment",
      retrievedAt: "yesterday",
    };
    expect(checkSourceEvidence(invalid).missing).toEqual([
      "datasetUrl",
      "termsUrl",
      "sha256",
      "retrievedAt",
      "yearMeaning",
    ]);
  });
  it("rejects impossible calendar dates even when JavaScript normalizes them", () => {
    for (const retrievedAt of [
      "2026-02-30T00:00:00Z",
      "2026-13-01T00:00:00Z",
      "2025-02-29T00:00:00Z",
    ]) {
      expect(checkSourceEvidence({ ...complete, retrievedAt }).missing).toContain("retrievedAt");
    }
    expect(
      checkSourceEvidence({ ...complete, retrievedAt: "2024-02-29T00:00:00Z" }).readyForHumanReview,
    ).toBe(true);
  });
  it("validates literal years 0001–0099 without Date.UTC century normalization", () => {
    expect(
      checkSourceEvidence({ ...complete, retrievedAt: "0099-12-31T00:00:00Z" }).readyForHumanReview,
    ).toBe(true);
    expect(
      checkSourceEvidence({ ...complete, retrievedAt: "0004-02-29T00:00:00Z" }).readyForHumanReview,
    ).toBe(true);
    expect(
      checkSourceEvidence({ ...complete, retrievedAt: "0001-02-29T00:00:00Z" }).missing,
    ).toContain("retrievedAt");
  });
  it("rejects out-of-range UTC clock fields rather than normalized timestamps", () => {
    for (const retrievedAt of [
      "2026-11-17T24:00:00Z",
      "2026-11-17T23:60:00Z",
      "2026-11-17T23:59:60Z",
    ]) {
      expect(checkSourceEvidence({ ...complete, retrievedAt }).missing).toContain("retrievedAt");
    }
    expect(
      checkSourceEvidence({ ...complete, retrievedAt: "2024-11-17T23:59:59Z" }).readyForHumanReview,
    ).toBe(true);
  });
  it("rejects retrieval timestamps in the future", () => {
    expect(
      checkSourceEvidence({ ...complete, retrievedAt: "9999-12-31T23:59:59Z" }).missing,
    ).toContain("retrievedAt");
  });
  it("rejects loopback, private network and IPv6 literal source URLs", () => {
    for (const datasetUrl of [
      "https://localhost/data",
      "https://intranet/data",
      "https://catalog/data",
      "https://internal.localhost/data",
      "https://localhost./data",
      "https://internal.localhost./data",
      "https://printer.local/data",
      "https://service.internal/data",
      "https://router.home.arpa/data",
      "https://127.0.0.1/data",
      "https://10.0.0.1/data",
      "https://172.16.0.1/data",
      "https://192.168.1.2/data",
      "https://169.254.169.254/latest/meta-data",
      "https://8.8.8.8/data",
      "https://100.64.0.1/data",
      "https://198.18.0.1/data",
      "https://224.0.0.1/data",
      "https://255.255.255.255/data",
      "https://[::1]/data",
      "https://[::ffff:127.0.0.1]/data",
      "https://[::ffff:169.254.169.254]/data",
      "https://[2001:db8::1]/data",
    ]) {
      expect(checkSourceEvidence({ ...complete, datasetUrl }).missing).toContain("datasetUrl");
    }
  });
  it("rejects single-label terms hosts as well as dataset hosts", () => {
    expect(
      checkSourceEvidence({ ...complete, termsUrl: "https://intranet/terms" }).missing,
    ).toContain("termsUrl");
  });
  it("rejects malformed DNS labels in both provenance URL fields", () => {
    const malformed = [
      "https://example..org/data",
      "https://-bad.example.org/data",
      "https://bad-.example.org/data",
      `https://${"a".repeat(64)}.example.org/data`,
    ];
    for (const datasetUrl of malformed) {
      expect(checkSourceEvidence({ ...complete, datasetUrl }).missing).toContain("datasetUrl");
      expect(checkSourceEvidence({ ...complete, termsUrl: datasetUrl }).missing).toContain(
        "termsUrl",
      );
    }
    expect(
      checkSourceEvidence({ ...complete, datasetUrl: "https://a-b.example.org/data" })
        .readyForHumanReview,
    ).toBe(true);
  });
  it("continues to accept public HTTPS source hostnames", () => {
    expect(
      checkSourceEvidence({ ...complete, datasetUrl: "https://example.org/data" })
        .readyForHumanReview,
    ).toBe(true);
  });
  it("rejects provenance URLs silently rewritten by URL parsing", () => {
    for (const datasetUrl of [
      " https://example.org/data",
      "https://example.org/data ",
      "https://exa\tmple.org/data",
      "https://example.org/da\nta",
      "https://example.org/da\rta",
      "https://example.org/data\u0000",
    ]) {
      expect(checkSourceEvidence({ ...complete, datasetUrl }).missing).toContain("datasetUrl");
    }
    expect(
      checkSourceEvidence({ ...complete, termsUrl: "https://example.org/terms\n" }).missing,
    ).toContain("termsUrl");
  });
  it("rejects disguised human-review metadata and malformed Unicode", () => {
    for (const field of ["version", "attribution", "reviewedBy"]) {
      for (const value of ["valid\\u202Eevil", "valid\\u200Bhidden", "valid\\u0000control", "valid\\uD800"]) {
        expect(checkSourceEvidence({ ...complete, [field]: value }).missing).toContain(field);
      }
    }
    expect(checkSourceEvidence({ ...complete, attribution: "مراجعة عربية سليمة" }).readyForHumanReview).toBe(true);
  });
  it("does not mutate the supplied manifest", () => {
    const before = JSON.stringify(complete);
    checkSourceEvidence(complete);
    expect(JSON.stringify(complete)).toBe(before);
  });
});
