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
  const input = csv.replace(/^\uFEFF/, "");
  if (input.length > 128_000) throw new Error("ملف CSV كبير جدًا (الحد 128 كيلوبايت).");
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quoted) {
      if (ch === '"' && input[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') {
      if (field.length) throw new Error("تنسيق علامات الاقتباس في CSV غير صالح.");
      quoted = true;
    } else if (ch === ",") {
      row.push(field.trim());
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && input[i + 1] === "\n") i++;
      row.push(field.trim());
      field = "";
      if (row.some((x) => x !== "")) lines.push(row);
      row = [];
    } else field += ch;
  }
  if (quoted) throw new Error("حقل CSV يحتوي على علامات اقتباس غير مكتملة.");
  row.push(field.trim());
  if (row.some((x) => x !== "")) lines.push(row);
  const headers = lines.shift()?.map((h) => h.trim());
  if (!headers || CATALOG_HEADERS.some((h) => !headers.includes(h))) {
    throw new Error("أعمدة CSV المطلوبة: " + CATALOG_HEADERS.join(", "));
  }
  if (new Set(headers).size !== headers.length) throw new Error("يوجد عمود CSV مكرر.");
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
    if (item.name_ar.length < 2 || item.name_en.length < 2 || !item.category_slug)
      throw new Error(`بيانات ناقصة في الصف ${i + 2}.`);
    return item;
  });
}
