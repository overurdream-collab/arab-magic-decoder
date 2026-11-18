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
      header +
        '\r\nAB123,"فلتر\nزيت",Oil filter,filters,ALT\r\nCD456,فلتر,Filter,filters,ALT2',
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
