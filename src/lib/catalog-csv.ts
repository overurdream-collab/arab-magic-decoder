export type CatalogCsvItem = {
  oem_number: string;
  name_ar: string;
  name_en: string;
  category_slug: string;
  alt_numbers: string;
};

export const CATALOG_HEADERS = [
  "oem_number",
  "name_ar",
  "name_en",
  "category_slug",
  "alt_numbers",
] as const;

/** Minimal RFC-4180-compatible parser (quoted delimiters, escaped quotes, newlines). */
export function parseCatalogCsv(csv: string): CatalogCsvItem[] {
  const lines: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let justClosedQuote = false;
  const input = csv.replace(/^\uFEFF/, "");
  if (new TextEncoder().encode(csv).byteLength > 128_000)
    throw new Error("ملف CSV كبير جدًا (الحد 128 كيلوبايت).");
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    if ((code < 32 && code !== 9 && code !== 10 && code !== 13) || code === 127)
      throw new Error("ملف CSV يحتوي على محارف تحكم غير صالحة.");
    // Reject bidi formatting controls that can visually disguise catalog identifiers or names.
    // Keep ordinary Arabic letters, combining marks and directional text intact.
    if ((code >= 0x202a && code <= 0x202e) || (code >= 0x2066 && code <= 0x2069))
      throw new Error("ملف CSV يحتوي على محارف اتجاه نص غير آمنة.");
    // Only a leading UTF-8 BOM is allowed; invisible separators can hide catalog text.
    if (code === 0xfeff || code === 0x200b || code === 0x2060)
      throw new Error("ملف CSV يحتوي على محارف غير مرئية غير آمنة.");
  }
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quoted) {
      if (ch === '"' && input[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
        justClosedQuote = true;
      } else field += ch;
    } else if (ch === '"') {
      if (justClosedQuote) throw new Error("تنسيق علامات الاقتباس في CSV غير صالح.");
      if (field.length) throw new Error("تنسيق علامات الاقتباس في CSV غير صالح.");
      quoted = true;
    } else if (ch === ",") {
      justClosedQuote = false;
      row.push(field.trim());
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      justClosedQuote = false;
      if (ch === "\r" && input[i + 1] === "\n") i++;
      row.push(field.trim());
      field = "";
      if (row.some((x) => x !== "")) lines.push(row);
      row = [];
    } else {
      if (justClosedQuote) throw new Error("نص غير صالح بعد إغلاق علامات الاقتباس في CSV.");
      field += ch;
    }
  }
  if (quoted) throw new Error("حقل CSV يحتوي على علامات اقتباس غير مكتملة.");
  row.push(field.trim());
  if (row.some((x) => x !== "")) lines.push(row);
  const headers = lines.shift()?.map((h) => h.trim());
  if (!headers || CATALOG_HEADERS.some((h) => !headers.includes(h))) {
    throw new Error("أعمدة CSV المطلوبة: " + CATALOG_HEADERS.join(", "));
  }
  if (new Set(headers).size !== headers.length) throw new Error("يوجد عمود CSV مكرر.");
  if (
    headers.length !== CATALOG_HEADERS.length ||
    headers.some((h) => !CATALOG_HEADERS.includes(h as (typeof CATALOG_HEADERS)[number]))
  )
    throw new Error("ملف CSV يحتوي على أعمدة غير معروفة.");
  if (!lines.length || lines.length > 200) throw new Error("يجب أن يحتوي الملف على 1 إلى 200 صف.");
  const seen = new Set<string>();
  return lines.map((values, i) => {
    if (values.length !== headers.length) throw new Error(`عدد الأعمدة غير صحيح في الصف ${i + 2}.`);
    const record = Object.fromEntries(headers.map((h, k) => [h, values[k]]));
    const item = Object.fromEntries(CATALOG_HEADERS.map((h) => [h, record[h]])) as CatalogCsvItem;
    item.oem_number = item.oem_number.toUpperCase();
    if (!/^[A-Z0-9][A-Z0-9._/ -]{1,79}$/.test(item.oem_number))
      throw new Error(`OEM غير صحيح في الصف ${i + 2}.`);
    if (seen.has(item.oem_number)) throw new Error(`رقم OEM مكرر: ${item.oem_number}.`);
    seen.add(item.oem_number);
    // Keep imported display fields safe if later exported to spreadsheet software.
    // Formula prefixes must never be interpreted as executable spreadsheet cells.
    if ([item.name_ar, item.name_en, item.alt_numbers].some((value) => /^[=+@]/.test(value)))
      throw new Error(`صيغة جدول بيانات غير آمنة في الصف ${i + 2}.`);
    if (item.name_ar.length < 2 || item.name_en.length < 2 || !item.category_slug)
      throw new Error(`بيانات ناقصة في الصف ${i + 2}.`);
    // Category identifiers are URL/database slugs, not free-form display names.
    // Reject whitespace, path separators and markup before import or lookup.
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.category_slug))
      throw new Error(`معرّف التصنيف غير صحيح في الصف ${i + 2}.`);
    return item;
  });
}
