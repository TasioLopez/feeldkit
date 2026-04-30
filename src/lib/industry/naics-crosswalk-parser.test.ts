import { describe, expect, it } from "vitest";
import { assertLinkedinNaicsParseQuality, parseLinkedinNaicsMarkdown } from "../../../scripts/sources/industry-naics-crosswalk-source";

describe("linkedin-naics parser", () => {
  it("parses linkedin to naics markdown table rows", () => {
    const markdown = `
| LinkedIn Industry ID | LinkedIn Industry | NAICS code | NAICS title |
| --- | --- | --- | --- |
| 2190 | Accommodation Services | 721110 | Hotels (except casino hotels) and motels |
| 34 | Food and Beverage Services | 722513 | Limited-service restaurants |
`;
    const parsed = parseLinkedinNaicsMarkdown(markdown);
    expect(parsed).toHaveLength(2);
    expect(parsed[0]?.linkedinIndustryId).toBe("2190");
    expect(parsed[0]?.naicsCode).toBe("721110");
  });

  it("fails quality checks when header is missing", () => {
    const markdown = `
| Industry ID | Industry | NAICS | Title |
| --- | --- | --- | --- |
| 2190 | Accommodation Services | 721110 | Hotels |
`;
    const parsed = parseLinkedinNaicsMarkdown(markdown);
    expect(() => assertLinkedinNaicsParseQuality(markdown, parsed, 1)).toThrow("missing linkedin industry id header");
  });

  it("fails quality checks when parsed rows are below minimum", () => {
    const markdown = `
| LinkedIn Industry ID | LinkedIn Industry | NAICS code | NAICS title |
| --- | --- | --- | --- |
| 2190 | Accommodation Services | 721110 | Hotels |
`;
    const parsed = parseLinkedinNaicsMarkdown(markdown);
    expect(() => assertLinkedinNaicsParseQuality(markdown, parsed, 2)).toThrow("parsed_rows_below_minimum");
  });
});
