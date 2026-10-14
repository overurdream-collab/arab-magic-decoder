// Preliminary VIN parsing only. WMI and year codes cannot establish a vehicle's
// model, engine, trim or spare-part compatibility. Confirm against trusted data.
const WMI: Record<string, string> = {
  JT: "Toyota",
  MR0: "Toyota",
  AHT: "Toyota",
  KMH: "Hyundai",
  KM8: "Hyundai",
  KNA: "Kia",
  KND: "Kia",
  JN1: "Nissan",
  JN8: "Nissan",
  JHM: "Honda",
  SHH: "Honda",
  JMB: "Mitsubishi",
  JA3: "Mitsubishi",
  JAL: "Isuzu",
  MPA: "Isuzu",
};

// Model-year codes repeat every 30 years. The 10th character alone is not
// enough to distinguish 1999 from 2029 or 2000 from 2030.
const YEAR_CODES = "ABCDEFGHJKLMNPRSTVWXY123456789";
const TRANSLITERATION: Record<string, number> = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8,
  J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9,
  S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
};
const CHECK_WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2] as const;

export type VinResult = {
  valid: boolean;
  vin: string;
  error?: string;
  make?: string;
  year?: number | undefined;
  yearCandidates?: number[];
  checkDigitMatches?: boolean;
  confidence?: "preliminary";
};

export function vinCheckDigitMatches(vin: string): boolean {
  if (vin.length !== 17 || /[^A-HJ-NPR-Z0-9]/.test(vin)) return false;
  const total = [...vin].reduce((sum, char, index) => {
    const value = /[0-9]/.test(char) ? Number(char) : TRANSLITERATION[char];
    return sum + (value ?? 0) * (CHECK_WEIGHTS[index] ?? 0);
  }, 0);
  const expected = total % 11 === 10 ? "X" : String(total % 11);
  return vin[8] === expected;
}

export function decodeVin(raw: string): VinResult {
  const vin = raw.trim().toUpperCase();
  if (vin.length !== 17) return { valid: false, vin, error: "رقم الهيكل يجب أن يكون 17 خانة" };
  if (/[^A-HJ-NPR-Z0-9]/.test(vin)) {
    return { valid: false, vin, error: "رقم الهيكل يحتوي حروفًا غير مسموحة" };
  }

  const make = WMI[vin.slice(0, 3)] ?? WMI[vin.slice(0, 2)];
  const index = YEAR_CODES.indexOf(vin[9] ?? "");
  const yearCandidates = index < 0
    ? []
    : [1980 + index, 2010 + index, 2040 + index].filter(
        (year) => year <= new Date().getFullYear() + 1,
      );

  if (!make) {
    return {
      valid: false,
      vin,
      yearCandidates,
      error: "لم نتعرف على الشركة المصنّعة — استخدم البحث اليدوي",
    };
  }

  return {
    valid: true,
    vin,
    make,
    yearCandidates,
    // The year code repeats. Do not silently guess which 30-year cycle applies.
    year: yearCandidates.length === 1 ? yearCandidates[0] : undefined,
    checkDigitMatches: vinCheckDigitMatches(vin),
    confidence: "preliminary",
  };
}
