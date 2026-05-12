import { normalizeText } from "@/lib/matching/normalize-text";
import type { FieldAlias, FieldCrosswalk, FieldPack, FieldType, FieldValue } from "@/lib/domain/types";
import { buildCanonicalRefV1 } from "@/lib/domain/canonical-ref";
import type { SeedPack } from "@/data/packs/types";
import type { SeedCrosswalk } from "@/data/seed-crosswalks";
import geoBundle from "./generated/geo-bundle.json";
import { buildCallingCodeCrosswalksFromPacks } from "@/lib/ingestion/build-calling-code-crosswalks";
import { buildCountryStandardsCrosswalksFromPacks } from "@/lib/ingestion/build-country-standards-crosswalks";
import { buildGeoContinentCrosswalksFromPacks } from "@/lib/ingestion/build-geo-continent-crosswalks";
import { buildGeoRegionGroupCrosswalksFromPacks } from "@/lib/ingestion/build-geo-region-group-crosswalks";
import { loadCountryDefaultsV2 } from "@/lib/ingestion/country-defaults-data";
import { ianaTimezoneValueKey } from "@/lib/geo/iana-timezone-key";

const pack = (overrides: Partial<FieldPack>): FieldPack => ({
  id: crypto.randomUUID(),
  key: "unknown",
  name: "Unknown",
  description: "",
  category: "taxonomy",
  status: "active",
  version: "1.0.0",
  sourceType: "hybrid",
  isPublic: true,
  isSystem: true,
  metadata: {},
  ...overrides,
});

const fieldType = (packId: string, overrides: Partial<FieldType>): FieldType => ({
  id: crypto.randomUUID(),
  fieldPackId: packId,
  key: "unknown",
  name: "Unknown",
  description: "",
  kind: "taxonomy",
  status: "active",
  isPublic: true,
  supportsHierarchy: false,
  supportsRelationships: false,
  supportsLocale: false,
  supportsValidation: false,
  supportsCrosswalks: false,
  metadataSchema: {},
  ...overrides,
});

const value = (fieldTypeId: string, key: string, label: string, metadata: Record<string, unknown> = {}): FieldValue => ({
  id: crypto.randomUUID(),
  fieldTypeId,
  key,
  label,
  normalizedLabel: normalizeText(label),
  locale: null,
  description: null,
  parentId: null,
  sortOrder: 0,
  status: "active",
  metadata,
  source: "seed",
  sourceId: null,
});

const alias = (fieldTypeId: string, fieldValueId: string, text: string, confidence = 0.95): FieldAlias => ({
  id: crypto.randomUUID(),
  fieldTypeId,
  fieldValueId,
  alias: text,
  normalizedAlias: normalizeText(text),
  locale: null,
  source: "seed",
  confidence,
  status: "active",
});

const geoPack = pack({
  key: "geo",
  name: "Geo",
  description: "Countries, subdivisions and timezone references.",
  category: "standards",
});
const companyPack = pack({
  key: "company",
  name: "Company Basics",
  description: "Core company field standards.",
  category: "taxonomy",
});
const jobsPack = pack({
  key: "jobs",
  name: "Jobs",
  description: "Functions, seniority bands and title normalization.",
  category: "taxonomy",
});
const standardsCurrenciesPack = pack({
  key: "standards_currencies",
  name: "Currencies",
  description: "ISO currency codes and overlays.",
  category: "standards",
});
const standardsLanguagesPack = pack({
  key: "standards_languages",
  name: "Standards — Languages",
  description: "BCP47-first language tags and aliases.",
  category: "standards",
});
const standardsTimezonesPack = pack({
  key: "standards_timezones",
  name: "Timezones",
  description: "IANA time zones.",
  category: "standards",
});
const standardsTelephonyPack = pack({
  key: "standards_telephony",
  name: "Telephony",
  description: "E.164 country calling prefixes.",
  category: "standards",
});
const emailPack = pack({
  key: "email_domain",
  name: "Email and Domain",
  description: "Free provider and role-based local part maps.",
  category: "normalization_map",
});
const industryPack = pack({
  key: "industry",
  name: "Industry",
  description: "Practical industry overlay.",
  category: "taxonomy",
});
const techPack = pack({
  key: "tech",
  name: "Technology",
  description: "Technology categories and vendor map.",
  category: "normalization_map",
});

export const fieldPacks: FieldPack[] = [
  geoPack,
  companyPack,
  jobsPack,
  standardsCurrenciesPack,
  standardsLanguagesPack,
  standardsTimezonesPack,
  standardsTelephonyPack,
  emailPack,
  industryPack,
  techPack,
];

