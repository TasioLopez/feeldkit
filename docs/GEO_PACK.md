# Geo pack (V1)

Canonical geography for FeeldKit uses **lowercase ISO-3166-1 alpha-2** as the stable `field_values.key` for countries (for example `nl`, `de`). Legacy slug aliases (for example `netherlands`) are kept as **aliases** where useful.

## Field types (pack key `geo`)

| Field type key | Role |
|----------------|------|
| `countries` | Full ISO country list; metadata includes `iso2`, `iso3`, UN `region` / `subregion` strings, `un_region_slug` / `un_subregion_slug`, optional `dial_code` (ISO numeric entity code from the regional dataset, not E.164), and optional `admin1_label_*` from [admin1-labels-by-iso2.json](../src/data/packs/geo/admin1-labels-by-iso2.json). |
| `subdivisions` | ISO 3166-2 principal subdivisions; metadata `country_iso2`, `iso3166_2`, optional `native_name`. |
| `geo_region_groups` | Curated supranational groups (EU, EEA, DACH, OECD, …); see [region-groups.seed.ts](../src/data/packs/geo/region-groups.seed.ts). |
| `geo_continents` | UN statistical macro-regions (Africa, Americas, Asia, Europe, Oceania); see [continents.seed.ts](../src/data/packs/geo/continents.seed.ts). |

## Relationships

- **Country in region group**: `field_crosswalks` with `crosswalk_type = country_in_region_group` from `countries` to `geo_region_groups`. Membership lists live in [region-group-memberships.json](../src/data/packs/geo/region-group-memberships.json) and are expanded at ingest via `buildGeoRegionGroupCrosswalksFromPacks`.
- **Country in continent (UN macro)**: `field_crosswalks` with `crosswalk_type = country_in_continent` from `countries` to `geo_continents`, derived from `metadata.un_region_slug` (or `metadata.region`) via `buildGeoContinentCrosswalksFromPacks`. Country rows still carry `region` / `subregion` strings for convenience; use crosswalks for graph joins when you need a controlled continent value id.
- **Default currency / languages / timezones**: generated from [country-iso2-defaults.json](../src/data/country-iso2-defaults.json) (version 2: `languages[]` and `timezones[]` with optional `primary`) via `buildCountryStandardsCrosswalksFromPacks`. Crosswalk `metadata.primary` mirrors those flags.
- **E.164 calling prefixes**: pack `standards_telephony`, field type `e164_country_calling_codes`; `country_uses_calling_code` crosswalks from `countries` are built via `buildCallingCodeCrosswalksFromPacks` using [e164-dial-by-iso2.json](../src/data/packs/standards/e164-dial-by-iso2.json) (derived from the [country-codes](https://github.com/datasets/country-codes) dataset). Regenerate the dial snapshot with `node scripts/sources/build-e164-dial-snapshot.mjs` when refreshing upstream data.

## Data sources

- Countries: [lukes/ISO-3166-Countries-with-Regional-Codes](https://github.com/lukes/ISO-3166-Countries-with-Regional-Codes) `all.json` (network) with snapshot [iso-3166-countries-with-regional-codes.json](../scripts/sources/snapshots/iso-3166-countries-with-regional-codes.json).
- Subdivisions: [dr5hn/countries-states-cities-database](https://github.com/dr5hn/countries-states-cities-database) `csv/states.csv` snapshot [states.csv](../scripts/sources/snapshots/states.csv).

## Postal and address helpers

- **Postal**: regex map in [postal-patterns.ts](../src/data/generated/postal-patterns.ts) (run `npm run generate:geo`). Not an exhaustive postal gazetteer.
- **Address line templates**: [address-templates.ts](../src/data/generated/address-templates.ts).

## Regenerating assets

After changing snapshots, region memberships, or curated postal/address data in `scripts/generate-geo-assets.ts`:

```bash
npm run generate:geo
```

This refreshes `geo-bundle.json` (used by static `v1`) and the generated TS helpers.

## Political / disputed territories

Follow the ISO-derived datasets above; review `metadata.iso2` / labels before hard-coding business rules that depend on recognition status.
