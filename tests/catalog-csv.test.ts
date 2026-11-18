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
        header +
          "\nAB123,فلتر زيت,Oil filter,filters,ALT\nab123,فلتر هواء,Air filter,filters,ALT2",
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
