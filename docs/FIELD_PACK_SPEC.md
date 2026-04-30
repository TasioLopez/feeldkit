# Field Pack Specification

This file defines the contract every FeeldKit field pack must implement.

## Required Pack Metadata
- `key`: stable slug (`geo`, `standards_currencies`, `jobs`, …)
- `name`: human-readable name
- `description`: what the pack solves
- `category`: `taxonomy` | `standards` | `validation` | `normalization_map` | `crosswalk`
- `version`: semantic version string
- `source`: source identifier(s)
- `status`: `active` | `draft` | `deprecated` | `archived`
- `is_public` / `is_system`: visibility and ownership flags

## Field Type Contract
Each pack includes one or more field types with:
- `key`, `name`, `description`, `kind`
- capability flags:
  - `supports_hierarchy`
  - `supports_relationships`
  - `supports_locale`
  - `supports_validation`
  - `supports_crosswalks`
- `metadata_schema` JSON schema-like structure

## Value Contract
Each canonical value requires:
- stable `key`
- canonical `label`
- `normalized_label`
- optional `metadata` (codes, native names, symbols, policy flags)
- optional hierarchy (`parent_id`)
- source/provenance metadata

## Alias Contract
Aliases must include:
- alias text and normalized alias text
- linked canonical value
- confidence score
- source/provenance

## Relationship Contract
Relationships represent directional typed links:
- `from_value_id`, `to_value_id`, `relationship_type`
- optional metadata and confidence

## Crosswalk Contract
Crosswalks map across field types:
- from field type/value
- to field type/value
- `crosswalk_type`
- confidence, metadata, source

## Field Reference Contract
Field references define canonical reuse across packs:
- source field type (consumer context)
- canonical referenced field type
- optional local override policy
- precedence rules (canonical-first unless explicitly overridden)

### `feeldkit.canonical_ref.v1` (stored on `field_types.metadata_schema`)

Use a **versioned** object so ingestion, verification, and resolvers can agree on shape without DB migrations:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `pack_key` | string | yes | Target `field_packs.key` (e.g. `industry`, `geo`, `jobs`). |
| `field_type_key` | string | yes | Target `field_types.key` (e.g. `linkedin_industry_codes`, `countries`). |
| `relationship` | enum | yes | `enum_values` (reuse target value space), `crosswalk`, or `concept_layer`. |
| `transform` | object | no | Hints such as `code_system`, `prefer_metadata_key` for matchers. |

Example (consumer `company_industry` points at LinkedIn industry codes):

```json
{
  "feeldkit.canonical_ref.v1": {
    "pack_key": "industry",
    "field_type_key": "linkedin_industry_codes",
    "relationship": "enum_values"
  }
}
```

**Governance:** optional `feeldkit.metadata_lock` (boolean) on the same `metadata_schema` tells importers not to overwrite operator-edited metadata unless `forceOverwrite` is enabled.

**Normalization:** when `relationship` is `enum_values`, `normalize` resolves the consumer `field_key` to the canonical `field_type_key` for matching, and emits trace (`resolved_via`, `consumer_field_key`, `canonical_field_key`).

**Normalize `context` hints (optional):** `display_language` (BCP47 language subtag or tag), `source_locale`, and `target_locale` bias alias selection for multilingual `field_aliases` rows that carry a `locale`.

## Flow Pack Contract
Flow packs are deterministic mapping profiles for common source/target routes:
- source system identifier and version
- target system identifier and version
- deterministic field/value rules
- conflict/fallback policy
- versioned changelog and provenance

## Validator Contract
Validators are bound to field types and define:
- `rule_type` (regex/context/metadata/custom)
- `pattern` or metadata payload
- rule status and source

## Parser Contract
Parsers are field-type-specific and define:
- `parser_type`
- parser metadata/config
- version/source

## Update Process
1. import or edit pack source
2. run idempotent upsert by stable keys
3. preserve manual overrides unless overwrite flag is set
4. persist `import_sources`
5. create `field_pack_versions` record with changelog and source snapshot
6. run regression tests for normalize/validate/parse/crosswalk outputs

## Quality Requirements
- stable API response fields
- no pack-specific hardcoded DB columns unless globally reusable
- metadata additions must be backward compatible
- confidence thresholds should be tested with representative fixtures
- mapping outputs should include confidence, provenance, and traceability data
