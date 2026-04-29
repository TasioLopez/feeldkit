import { describe, expect, it } from "vitest";
import { parseLinkedinIndustryMarkdown } from "../../../scripts/sources/linkedin-industries-source";

describe("linkedin industries parser", () => {
  it("parses active and inactive rows with hierarchy", () => {
    const markdown = `
## Active Nodes
| Industry ID | Label | Hierarchy | Description |
| --- | --- | --- | --- |
| 2190 | Accommodation Services | Accommodation Services | Hotels and lodging |
| 34 | Food and Beverage Services | Accommodation Services &gt; Food and Beverage Services | Restaurants |
## Inactive Nodes
| Industry ID | Label | Hierarchy | Description |
| --- | --- | --- | --- |
| 9999 | Legacy Sector | Legacy Sector | No longer active |
`;
    const rows = parseLinkedinIndustryMarkdown(markdown);
    expect(rows).toHaveLength(3);
    expect(rows[0]?.industryId).toBe(2190);
    expect(rows[1]?.hierarchy).toContain(">");
    expect(rows[2]?.status).toBe("inactive");
  });
});