const countriesType = fieldType(geoPack.id, {
  key: "countries",
  name: "Countries",
  kind: "reference",
  supportsCrosswalks: true,
});
const subdivisionsType = fieldType(geoPack.id, { key: "subdivisions", name: "Subdivisions", kind: "reference", supportsHierarchy: true });
const geoRegionGroupsType = fieldType(geoPack.id, {
  key: "geo_region_groups",
  name: "Geo region groups",
  kind: "reference",
  supportsCrosswalks: true,
});
const geoContinentsType = fieldType(geoPack.id, {
  key: "geo_continents",
  name: "Geo continents (UN macro regions)",
  kind: "reference",
  supportsCrosswalks: true,
});
const currenciesType = fieldType(standardsCurrenciesPack.id, { key: "currencies", name: "Currencies", kind: "reference" });
const languagesType = fieldType(standardsLanguagesPack.id, {
  key: "languages",
  name: "Languages",
  kind: "reference",
  supportsLocale: true,
});
const timezoneType = fieldType(standardsTimezonesPack.id, { key: "timezones", name: "Timezones", kind: "reference" });
const e164CallingCodesType = fieldType(standardsTelephonyPack.id, {
  key: "e164_country_calling_codes",
  name: "E.164 country calling codes",
  kind: "reference",
  supportsCrosswalks: true,
});
const employeeBandType = fieldType(companyPack.id, { key: "employee_size_bands", name: "Employee Size Bands", supportsValidation: true });
const revenueBandType = fieldType(companyPack.id, { key: "revenue_bands", name: "Revenue Bands", supportsValidation: true });
const fundingStageType = fieldType(companyPack.id, { key: "funding_stages", name: "Funding Stages" });
const companyTypeType = fieldType(companyPack.id, { key: "company_types", name: "Company Types" });
const companyIndustryConsumerType = fieldType(companyPack.id, {
  key: "company_industry",
  name: "Company industry (consumer)",
  metadataSchema: buildCanonicalRefV1({
    pack_key: "industry",
    field_type_key: "linkedin_industry_codes",
    relationship: "enum_values",
  }),
});
const companyCountryConsumerType = fieldType(companyPack.id, {
  key: "company_country",
  name: "Company country (consumer)",
  metadataSchema: buildCanonicalRefV1({
    pack_key: "geo",
    field_type_key: "countries",
    relationship: "enum_values",
  }),
});
const companyHeadcountConsumerType = fieldType(companyPack.id, {
  key: "company_employee_size_band",
  name: "Company employee size (consumer)",
  metadataSchema: buildCanonicalRefV1({
    pack_key: "jobs",
    field_type_key: "company_headcounts",
    relationship: "enum_values",
  }),
});
const jobFunctionType = fieldType(jobsPack.id, { key: "job_functions", name: "Job Functions" });
const companyHeadcountsType = fieldType(jobsPack.id, { key: "company_headcounts", name: "Company Headcounts" });
const seniorityType = fieldType(jobsPack.id, { key: "seniority_bands", name: "Seniority Bands" });
const normalizedTitleType = fieldType(jobsPack.id, { key: "normalized_job_titles", name: "Normalized Job Titles", supportsCrosswalks: true });
const industryType = fieldType(industryPack.id, { key: "practical_industry", name: "Practical Industry", supportsCrosswalks: true });
const linkedinIndustryType = fieldType(industryPack.id, {
  key: "linkedin_industry_codes",
  name: "LinkedIn industry codes",
  supportsCrosswalks: true,
});
const techCategoryType = fieldType(techPack.id, { key: "technology_categories", name: "Technology Categories" });
const techVendorType = fieldType(techPack.id, { key: "technology_vendors", name: "Technology Vendors", supportsCrosswalks: true });
const freeEmailType = fieldType(emailPack.id, { key: "free_email_providers", name: "Free Email Providers", kind: "map" });
const roleBasedType = fieldType(emailPack.id, { key: "role_based_local_parts", name: "Role-based Email Local Parts", kind: "map" });

export const fieldTypes: FieldType[] = [
  countriesType,
  subdivisionsType,
  geoRegionGroupsType,
  geoContinentsType,
  currenciesType,
  languagesType,
  timezoneType,
  e164CallingCodesType,
  employeeBandType,
  revenueBandType,
  fundingStageType,
  companyTypeType,
  companyIndustryConsumerType,
  companyCountryConsumerType,
  companyHeadcountConsumerType,
  jobFunctionType,
  companyHeadcountsType,
  seniorityType,
  normalizedTitleType,
  industryType,
  linkedinIndustryType,
  techCategoryType,
  techVendorType,
  freeEmailType,
  roleBasedType,
];

