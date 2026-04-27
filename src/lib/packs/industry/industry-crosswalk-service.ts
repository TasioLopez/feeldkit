import { crosswalkLookup } from "@/lib/crosswalk/crosswalk-service";

export async function crosswalkIndustry(code: string) {
  return crosswalkLookup({
    from: "practical_industry",
    to: "practical_industry",
    code,
  });
}
