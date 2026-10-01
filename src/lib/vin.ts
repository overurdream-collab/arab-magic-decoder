const WMI: Record<string, string> = {
  JT: "Toyota", MR0: "Toyota", AHT: "Toyota",
  KMH: "Hyundai", KM8: "Hyundai",
  KNA: "Kia", KND: "Kia",
  JN1: "Nissan", JN8: "Nissan",
  JHM: "Honda", SHH: "Honda",
  JMB: "Mitsubishi", JA3: "Mitsubishi",
  JAL: "Isuzu", MPA: "Isuzu",
};
const YEARS = "ABCDEFGHJKLMNPRSTVWXY123456789";

export type VinResult = { valid: boolean; error?: string | undefined; make?: string | undefined; year?: number | undefined; vin: string };

export function decodeVin(raw: string): VinResult {
  const vin = raw.trim().toUpperCase();
  if (vin.length !== 17) return { valid: false, vin, error: "رقم الهيكل يجب أن يكون 17 خانة" };
  if (/[IOQ]/.test(vin) || !/^[A-Z0-9]+$/.test(vin))
    return { valid: false, vin, error: "رقم الهيكل يحتوي حروفًا غير مسموحة" };
  const make = WMI[vin.slice(0, 3)] ?? WMI[vin.slice(0, 2)];
  const idx = YEARS.indexOf(vin[9] ?? "");
  let year: number | undefined;
  if (idx >= 0) {
    year = 2010 + idx;
    if (year > new Date().getFullYear() + 1) year -= 30;
  }
  if (!make) return { valid: false, vin, year, error: "لم نتعرف على الشركة المصنّعة — استخدم البحث اليدوي" };
  return { valid: true, vin, make, year };
}