const geoCountryValues = geoBundle.countries.map((entry) =>
  value(countriesType.id, entry.key, entry.label, (entry.metadata ?? {}) as Record<string, unknown>),
);
const geoSubdivisionValues = geoBundle.subdivisions.map((entry) =>
  value(subdivisionsType.id, entry.key, entry.label, (entry.metadata ?? {}) as Record<string, unknown>),
);
const geoRegionGroupValues = geoBundle.region_groups.map((entry) =>
  value(geoRegionGroupsType.id, entry.key, entry.label, (entry.metadata ?? {}) as Record<string, unknown>),
);
const geoContinentValues = (
  (geoBundle as { continents?: Array<{ key: string; label: string; aliases?: string[]; metadata?: Record<string, unknown> }> })
    .continents ?? []
).map((entry) => value(geoContinentsType.id, entry.key, entry.label, (entry.metadata ?? {}) as Record<string, unknown>));
const geoCallingCodeValues = (
  (geoBundle as { calling_codes?: Array<{ key: string; label: string; aliases?: string[]; metadata?: Record<string, unknown> }> })
    .calling_codes ?? []
).map((entry) => value(e164CallingCodesType.id, entry.key, entry.label, (entry.metadata ?? {}) as Record<string, unknown>));

const staticPacksForCrosswalks: SeedPack[] = [
  {
    key: "geo",
    name: "Geo",
    version: "1.0.0",
    source: "geo-bundle",
    fieldTypes: [
      {
        key: "countries",
        name: "Countries",
        values: geoBundle.countries as import("@/data/packs/types").SeedValue[],
      },
      {
        key: "geo_continents",
        name: "Geo continents",
        values: (geoBundle as { continents: import("@/data/packs/types").SeedValue[] }).continents ?? [],
      },
      {
        key: "geo_region_groups",
        name: "Geo region groups",
        values: geoBundle.region_groups as import("@/data/packs/types").SeedValue[],
      },
    ],
  },
  {
    key: "standards_telephony",
    name: "Telephony",
    version: "1.0.0",
    source: "geo-bundle",
    fieldTypes: [
      {
        key: "e164_country_calling_codes",
        name: "E.164 country calling codes",
        values: (geoBundle as { calling_codes: import("@/data/packs/types").SeedValue[] }).calling_codes ?? [],
      },
    ],
  },
];

const countryStandardSeeds = buildCountryStandardsCrosswalksFromPacks(staticPacksForCrosswalks);

const extraCurrencyKeys = new Set<string>();
const extraLangKeys = new Set<string>();
const extraTzKeys = new Set<string>();
for (const cw of countryStandardSeeds) {
  if (cw.toFieldTypeKey === "currencies") extraCurrencyKeys.add(cw.toValueKey);
  if (cw.toFieldTypeKey === "languages") extraLangKeys.add(cw.toValueKey);
  if (cw.toFieldTypeKey === "timezones") extraTzKeys.add(cw.toValueKey);
}
const baseCurrencies = new Set(["eur", "usd"]);
const baseLangs = new Set(["nl", "en"]);
const baseTzs = new Set(["europe-amsterdam", "america-toronto", "utc"]);

const countryDefaults = loadCountryDefaultsV2();
const ianaByTzKey = new Map<string, string>();
for (const row of Object.values(countryDefaults)) {
  for (const tz of row.timezones ?? []) {
    if (tz.iana) ianaByTzKey.set(ianaTimezoneValueKey(tz.iana), tz.iana);
  }
}

const enLangNames = new Intl.DisplayNames(["en"], { type: "language" });

function extraCurrencyFieldValues(): FieldValue[] {
  const out: FieldValue[] = [];
  for (const k of extraCurrencyKeys) {
    if (baseCurrencies.has(k)) continue;
    const code = k.toUpperCase();
    out.push(value(currenciesType.id, k, code, { code, symbol: code, decimals: 2 }));
  }
  return out;
}

function extraLanguageFieldValues(): FieldValue[] {
  const out: FieldValue[] = [];
  for (const k of extraLangKeys) {
    if (baseLangs.has(k)) continue;
    const label = enLangNames.of(k) ?? k;
    out.push(
      value(languagesType.id, k, label, {
        iso639_1: k.length === 2 ? k : null,
        bcp47: k,
      }),
    );
  }
  return out;
}

