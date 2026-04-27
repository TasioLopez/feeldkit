const fingerprints = [
  { vendor: "Google Workspace", pattern: ".google.com" },
  { vendor: "Microsoft 365", pattern: ".outlook.com" },
  { vendor: "Zoho", pattern: ".zoho.com" },
];

export function matchMxFingerprint(mxRecords: string[]) {
  const joined = mxRecords.join(" ").toLowerCase();
  return fingerprints.find((entry) => joined.includes(entry.pattern)) ?? null;
}
