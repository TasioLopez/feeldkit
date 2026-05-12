import type { SeedPack } from "../../src/data/packs/types";
import type { SourceAdapter } from "./types";
import { buildGeoPacks } from "./geo-build";

export const geoSourceAdapter: SourceAdapter = {
  name: "geo-source-adapter",
  async run(): Promise<SeedPack[]> {
    return buildGeoPacks();
  },
};