function extraTimezoneFieldValues(): FieldValue[] {
  const out: FieldValue[] = [];
  for (const k of extraTzKeys) {
    if (baseTzs.has(k)) continue;
    const iana = ianaByTzKey.get(k) ?? k.replace(/-/g, "/");
    out.push(value(timezoneType.id, k, iana, { iana, dst: false }));
  }
  return out;
}

export const fieldValues: FieldValue[] = [
  ...geoCountryValues,
  ...geoSubdivisionValues,
  ...geoRegionGroupValues,
  ...geoContinentValues,
  ...geoCallingCodeValues,
  value(currenciesType.id, "eur", "Euro", { code: "EUR", symbol: "EUR", decimals: 2 }),
  value(currenciesType.id, "usd", "US Dollar", { code: "USD", symbol: "$", decimals: 2 }),
  ...extraCurrencyFieldValues(),
  value(languagesType.id, "nl", "Dutch", { iso639_1: "nl", native_name: "Nederlands" }),
  value(languagesType.id, "en", "English", { iso639_1: "en", native_name: "English" }),
  ...extraLanguageFieldValues(),
  value(timezoneType.id, "utc", "UTC", { iana: "UTC", dst: false }),
  value(timezoneType.id, "europe-amsterdam", "Europe/Amsterdam", { iana: "Europe/Amsterdam", dst: true }),
  value(timezoneType.id, "america-toronto", "America/Toronto", { iana: "America/Toronto", dst: true }),
  ...extraTimezoneFieldValues(),
  value(employeeBandType.id, "1-10", "1-10"),
  value(employeeBandType.id, "11-50", "11-50"),
  value(employeeBandType.id, "51-200", "51-200"),
  value(revenueBandType.id, "0-1m-usd", "$0-$1M", { min: 0, max: 1000000, currency: "USD" }),
  value(revenueBandType.id, "1m-10m-usd", "$1M-$10M", { min: 1000000, max: 10000000, currency: "USD" }),
  value(fundingStageType.id, "seed", "Seed"),
  value(fundingStageType.id, "series-a", "Series A"),
  value(companyTypeType.id, "private", "Private"),
  value(companyTypeType.id, "public", "Public"),
  value(jobFunctionType.id, "engineering", "Engineering"),
  value(jobFunctionType.id, "sales", "Sales"),
  value(seniorityType.id, "ic", "IC"),
  value(seniorityType.id, "vp", "VP"),
  value(normalizedTitleType.id, "vp-engineering", "VP of Engineering"),
  value(normalizedTitleType.id, "sales-representative", "Sales Representative"),
  value(industryType.id, "saas", "SaaS"),
  value(industryType.id, "fintech", "FinTech"),
  value(linkedinIndustryType.id, "computer-software", "Computer Software", { source_standard: "linkedin_v2" }),
  value(companyHeadcountsType.id, "11-50", "11-50", { source_standard: "search_leads_openapi" }),
  value(companyHeadcountsType.id, "51-200", "51-200", { source_standard: "search_leads_openapi" }),
  value(techCategoryType.id, "analytics", "Analytics"),
  value(techCategoryType.id, "crm", "CRM"),
  value(techVendorType.id, "google-analytics", "Google Analytics"),
  value(techVendorType.id, "hubspot", "HubSpot"),
  value(freeEmailType.id, "gmail-com", "gmail.com"),
  value(freeEmailType.id, "outlook-com", "outlook.com"),
  value(roleBasedType.id, "info", "info"),
  value(roleBasedType.id, "support", "support"),
];

const valueByKey = new Map(fieldValues.map((entry) => [`${entry.fieldTypeId}:${entry.key}`, entry]));

const getValue = (fieldTypeId: string, key: string): FieldValue => {
  const found = valueByKey.get(`${fieldTypeId}:${key}`);
  if (!found) {
    throw new Error(`Missing seed value ${fieldTypeId}:${key}`);
  }
  return found;
};

