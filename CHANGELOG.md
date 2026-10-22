# Changelog

## v0.1.4 - 2026-10-22

Marvel Watchlist v0.1.4 is a security release with no functional changes.

### Highlights

- Update Next.js from 16.3.1 to 16.3.8, which fixes three critical and one high advisory, and sharp to 0.35.5.
- Slim the runtime image: it now applies Alpine package updates and no longer ships npm, npx, corepack or yarn, which the standalone server never uses. A Trivy scan of the image reports no high or critical vulnerabilities (previously 3 critical, 13 high).

### Deployment

Container image: `ghcr.io/nicolfo/marvel-watchlist:0.1.4`.

The attached Helm chart is version `0.1.4` and defaults to the matching image tag. No values changes are needed. The versioned image is published by the tag-triggered CI workflow after its checks pass.

[Full changelog](https://github.com/Nicolfo/marvel-watchlist/compare/v0.1.3...v0.1.4)

## v0.1.3 - 2026-10-21

Marvel Watchlist v0.1.3 makes the Disney+ links work and adds a release-order view.

### Highlights

- Fix the Disney+ chip, which opened a Disney+ error page. Disney+ has no search a link can prefill, so the chip now opens the title's own Disney+ page from a new `disneyPlusId` field. 99 of 103 titles have one, and seasons open their show's page. Titles without an id (Runaways and three unreleased films) fall back to the first `site:disneyplus.com` search result (dataset `2026.03.007`).
- Add a Suggested / Release order toggle to the explorer. Release order lists every title strictly by premiere date, so X-Men: The Animated Series and X-Men (2000) lead it; Ready to watch and Next up follow the chosen order. Labels in all 14 languages.

### Deployment

Container image: `ghcr.io/nicolfo/marvel-watchlist:0.1.3`.

The attached Helm chart is version `0.1.3` and defaults to the matching image tag. No values changes are needed. The versioned image is published by the tag-triggered CI workflow after its checks pass.

Includes [PR #11](https://github.com/Nicolfo/marvel-watchlist/pull/11) and [PR #12](https://github.com/Nicolfo/marvel-watchlist/pull/12).

[Full changelog](https://github.com/Nicolfo/marvel-watchlist/compare/v0.1.2...v0.1.3)

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
