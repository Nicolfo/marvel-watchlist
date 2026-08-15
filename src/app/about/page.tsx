import type { Metadata } from "next";
import Link from "next/link";
import { DATA_VERSION, EDGE_TYPE_META, SOURCE, graphData } from "@/lib/graph/catalog";
import { EDGE_STYLES } from "@/components/ui";
import type { EdgeType } from "@/lib/graph/schema";

export const metadata: Metadata = {
  title: "About",
  description:
    "Where the Marvel watch-order dependency graph comes from, how the suggested order is computed, and how to update the data.",
};

export default function AboutPage() {
  const counts = graphData.edges.reduce<Record<string, number>>((acc, edge) => {
    acc[edge.type] = (acc[edge.type] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="panel rounded-2xl p-6">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">About</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Most Marvel watch orders are a single flat list — release order or chronological order —
          which forces a rigid sequence even where the stories don&rsquo;t actually depend on each
          other. This app takes the other approach: the catalog is a{" "}
          <strong className="text-text">directed graph of story dependencies</strong>, and the
          &ldquo;suggested order&rdquo; you see is a topological sort of that graph. To watch any
          one title, you only need the titles that point into it.
        </p>
      </section>

      <section className="panel rounded-2xl p-6">
        <h2 className="text-lg font-semibold">Where the graph comes from</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          The dependency data is adapted from{" "}
          <a
            href={SOURCE.url}
            target="_blank"
            rel="noreferrer noopener"
            className="text-accent-soft underline underline-offset-2"
          >
            {SOURCE.name}
          </a>
          , a community-made chart by <strong className="text-text">{SOURCE.author}</strong> posted
          on r/marvelstudios:
        </p>
        <p className="mt-3 break-all rounded-lg border border-edge bg-panel-2/40 p-3 font-mono text-xs text-muted">
          <a
            href={SOURCE.url}
            target="_blank"
            rel="noreferrer noopener"
            className="hover:text-accent-soft"
          >
            {SOURCE.url}
          </a>
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          All credit for the ordering and the arrow-by-arrow judgement calls goes to its author.
          This project only transcribes that chart into machine-readable form so it can be walked
          programmatically. Quoting the chart&rsquo;s own disclaimer:{" "}
          <em className="text-text">
            &ldquo;the labels are subjective… the lines between the levels are blurry, and the
            importance of a story will vary between opinions. This exists to help you navigate the
            MCU, but it&rsquo;s not the rules.&rdquo;
          </em>{" "}
          {SOURCE.note}
        </p>
      </section>

      <section className="panel rounded-2xl p-6">
        <h2 className="text-lg font-semibold">The three kinds of arrow</h2>
        <p className="mt-2 text-sm text-muted">
          Each dependency carries a strength, straight from the chart&rsquo;s legend. You choose how
          strict to be, and the order and the &ldquo;what&rsquo;s missing&rdquo; lists both respond
          to that choice.
        </p>
        <ul className="mt-4 space-y-3">
          {EDGE_TYPE_META.map((meta) => {
            const style = EDGE_STYLES[meta.id as EdgeType];
            return (
              <li key={meta.id} className="flex gap-3 rounded-xl border border-edge p-3">
                <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${style.dot}`} aria-hidden />
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className={`font-medium ${style.text}`}>{meta.label}</span>
                    <span className="text-xs text-muted">{counts[meta.id] ?? 0} edges</span>
                  </div>
                  <p className="mt-0.5 text-sm text-muted">{meta.description}</p>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-sm text-muted">
          Dashed arrows on the original chart are predictions based on pre-release knowledge; they
          are flagged as <span className="text-text">predicted</span> here and appear on unreleased
          titles.
        </p>
      </section>

      <section className="panel rounded-2xl p-6">
        <h2 className="text-lg font-semibold">Posters, IMDb and streaming links</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Every title links to <strong className="text-text">IMDb</strong> — directly where we hold
          a verified id, and to an IMDb search otherwise, so the link always lands somewhere
          useful. Artwork, however, does <em>not</em> come from IMDb: it publishes no image API and
          its posters may not be hotlinked. Posters come from{" "}
          <a
            href="https://www.themoviedb.org/"
            target="_blank"
            rel="noreferrer noopener"
            className="text-accent-soft underline underline-offset-2"
          >
            TMDB
          </a>
          , whose free API permits this use and also exposes each title&rsquo;s IMDb id. When no
          TMDB key is configured, the app draws its own poster art from the title&rsquo;s data —
          the colour tells you which phase it belongs to.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Streaming rights are regional and change constantly, so the platform chips are a hint
          rather than a promise. The <strong className="text-text">Where to watch</strong> link on
          every title resolves availability for your country, and is the answer to trust.
        </p>
      </section>

      <section className="panel rounded-2xl p-6">
        <h2 className="text-lg font-semibold">Your watchlist</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Everything you tick off is stored in your browser&rsquo;s{" "}
          <code className="text-text">localStorage</code> under the key{" "}
          <code className="text-text">marvel-watchlist:v1</code>. There is no account, no server
          call and no tracking. The storage layer sits behind a small adapter interface, so a
          logged-in, database-backed watchlist can replace it without touching the UI — see the
          README for that path. You can{" "}
          <Link href="/watchlist" className="text-accent-soft underline underline-offset-2">
            export and import your list
          </Link>{" "}
          at any time.
        </p>
      </section>

      <section className="panel rounded-2xl p-6">
        <h2 className="text-lg font-semibold">Keeping the data current</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          The whole catalog lives in one file — <code className="text-text">data/marvel-graph.json</code>{" "}
          — so adding next year&rsquo;s slate means appending a title and its arrows, then running{" "}
          <code className="text-text">npm run graph:validate</code>. That check rejects unknown ids,
          duplicate or self edges, and dependency cycles before a release can ship. Exporters are
          included for Postgres and for Neo4j Cypher.
        </p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-edge p-3">
            <dt className="text-xs uppercase tracking-wide text-muted">Titles</dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums">{graphData.titles.length}</dd>
          </div>
          <div className="rounded-xl border border-edge p-3">
            <dt className="text-xs uppercase tracking-wide text-muted">Dependencies</dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums">{graphData.edges.length}</dd>
          </div>
          <div className="rounded-xl border border-edge p-3">
            <dt className="text-xs uppercase tracking-wide text-muted">Dataset</dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums">{DATA_VERSION}</dd>
          </div>
        </dl>
      </section>

      <section className="panel rounded-2xl p-6">
        <h2 className="text-lg font-semibold">Legal</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          An unofficial fan project. Marvel, the MCU and all title names are trademarks of Marvel
          Characters, Inc. and The Walt Disney Company; this project is not affiliated with,
          endorsed by, or sponsored by them. It stores no media — only title names and the
          relationships between them.
        </p>
      </section>
    </div>
  );
}
