import { Fragment } from "react";

/**
 * Renders a translated string that contains React nodes - a link, a bold run, a
 * `<code>` - without breaking the sentence into fragments.
 *
 * The alternative, concatenating `t("about.body.part1") + <Link/> + t("about.body.part2")`,
 * quietly assumes every language puts the link in the same place. It does not:
 * German moves the verb, Japanese moves the object, and Persian runs the other
 * way entirely. Keeping the whole sentence in one dictionary value with a
 * `{slot}` in it lets the translator put the link wherever their grammar needs
 * it, and this component drops the node in at whatever position they chose.
 *
 *   <Rich text={t("about.watchlist.body", { key: "…" })} slots={{ link: <Link …/> }} />
 *
 * A slot the translation does not mention simply is not rendered, and a slot
 * the translation mentions but the caller did not supply renders as the literal
 * placeholder - visible, and caught by `npm run i18n:validate`.
 */
export function Rich({
  text,
  slots,
}: {
  text: string;
  slots: Record<string, React.ReactNode>;
}) {
  // The capturing group means `split` returns [text, name, text, name, …], so
  // odd indices are the placeholder names.
  const parts = text.split(/\{(\w+)\}/g);

  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <Fragment key={index}>{part in slots ? slots[part] : `{${part}}`}</Fragment>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        ),
      )}
    </>
  );
}
