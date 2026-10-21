# Changelog

## v0.1.2 - 2026-10-21

Marvel Watchlist v0.1.2 improves season-by-season watch ordering and preserves existing bookmarks and watchlists.

### Highlights

- Split Daredevil, Jessica Jones, Luke Cage, Iron Fist, The Punisher, and Agents of S.H.I.E.L.D. into 19 individual season entries. The catalog now contains 103 titles and 152 dependencies (dataset `2026.03.006`).
- Place Daredevil season 2 before The Defenders and season 3 afterward, and order later Defenders Saga seasons around their shared events.
- Add Agents of S.H.I.E.L.D. crossover guidance: season 1 episodes 1–16 before The Winter Soldier, then episodes 17–22; season 2 episodes 1–19 before Age of Ultron, then episodes 20–22.
- Correct Luke Cage sequencing and place the legacy films before Avengers: Doomsday and Secret Wars in the suggested order.
- Replace the affected show-level plot summaries with season-specific summaries in all 14 supported languages.
- Keep existing show bookmarks working by redirecting them to season 1. Existing watched-show entries and imports expand to all of that show's seasons; the database seed preserves watch entries during the same migration.
- Improve season artwork and streaming searches, link IMDb directly to the relevant season's episode list, and emit TVSeason structured data.
- Add regression coverage for season ordering, dataset integrity, redirects, and watchlist migration. Fix seed typing so builds work without a generated Prisma client.

- Change the Helm default image pull policy to `Always`, so new pods check the registry even when a rolling image tag is reused.

### Deployment

Container image: `ghcr.io/nicolfo/marvel-watchlist:0.1.2`.

The attached Helm chart is version `0.1.2` and defaults to the matching image tag. Preserve your existing values when upgrading; if using `--reuse-values`, also set `--set image.pullPolicy=Always` to adopt the new pull policy. The versioned image is published by the tag-triggered CI workflow after its checks pass.

For database-backed installations, run the updated seed (`npm run db:seed`) to migrate watched-show entries before retired show rows are removed.

Includes [PR #10](https://github.com/Nicolfo/marvel-watchlist/pull/10), addressing [issue #9](https://github.com/Nicolfo/marvel-watchlist/issues/9).

[Full changelog](https://github.com/Nicolfo/marvel-watchlist/compare/v0.1.1...v0.1.2)
