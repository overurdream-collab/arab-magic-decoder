import { decodeVin } from "./vin";

/**
 * Official U.S. NHTSA vPIC decoder (public API). No VIN is stored by Qitaa.
 * A returned make/model is not an authoritative parts fitment assertion.
 */
export type OfficialVinResult = {
  vin: string;
  make: string;
  model: string;
  year: number | null;
  manufacturer: string | null;
  source: "NHTSA vPIC";
  note: string;
};

type VpicEntry = Record<string, unknown>;

const textValue = (row: VpicEntry, key: string): string =>
  typeof row[key] === "string" ? (row[key] as string).trim() : "";

export async function decodeVinOfficial(
  raw: string,
  fetcher: typeof fetch = fetch,
): Promise<OfficialVinResult> {
  const parsed = decodeVin(raw);
  // The local WMI list is incomplete; NHTSA should accept structurally valid
  // VINs even when our preliminary decoder cannot identify the make.
  const vin = raw.trim().toUpperCase();
  if (vin.length !== 17 || /[^A-HJ-NPR-Z0-9]/.test(vin)) {
    throw new Error("رقم الهيكل يجب أن يتكون من 17 خانة صالحة.");
  }
  const endpoint = `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValuesExtended/${encodeURIComponent(vin)}?format=json`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  let response: Response;
  try {
    response = await fetcher(endpoint, { signal: controller.signal });
  } catch {
    throw new Error("تعذّر الاتصال بخدمة التحقق الرسمية. استخدم الاختيار اليدوي.");
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) throw new Error("خدمة التحقق الرسمية غير متاحة حاليًا.");
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error("تعذّر قراءة رد خدمة التحقق الرسمية.");
  }
  if (
    !payload ||
    typeof payload !== "object" ||
    !("Results" in payload) ||
    !Array.isArray(payload.Results) ||
    payload.Results.length !== 1
  ) {
    throw new Error("رد خدمة التحقق الرسمية غير مكتمل.");
  }
  const row = payload.Results[0] as VpicEntry;
  const make = textValue(row, "Make");
  const model = textValue(row, "Model");
  const yearText = textValue(row, "ModelYear");
  const year = /^\d{4}$/.test(yearText) ? Number(yearText) : null;
  const errorCode = textValue(row, "ErrorCode");
  if (
    !make ||
    !model ||
    (errorCode &&
      !errorCode
        .split(",")
        .map((x) => x.trim())
        .includes("0"))
  ) {
    throw new Error("لم تتمكن قاعدة NHTSA من تحديد الماركة والموديل بشكل موثوق.");
  }
  if (year !== null && (year < 1886 || year > new Date().getUTCFullYear() + 2)) {
    throw new Error("سنة الموديل الواردة من المصدر غير صالحة.");
  }
  return {
    vin,
    make,
    model,
    year,
    manufacturer: textValue(row, "Manufacturer") || null,
    source: "NHTSA vPIC",
    note:
      parsed.checkDigitMatches === false
        ? "تحذير: خانة التحقق لا تطابق الحساب القياسي. تحقق من الرقم قبل الشراء."
        : "تحديد السيارة من بيانات السوق الأمريكي فقط؛ لا يثبت توافق قطع الغيار.",
  };
}