function buildGeoAliasesFromBundle(): FieldAlias[] {
  const rows: FieldAlias[] = [];
  for (const c of geoBundle.countries) {
    const vid = valueByKey.get(`${countriesType.id}:${c.key}`)?.id;
    if (!vid) continue;
    for (const a of c.aliases ?? []) {
      const t = a.trim();
      if (!t || normalizeText(t) === normalizeText(c.label) || normalizeText(t) === normalizeText(c.key)) continue;
      rows.push(alias(countriesType.id, vid, t, 0.92));
    }
  }
  for (const s of geoBundle.subdivisions) {
    const vid = valueByKey.get(`${subdivisionsType.id}:${s.key}`)?.id;
    if (!vid) continue;
    for (const a of s.aliases ?? []) {
      const t = a.trim();
      if (!t || normalizeText(t) === normalizeText(s.label) || normalizeText(t) === normalizeText(s.key)) continue;
      rows.push(alias(subdivisionsType.id, vid, t, 0.9));
    }
  }
  return rows;
}

const typeIdByKey = new Map(fieldTypes.map((entry) => [entry.key, entry.id]));

function materializeSeedCrosswalkRows(rows: SeedCrosswalk[]): FieldCrosswalk[] {
  const out: FieldCrosswalk[] = [];
  for (const cw of rows) {
    const fromT = typeIdByKey.get(cw.fromFieldTypeKey);
    const toT = typeIdByKey.get(cw.toFieldTypeKey);
    if (!fromT || !toT) continue;
    const fromV = valueByKey.get(`${fromT}:${cw.fromValueKey}`);
    const toV = valueByKey.get(`${toT}:${cw.toValueKey}`);
    if (!fromV || !toV) continue;
    out.push({
      id: crypto.randomUUID(),
      fromFieldTypeId: fromT,
      fromValueId: fromV.id,
      toFieldTypeId: toT,
      toValueId: toV.id,
      crosswalkType: cw.crosswalkType,
      confidence: cw.confidence,
      source: cw.source ?? "seed",
      metadata: cw.metadata ?? {},
    });
  }
  return out;
}

function materializeGeoRegionCrosswalks(): FieldCrosswalk[] {
  return materializeSeedCrosswalkRows(buildGeoRegionGroupCrosswalksFromPacks());
}

export const fieldAliases: FieldAlias[] = [
  ...buildGeoAliasesFromBundle(),
  alias(currenciesType.id, getValue(currenciesType.id, "eur").id, "€"),
  alias(languagesType.id, getValue(languagesType.id, "nl").id, "NL"),
  alias(languagesType.id, getValue(languagesType.id, "en").id, "English", 0.95),
  alias(languagesType.id, getValue(languagesType.id, "en").id, "Eng", 0.9),
  alias(languagesType.id, getValue(languagesType.id, "en").id, "en", 0.99),
  alias(linkedinIndustryType.id, getValue(linkedinIndustryType.id, "computer-software").id, "Software", 0.95),
  alias(employeeBandType.id, getValue(employeeBandType.id, "11-50").id, "11-50 employees"),
  alias(fundingStageType.id, getValue(fundingStageType.id, "series-a").id, "SeriesA"),
  alias(normalizedTitleType.id, getValue(normalizedTitleType.id, "vp-engineering").id, "VP Eng"),
  alias(normalizedTitleType.id, getValue(normalizedTitleType.id, "sales-representative").id, "sales guy", 0.66),
  alias(techVendorType.id, getValue(techVendorType.id, "google-analytics").id, "GA4"),
  alias(techVendorType.id, getValue(techVendorType.id, "google-analytics").id, "Google Analytics 4"),
];

export const fieldCrosswalks: FieldCrosswalk[] = [
  ...materializeSeedCrosswalkRows(countryStandardSeeds),
  ...materializeSeedCrosswalkRows(buildGeoContinentCrosswalksFromPacks(staticPacksForCrosswalks)),
  ...materializeSeedCrosswalkRows(buildCallingCodeCrosswalksFromPacks(staticPacksForCrosswalks)),
  ...materializeGeoRegionCrosswalks(),
  {
    id: crypto.randomUUID(),
    fromFieldTypeId: normalizedTitleType.id,
    fromValueId: getValue(normalizedTitleType.id, "vp-engineering").id,
    toFieldTypeId: jobFunctionType.id,
    toValueId: getValue(jobFunctionType.id, "engineering").id,
    crosswalkType: "title_to_function",
    confidence: 0.92,
    source: "seed",
    metadata: {},
  },
  {
    id: crypto.randomUUID(),
    fromFieldTypeId: normalizedTitleType.id,
    fromValueId: getValue(normalizedTitleType.id, "vp-engineering").id,
    toFieldTypeId: seniorityType.id,
    toValueId: getValue(seniorityType.id, "vp").id,
    crosswalkType: "title_to_seniority",
    confidence: 0.96,
    source: "seed",
    metadata: {},
  },
];
