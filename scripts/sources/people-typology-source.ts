import type { SeedFieldType, SeedPack, SeedValue } from "../../src/data/packs/types";
import { toDeterministicKey, uniqueByKey, validateSeedValues } from "./utils";

const FUNCTIONS = [
  "Accounting",
  "Administrative",
  "Arts and Design",
  "Business Development",
  "Community and Social Services",
  "Consulting",
  "Education",
  "Engineering",
  "Entrepreneurship",
  "Finance",
  "Healthcare Services",
  "Human Resources",
  "Information Technology",
  "Legal",
  "Marketing",
  "Media and Communication",
  "Military and Protective Services",
  "Operations",
  "Product Management",
  "Program and Project Management",
  "Purchasing",
  "Quality Assurance",
  "Real Estate",
  "Research",
  "Sales",
  "Customer Success and Support",
] as const;

const SENIORITY_LEVELS = [
  "Owner/Partner",
  "CXO",
  "Vice President",
  "Director",
  "Experienced Manager",
  "Entry Level Manager",
  "Strategic",
  "Senior",
  "Entry Level",
  "In Training",
] as const;

const EXPERIENCE_BANDS = [
  "Less than 1 year",
  "1 to 2 years",
  "3 to 5 years",
  "6 to 10 years",
  "More than 10 years",
] as const;

const PROFILE_LANGUAGES = [
  "Arabic",
  "English",
  "Spanish",
  "Portuguese",
  "Chinese",
  "French",
  "Italian",
  "Russian",
  "German",
  "Dutch",
  "Turkish",
  "Tagalog",
  "Polish",
  "Korean",
  "Japanese",
  "Malay",
  "Norwegian",
  "Danish",
  "Romanian",
  "Swedish",
  "Bahasa Indonesia",
  "Czech",
] as const;

const COMPANY_HEADCOUNTS = [
  "Self-employed",
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "501-1000",
  "1001-5000",
  "5001-10000",
  "10001+",
] as const;

const COMPANY_TYPES = [
  "Public Company",
  "Privately Held",
  "Non Profit",
  "Educational Institution",
  "Partnership",
  "Self Employed",
  "Self Owned",
  "Government Agency",
] as const;

const TITLE_BACKBONE = [
  "Chief Executive Officer",
  "Chief Financial Officer",
  "Chief Technology Officer",
  "Chief Marketing Officer",
  "Chief Operating Officer",
  "Vice President of Engineering",
  "Vice President of Sales",
  "Vice President of Marketing",
  "Director of Engineering",
  "Director of Sales",
  "Director of Marketing",
  "Engineering Manager",
  "Product Manager",
  "Senior Product Manager",
  "Software Engineer",
  "Senior Software Engineer",
  "Staff Software Engineer",
  "Data Scientist",
  "Machine Learning Engineer",
  "Site Reliability Engineer",
  "DevOps Engineer",
  "Business Development Manager",
  "Sales Development Representative",
  "Account Executive",
  "Customer Success Manager",
  "Operations Manager",
  "Finance Manager",
  "HR Manager",
  "Recruiter",
  "Consultant",
] as const;

function enumValues(values: readonly string[], sourceField: string): SeedValue[] {
  return values.map((label) => ({
    key: toDeterministicKey(label),
    label,
    metadata: {
      source_standard: "search_leads_openapi",
      source_field: sourceField,
    },
  }));
}

function titleValues(): SeedValue[] {
  return TITLE_BACKBONE.map((label) => ({
    key: toDeterministicKey(label),
    label,
    aliases: [label.replace(/\bof\b/gi, "").replace(/\s+/g, " ").trim()].filter((alias) => alias !== label),
    metadata: {
      source_overlay: "high_frequency_title_backbone",
    },
  }));
}

function createFieldType(key: string, name: string, values: SeedValue[]): SeedFieldType {
  const deduped = uniqueByKey(values);
  validateSeedValues(deduped, `jobs.${key}`);
  return {
    key,
    name,
    values: deduped,
  };
}

export function buildPeopleTypologyJobsPack(): SeedPack {
  return {
    key: "jobs",
    name: "Jobs",
    version: "2.0.0",
    source: "official+overlay",
    fieldTypes: [
      createFieldType("job_functions", "Job Functions", enumValues(FUNCTIONS, "functions")),
      createFieldType("seniority_bands", "Seniority Bands", enumValues(SENIORITY_LEVELS, "seniority_levels")),
      createFieldType("years_of_experience", "Years of Experience", enumValues(EXPERIENCE_BANDS, "years_of_experience")),
      createFieldType(
        "year_in_current_company",
        "Year In Current Company",
        enumValues(EXPERIENCE_BANDS, "year_in_current_company"),
      ),
      createFieldType(
        "year_in_current_position",
        "Year In Current Position",
        enumValues(EXPERIENCE_BANDS, "year_in_current_position"),
      ),
      createFieldType("profile_languages", "Profile Languages", enumValues(PROFILE_LANGUAGES, "profile_languages")),
      createFieldType("company_headcounts", "Company Headcounts", enumValues(COMPANY_HEADCOUNTS, "company_headcounts")),
      createFieldType("company_type", "Company Type", enumValues(COMPANY_TYPES, "company_type")),
      createFieldType("normalized_job_titles", "Normalized Job Titles", titleValues()),
    ],
  };
}
