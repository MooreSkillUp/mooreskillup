/**
 * Turns a legal document's plain text into readable structure.
 *
 * A deliberately tiny subset of Markdown — the parts a policy actually uses:
 *
 *   # Heading          ## Sub-heading
 *   - a bullet point   (or "* ")
 *   1. a numbered item
 *   A blank line starts a new paragraph.
 *
 * Everything is rendered as text, never as HTML, so whatever is typed into the
 * editor cannot run in a reader's browser. No library: a full Markdown parser
 * is a large dependency to carry for five rules.
 */
type Block =
  | { kind: "h1" | "h2" | "p"; text: string }
  | { kind: "ul" | "ol"; items: string[] };

export function parseLegalText(source: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let list: { kind: "ul" | "ol"; items: string[] } | null = null;

  const flushParagraph = () => {
    if (paragraph.length) blocks.push({ kind: "p", text: paragraph.join(" ") });
    paragraph = [];
  };
  const flushList = () => {
    if (list) blocks.push(list);
    list = null;
  };

  for (const raw of source.replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.trim();
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }
    if (line.startsWith("## ")) {
      flushParagraph();
      flushList();
      blocks.push({ kind: "h2", text: line.slice(3).trim() });
      continue;
    }
    if (line.startsWith("# ")) {
      flushParagraph();
      flushList();
      blocks.push({ kind: "h1", text: line.slice(2).trim() });
      continue;
    }
    const bullet = /^[-*]\s+(.*)$/.exec(line);
    const numbered = /^\d+[.)]\s+(.*)$/.exec(line);
    if (bullet || numbered) {
      flushParagraph();
      const kind = bullet ? "ul" : "ol";
      if (!list || list.kind !== kind) {
        flushList();
        list = { kind, items: [] };
      }
      list.items.push((bullet ?? numbered)![1]);
      continue;
    }
    flushList();
    paragraph.push(line);
  }
  flushParagraph();
  flushList();
  return blocks;
}

export function LegalText({ source }: { source: string }) {
  const blocks = parseLegalText(source);
  return (
    <div className="space-y-4 text-[15px] leading-7 text-foreground/90">
      {blocks.map((block, index) => {
        switch (block.kind) {
          case "h1":
            return (
              <h2 key={index} className="pt-4 font-display text-xl font-bold text-foreground">
                {block.text}
              </h2>
            );
          case "h2":
            return (
              <h3 key={index} className="pt-2 font-display text-lg font-semibold text-foreground">
                {block.text}
              </h3>
            );
          case "ul":
            return (
              <ul key={index} className="list-disc space-y-1.5 pl-6">
                {block.items.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={index} className="list-decimal space-y-1.5 pl-6">
                {block.items.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ol>
            );
          default:
            return <p key={index}>{block.text}</p>;
        }
      })}
    </div>
  );
}
