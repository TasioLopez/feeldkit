# Field Pack Specification

This file defines the contract every FeeldKit field pack must implement.

## Required Pack Metadata
- `key`: stable slug (`geo`, `standards`, `jobs`)
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
