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
  it("rejects loopback and private network source URLs", () => {
    for (const datasetUrl of [
      "https://localhost/data",
      "https://internal.localhost/data",
      "https://127.0.0.1/data",
      "https://10.0.0.1/data",
      "https://172.16.0.1/data",
      "https://192.168.1.2/data",
      "https://169.254.169.254/latest/meta-data",
      "https://[::1]/data",
    ]) {
      expect(checkSourceEvidence({ ...complete, datasetUrl }).missing).toContain("datasetUrl");
    }
  });
  it("does not mutate the supplied manifest", () => {
    const before = JSON.stringify(complete);
    checkSourceEvidence(complete);
    expect(JSON.stringify(complete)).toBe(before);
  });
});
