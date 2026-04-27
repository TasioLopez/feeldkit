import { describe, expect, it } from "vitest";
import { validateFieldValue } from "@/lib/validation/validation-service";

describe("validation service", () => {
  it("validates dutch postal code with country context", () => {
    const result = validateFieldValue({
      field_key: "postal_codes",
      value: "3072ZH",
      context: { country: "NL" },
    });
    expect(result.valid).toBe(true);
  });

  it("fails invalid utm keys", () => {
    const result = validateFieldValue({
      field_key: "utm_parameters",
      value: "utm_source=google&utm_bad=x",
    });
    expect(result.valid).toBe(false);
  });
});
