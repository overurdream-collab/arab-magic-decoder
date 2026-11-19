import { describe, expect, test } from "bun:test";
import { parseCatalogCsv } from "../src/lib/catalog-csv";

const header = "oem_number,name_ar,name_en,category_slug,alt_numbers";
const valid = 'AB123,"فلتر, زيت",Oil filter,filters,"ALT""123"';

describe("catalog CSV quoted fields", () => {
  test("accepts quoted commas and escaped quotes", () => {
    const items = parseCatalogCsv(header + "\n" + valid);
    expect(items).toHaveLength(1);
    expect(items[0].name_ar).toBe("فلتر, زيت");
    expect(items[0].alt_numbers).toBe('ALT"123');
  });

  test("accepts quoted embedded newlines and CRLF row separators", () => {
    const items = parseCatalogCsv(
      header + '\r\nAB123,"فلتر\nزيت",Oil filter,filters,ALT\r\nCD456,فلتر,Filter,filters,ALT2',
    );
    expect(items).toHaveLength(2);
    expect(items[0].name_ar).toBe("فلتر\nزيت");
  });

  test.each([
    'AB123,"فلتر"x,Oil filter,filters,ALT',
    'AB123,"فلتر" "زيت",Oil filter,filters,ALT',
    'AB123,"فلتر""x,Oil filter,filters,ALT',
    'AB123,"فلتر"\t,Oil filter,filters,ALT',
  ])("rejects malformed quoted fields: %s", (row) => {
    expect(() => parseCatalogCsv(header + "\n" + row)).toThrow();
  });

  test("rejects unterminated quoted fields", () => {
    expect(() => parseCatalogCsv(header + '\nAB123,"فلتر')).toThrow();
  });
});

describe("catalog CSV import boundaries", () => {
  test("accepts a UTF-8 BOM and reordered required columns", () => {
    const items = parseCatalogCsv(
      "\uFEFFname_en,category_slug,alt_numbers,name_ar,oem_number\nOil filter,filters,ALT,فلتر زيت,ab123",
    );
    expect(items).toHaveLength(1);
    expect(items[0].oem_number).toBe("AB123");
    expect(items[0].name_ar).toBe("فلتر زيت");
  });

  test("rejects duplicate OEM numbers regardless of case", () => {
    expect(() =>
      parseCatalogCsv(
        header + "\nAB123,فلتر زيت,Oil filter,filters,ALT\nab123,فلتر هواء,Air filter,filters,ALT2",
      ),
    ).toThrow();
  });

  test("accepts exactly 200 rows and rejects 201", () => {
    const rows = Array.from(
      { length: 201 },
      (_, i) => `OEM${String(i).padStart(4, "0")},فلتر زيت,Oil filter,filters,ALT`,
    );
    expect(parseCatalogCsv(header + "\n" + rows.slice(0, 200).join("\n"))).toHaveLength(200);
    expect(() => parseCatalogCsv(header + "\n" + rows.join("\n"))).toThrow();
  });

  test("rejects duplicate column names and inconsistent row widths", () => {
    expect(() =>
      parseCatalogCsv(header + ",oem_number\nAB123,فلتر زيت,Oil filter,filters,ALT,AB123"),
    ).toThrow();
    expect(() => parseCatalogCsv(header + "\nAB123,فلتر زيت,Oil filter,filters")).toThrow();
  });

  test("rejects inputs above the 128000-character limit", () => {
    expect(() => parseCatalogCsv(header + "\n" + "x".repeat(128001))).toThrow();
  });
});

describe("catalog CSV invalid control bytes", () => {
  test("rejects NUL bytes in catalog fields", () => {
    expect(() =>
      parseCatalogCsv(header + "\nAB123,فلتر\u0000 زيت,Oil filter,filters,ALT"),
    ).toThrow();
  });
});

describe("catalog CSV control character validation", () => {
  test.each([1, 7, 11, 31, 127])("rejects non-text control code %i", (code) => {
    const control = String.fromCharCode(code);
    expect(() =>
      parseCatalogCsv(header + "\nAB123,فلتر" + control + " زيت,Oil filter,filters,ALT"),
    ).toThrow();
  });

  test("permits tabs in quoted text and normal CSV newlines", () => {
    const items = parseCatalogCsv(header + '\nAB123,"فلتر\tزيت",Oil filter,filters,ALT');
    expect(items[0].name_ar).toBe("فلتر\tزيت");
  });
});

describe("catalog CSV bidirectional formatting safety", () => {
  test.each([0x202a, 0x202b, 0x202c, 0x202d, 0x202e, 0x2066, 0x2067, 0x2068, 0x2069])(
    "rejects bidi formatting code point %i",
    (code) => {
      const control = String.fromCharCode(code);
      expect(() =>
        parseCatalogCsv(header + "\nAB123,فلتر" + control + " زيت,Oil filter,filters,ALT"),
      ).toThrow();
    },
  );

  test("preserves normal Arabic text and diacritics", () => {
    const items = parseCatalogCsv(header + "\nAB123,فِلتر زيت,Oil filter,filters,ALT");
    expect(items[0].name_ar).toBe("فِلتر زيت");
  });
});

describe("catalog CSV invisible format safeguards", () => {
  test.each([0xfeff, 0x200b, 0x2060])("rejects embedded invisible code point %i", (code) => {
    const invisible = String.fromCharCode(code);
    expect(() =>
      parseCatalogCsv(header + "\nAB123,فلتر" + invisible + " زيت,Oil filter,filters,ALT"),
    ).toThrow();
  });

  test("still accepts a single BOM at the start of the file", () => {
    const items = parseCatalogCsv("\uFEFF" + header + "\nAB123,فلتر زيت,Oil filter,filters,ALT");
    expect(items[0].oem_number).toBe("AB123");
  });
});
