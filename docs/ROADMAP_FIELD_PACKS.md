# FeeldKit Roadmap Field Packs

This document is the domain-pack inventory roadmap. Product-level direction,
execution phases, and mapping intelligence strategy are defined in:
- `docs/VISION.md`
- `docs/ROADMAP.md`
- `docs/PLAN_MAPPING_INTELLIGENCE_MASTER.md`

## V1 Packs (Engine-Proving Scope)
1. Countries
2. Subdivisions (Netherlands first)
3. Currencies
4. Languages
5. Timezones
6. Employee size bands
7. Revenue bands
8. Funding stages
9. Company type
10. Practical industry overlay
11. Job functions/departments
12. Seniority bands
13. Basic normalized job title map
14. Technology categories
15. Basic technology vendor normalization map
16. Free email providers
17. Role-based email local-parts

### Geo (full V1)

Shipped: ISO-3166-1 countries (keys = lowercase `iso2`), ISO-3166-2 subdivisions, UN region/subregion metadata on country rows, **`geo_continents`** with `country_in_continent` crosswalks, curated region groups (EU, EEA, DACH, OECD, …) with `country_in_region_group` crosswalks, **`standards_telephony`** (`e164_country_calling_codes` + `country_uses_calling_code`), multi official language / multi timezone defaults (v2 JSON + crosswalk `metadata.primary`), lightweight postal regex and address templates. Operator reference: [GEO_PACK.md](GEO_PACK.md).

## V1.5 Packs
1. Metro areas
2. ISO4217 currencies (full coverage beyond seed)
3. ISO639 languages (full coverage beyond seed)
4. IANA timezone list (full coverage beyond seed)
5. BCP47 locales
6. NAICS 2022 full hierarchy
7. SIC hierarchy
8. ISIC Rev.4
9. Industry crosswalks
10. Disposable email domains
11. ESP/MX fingerprints
12. Public Suffix List
13. Social URL patterns and handle validators
14. UTM conventions
15. Top 500 technology/vendor normalization map
16. Intent taxonomy
17. Event taxonomy

## Future Packs
1. Cities
2. Neighborhoods/areas
3. Skills taxonomy
4. Company legal entity types
5. Product categories
6. Buyer personas
7. Marketing channels
8. CRM lifecycle stages
9. Lead source taxonomy
10. Firmographic fields
11. Technographic fields
12. Client-specific custom taxonomies
13. AI-agent-readable field schema packs

## Official Standards Packs
- ISO-3166-1, ISO-3166-2
- ISO4217
- ISO639
- IANA timezones
- BCP47 locales
- NAICS 2022
- SIC
- ISIC Rev.4
- NACE (later)

## Practical Overlays
- practical industry list (30-50 labels)
- practical job function/seniority overlays
- practical technology categories
- intent and event practical taxonomies

## Validation / Parser Packs
- phone metadata (E.164 + formats)
- postal code validation rules
- address format templates
- social URL/handle validators
- UTM validation + parser rules
- domain/root domain parsing helpers

## Normalization Map Packs
- free email providers
- disposable email domains
- role-based local parts
- technology vendor aliases
- job title normalization maps
- LinkedIn industry source map
- ESP/MX fingerprints

## Crosswalk Packs
- NAICS <-> SIC
- NAICS <-> ISIC
- practical industry <-> NAICS/ISIC
- LinkedIn industry -> practical overlay / standards
- country -> currency/language/timezone
- title -> function/seniority

## Full Future Library Notes
- Geo: countries, subdivisions, metros, calling codes, postal formats, address templates, regional/political memberships.
- Standards: currencies, languages, timezones, locales.
- Company basics: employee bands, revenue bands, funding, company/legal forms.
- Industry: official hierarchies + practical overlays + crosswalks.
- Jobs: functions, seniority, normalized titles, optional O*NET/ESCO links.
- Email/domain: free/disposable providers, role-based local parts, MX fingerprints.
- Web identity: PSL, social patterns, handle validators, UTM conventions.
- Tech: categories and vendor/product normalization with detection hints.
- Intent taxonomy: topics, hierarchies, buying-stage signals.
- Event taxonomy: event types, severity, confidence, materiality, lifecycle states.
