import { processPendingEnrichmentJobs, processPendingEnrichmentJobsAcrossOrganizations } from "../src/lib/enrichment/job-service";

async function run() {
  const organizationId = process.argv[2];
  const processed = organizationId
    ? await processPendingEnrichmentJobs(organizationId, 10)
    : await processPendingEnrichmentJobsAcrossOrganizations(10);
  console.log(`Processed enrichment jobs: ${processed}`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
