/**
 * Offline source-evidence gate. Passing this check permits human review only:
 * it never approves redistribution, fitment, or a production import.
 */
export type SourceEvidence = {
  datasetUrl: string;
  version: string;
  termsUrl: string;
  attribution: string;
  retrievedAt: string;
  sha256: string;
  yearMeaning: "model_year" | "registration_year" | "catalog_presence";
  rightsReviewed: boolean;
  reviewedBy: string;
};

export function checkSourceEvidence(value: unknown): {
  readyForHumanReview: boolean;
  missing: string[];
} {
  const missing: string[] = [];
  if (!value || typeof value !== "object" || Array.isArray(value))
    return { readyForHumanReview: false, missing: ["source evidence object"] };
  const v = value as Record<string, unknown>;
  const text = (key: string) =>
    typeof v[key] === "string" && v[key].trim().length > 0 && v[key].length <= 2048;
  const https = (key: string) => {
    if (!text(key)) return false;
    // WHATWG URL parsing silently strips tabs/newlines and trims whitespace.
    // Preserve provenance exactly as submitted rather than accepting a rewritten URL.
    const raw = v[key] as string;
    if (\n      /\s/u.test(raw) ||\n      Array.from(raw).some((char) => char.charCodeAt(0) <= 31 || char.charCodeAt(0) === 127)\n    )\n      return false;
    try {
      const url = new URL(raw);
      // DNS names are case-insensitive; a trailing root dot must not bypass local-name checks.
      const host = url.hostname.toLowerCase().replace(/\.+$/, "");
      // Offline provenance metadata does not need literal IPv6 hosts. Reject all
      // IPv6 literals, including IPv4-mapped forms that bypass IPv4 checks.
      if (host.startsWith("[") && host.endsWith("]")) return false;
      // Source evidence is metadata, not a network fetch target. Numeric IPv4
      // hosts are unnecessary here; reject every literal, including CGNAT,
      // benchmarking, multicast and other non-public ranges.
      if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(host)) return false;
      // A single-label DNS name commonly resolves through private search domains.
      // Provenance links must use an explicit multi-label HTTPS hostname.
      if (!host.includes(".")) return false;
      const localHost =
        host === "localhost" ||
        host.endsWith(".localhost") ||
        host === "local" ||
        host.endsWith(".local") ||
        host === "internal" ||
        host.endsWith(".internal") ||
        host === "home.arpa" ||
        host.endsWith(".home.arpa") ||
        host === "[::1]" ||
        host.startsWith("[fc") ||
        host.startsWith("[fd") ||
        host.startsWith("[fe80:");
      return (
        url.protocol === "https:" && Boolean(host) && !url.username && !url.password && !localHost
      );
    } catch {
      return false;
    }
  };
  if (!https("datasetUrl")) missing.push("datasetUrl");
  if (!https("termsUrl")) missing.push("termsUrl");
  for (const key of ["version", "attribution", "reviewedBy"]) if (!text(key)) missing.push(key);
  if (!text("sha256") || !/^[a-f0-9]{64}$/i.test(v["sha256"] as string)) missing.push("sha256");
  const retrievedAt = v["retrievedAt"];
  const dateParts =
    typeof retrievedAt === "string" ? /^(\d{4})-(\d{2})-(\d{2})T/.exec(retrievedAt) : null;
  // Date.UTC maps years 00–99 to 1900–1999; setUTCFullYear preserves the stated year.
  const calendarDate = new Date(0);
  if (dateParts) {
    calendarDate.setUTCFullYear(
      Number(dateParts[1]),
      Number(dateParts[2]) - 1,
      Number(dateParts[3]),
    );
  }
  const validCalendarDate = Boolean(
    dateParts &&
    Number(dateParts[2]) >= 1 &&
    Number(dateParts[2]) <= 12 &&
    Number(dateParts[3]) >= 1 &&
    Number(dateParts[3]) <= 31 &&
    calendarDate.toISOString().slice(0, 10) === `${dateParts[1]}-${dateParts[2]}-${dateParts[3]}`,
  );
  if (
    !validCalendarDate ||
    !text("retrievedAt") ||
    !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?Z$/.test(
      v["retrievedAt"] as string,
    ) ||
    !Number.isFinite(Date.parse(v["retrievedAt"] as string)) ||
    Date.parse(v["retrievedAt"] as string) > Date.now()
  )
    missing.push("retrievedAt");
  if (!["model_year", "registration_year", "catalog_presence"].includes(v["yearMeaning"] as string))
    missing.push("yearMeaning");
  if (v["rightsReviewed"] !== true) missing.push("rightsReviewed");
  return { readyForHumanReview: missing.length === 0, missing };
}
