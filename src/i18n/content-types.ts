/** Structured prose for content pages, rendered by src/components/site/Blocks.astro. */
export type Inline =
  string | { text: string; href: string } | { kbd: string } | { strong: string } | { code: string };

export type Block =
  | { h2: string; id?: string }
  | { h3: string; id?: string }
  | { p: Inline | readonly Inline[] }
  | { ul: readonly (Inline | readonly Inline[])[] }
  | { ol: readonly (Inline | readonly Inline[])[] }
  | { notice: Inline | readonly Inline[] }
  | { table: { caption: string; head: readonly string[]; rows: readonly (readonly string[])[] } };
