import type { SeedPack } from "@/data/packs/types";
import { geoCountriesSeed } from "@/data/packs/geo/countries.seed";
import { geoSubdivisionsNlSeed } from "@/data/packs/geo/subdivisions-netherlands.seed";
import { currenciesSeed } from "@/data/packs/standards/currencies.seed";
import { languagesSeed } from "@/data/packs/standards/languages.seed";
import { timezonesSeed } from "@/data/packs/standards/timezones.seed";
import { companyConsumerSeed } from "@/data/packs/company/company-consumer.seed";
import { companyTypesSeed } from "@/data/packs/company/company-types.seed";
import { employeeBandsSeed } from "@/data/packs/company/employee-bands.seed";
import { fundingStagesSeed } from "@/data/packs/company/funding-stages.seed";
import { revenueBandsSeed } from "@/data/packs/company/revenue-bands.seed";
import { practicalIndustriesSeed } from "@/data/packs/industry/practical-industries.seed";
import { jobFunctionsSeed } from "@/data/packs/jobs/functions.seed";
import { seniorityBandsSeed } from "@/data/packs/jobs/seniority-bands.seed";
import { normalizedTitlesSeed } from "@/data/packs/jobs/normalized-titles.seed";
import { freeEmailProvidersSeed } from "@/data/packs/email-domain/free-email-providers.seed";
import { roleBasedLocalPartsSeed } from "@/data/packs/email-domain/role-based-local-parts.seed";
import { techCategoriesSeed } from "@/data/packs/tech/tech-categories.seed";
import { vendorNormalizationSeed } from "@/data/packs/tech/vendor-normalization.seed";
import { intentTopicsSeed } from "@/data/packs/intent/intent-topics.seed";
import { eventTypesSeed } from "@/data/packs/events/event-types.seed";
import { eventSeveritySeed } from "@/data/packs/events/severity.seed";
import { eventLifecycleStatesSeed } from "@/data/packs/events/lifecycle-states.seed";

export const seedPacks: SeedPack[] = [
  geoCountriesSeed,
  geoSubdivisionsNlSeed,
  currenciesSeed,
  languagesSeed,
  timezonesSeed,
  companyTypesSeed,
  employeeBandsSeed,
  companyConsumerSeed,
  revenueBandsSeed,
  fundingStagesSeed,
  practicalIndustriesSeed,
  jobFunctionsSeed,
  seniorityBandsSeed,
  normalizedTitlesSeed,
  freeEmailProvidersSeed,
  roleBasedLocalPartsSeed,
  techCategoriesSeed,
  vendorNormalizationSeed,
  intentTopicsSeed,
  eventTypesSeed,
  eventSeveritySeed,
  eventLifecycleStatesSeed,
];
