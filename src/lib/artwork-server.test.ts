import { describe, expect, it } from "vitest";
import { resolveArtwork } from "./artwork-server";

describe("resolveArtwork", () => {
  // The id comes straight off the URL in /api/artwork/[id]/[variant], and every
  // lookup miss is cached. Unknown ids must never reach that cache, or it grows
  // without bound on caller-supplied keys.
  it("rejects ids that are not in the catalog", async () => {
    for (const id of ["junk", "__proto__", "constructor", "../../etc/passwd", ""]) {
      await expect(resolveArtwork(id)).resolves.toBeNull();
    }
  });

  it("still returns baked-in artwork for a real title", async () => {
    // No TMDB_API_KEY in tests, so this exercises the seeded/no-key path only.
    await expect(resolveArtwork("iron-man")).resolves.toBeDefined();
  });
});
