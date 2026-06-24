/**
 * src/lib/database/plugins/tsvector.ts
 *
 * Full-text search extension for Drizzle ORM + PostgreSQL.
 *
 * Design:
 * - Schema API compiles to GENERATED ALWAYS AS (...) STORED
 * - Query API wraps tsquery / ranking / headline helpers
 * - Array tiers use immutable_array_to_string(text[], text), which is injected
 *   automatically into generated migrations by generate.ts
 */

import type { SQL, AnyColumn } from 'drizzle-orm';

import { sql } from 'drizzle-orm';
import { customType } from 'drizzle-orm/pg-core';

// ─────────────────────────────────────────────────────────────────────────────
// FtsLanguage
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Built-in PostgreSQL text search configurations.
 * The `(string & {})` intersection preserves IDE autocomplete while still
 * accepting custom installed configurations (e.g. "unaccented", "pg_catalog.simple").
 */
export type FtsLanguage =
  | 'arabic'
  | 'armenian'
  | 'basque'
  | 'catalan'
  | 'danish'
  | 'dutch'
  | 'english'
  | 'finnish'
  | 'french'
  | 'german'
  | 'greek'
  | 'hindi'
  | 'hungarian'
  | 'indonesian'
  | 'irish'
  | 'italian'
  | 'lithuanian'
  | 'nepali'
  | 'norwegian'
  | 'portuguese'
  | 'romanian'
  | 'russian'
  | 'simple'
  | 'spanish'
  | 'swedish'
  | 'tamil'
  | 'turkish'
  | 'yiddish'
  | (string & {});

// ─────────────────────────────────────────────────────────────────────────────
// FtsNormalization
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalization bitmask flags for ts_rank / ts_rank_cd (PostgreSQL §12.3.3).
 * Flags may be OR-combined: FtsNormalization.RankSelf | FtsNormalization.LogLength
 */
export const FtsNormalization = {
  /** No adjustment — raw rank value. */
  None: 0,
  /** ÷ (1 + log(lexeme count)). Penalises long documents slightly. */
  LogLength: 1,
  /** ÷ lexeme count. Strong length penalty. */
  Length: 2,
  /** ÷ harmonic distance between match extents. ts_rank_cd only. */
  ExtentHarmonic: 4,
  /** ÷ unique word count. */
  UniqueWordCount: 8,
  /** ÷ (1 + log(unique word count)). */
  LogUniqueWords: 16,
  /** ÷ (rank + 1) — maps scores into [0, 1]. Recommended default. */
  RankSelf: 32,
  /** Sum per-lexeme rank frequencies. ts_rank_cd only. */
  SumLexemeFreqs: 64,
} as const;

export type FtsNormalizationValue = number;

// ─────────────────────────────────────────────────────────────────────────────
// Schema types
// ─────────────────────────────────────────────────────────────────────────────

/** PostgreSQL tsvector weight tier. A = highest relevance, D = lowest. */
export type FtsWeight = 'A' | 'B' | 'C' | 'D';

// Internal accumulated spec — one entry per .cols().weight() pair
type FtsSpec = {
  cols: string[];
  weight: FtsWeight;
  array?: boolean;
  separator?: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Public chain types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returned by `.language()` and `.array()`.
 * Has `.cols()` and the full Drizzle column API.
 */
export type FtsMainChain = {
  /**
   * Add one or more source columns to the next weight tier.
   *
   * Use the PostgreSQL snake_case column name as it appears in your DDL.
   * For non-text types, append the cast inline: `"year_built::text"`.
   */
  cols: (columns: string[]) => FtsColsChain;
} & ReturnType<typeof _rawTsvector>;

/**
 * Returned by `.cols()`. Must be followed immediately by `.weight()`.
 */
export type FtsColsChain = {
  /**
   * Assign a relevance weight to the preceding `.cols()` group.
   * Returns the weight chain for optional `.array()` and next `.cols()`.
   */
  weight: (w: FtsWeight) => FtsWeightChain;
};

/**
 * Returned by `.weight()`.
 * Has optional `.array()` plus `.cols()` and full Drizzle passthrough.
 */
export type FtsWeightChain = {
  /**
   * Mark this tier's columns as `text[]` — wraps each in
   * `immutable_array_to_string(col, separator)` so every array element is indexed.
   *
   * @param separator  Element separator. @default " "
   */
  array: (separator?: string) => FtsMainChain;
} & FtsMainChain;

// ─────────────────────────────────────────────────────────────────────────────
// Raw Drizzle column builder
// ─────────────────────────────────────────────────────────────────────────────

const _rawTsvector = customType<{ data: string; driverData: string }>({
  dataType() {
    return 'tsvector';
  },
});

export type TsVectorColumn = ReturnType<typeof _rawTsvector>;

/**
 * The type of a built tsvector column after pgTable processes it.
 * This is what you receive as `table.searchVector` at query call sites.
 */
export type TsVectorBuiltColumn = AnyColumn;

// ─────────────────────────────────────────────────────────────────────────────
// Expression builder
// ─────────────────────────────────────────────────────────────────────────────

function escapeSqlLiteral(value: string): string {
  return value.replace(/'/g, "''");
}

function quoteIdent(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function buildFtsExpression(language: string, specs: FtsSpec[]): SQL {
  if (specs.length === 0) throw new Error('tsvector: no tiers defined');

  const tiers = specs.map((s) => {
    const colExprs = s.cols.map((colName) => {
      const colExpr = sql.raw(colName);

      if (s.array) {
        const sep = escapeSqlLiteral(s.separator || ' ');
        return sql`coalesce(immutable_array_to_string(${colExpr}, ${sql.raw(`'${sep}'`)}::text), '')`;
      }

      // Support either plain identifiers like "title" or inline expressions
      // like "year_built::text" / "lower(title)"
      const looksLikeBareIdentifier = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(colName);
      return looksLikeBareIdentifier
        ? sql`coalesce(${sql.raw(quoteIdent(colName))}::text, '')`
        : sql`coalesce(${sql.raw(colName)}, '')`;
    });

    const body = sql.join(colExprs, sql` || ' ' || `);
    const langLiteral = sql.raw(`'${escapeSqlLiteral(language)}'`);
    const weightLiteral = sql.raw(`'${s.weight}'`);

    return sql`setweight(to_tsvector(${langLiteral}::regconfig, ${body}), ${weightLiteral})`;
  });

  return sql.join(tiers, sql` ||\n        `);
}

// ─────────────────────────────────────────────────────────────────────────────
// tsvector() — schema-side entry point
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Declare a PostgreSQL `tsvector` column with a fluent weight-tier chain.
 *
 * Call `.language()` first (optional, defaults to `"english"`),
 * then one or more `.cols().weight()` pairs.
 * Append `.array(sep?)` on any tier whose columns are `text[]`.
 *
 * Must be the last column declared in the `pgTable` column map so that
 * `drizzle-kit` generates `ADD COLUMN` for new source columns before this one
 * in incremental migrations.
 */
export function tsvector(name: string) {
  const col = _rawTsvector(name);

  // All chain state lives in this single closure — shared by all proxy objects
  let _language = 'english';
  const _specs: FtsSpec[] = [];
  let _finalized: TsVectorColumn | null = null;
  let _pending: string[] | null = null;
  let _lastSpec: FtsSpec | null = null;

  function finalize(): TsVectorColumn {
    if (!_finalized) {
      if (_pending !== null) {
        throw new Error(
          `tsvector: .cols(${JSON.stringify(_pending)}) was not followed by .weight()`,
        );
      }

      _finalized = col.generatedAlwaysAs(
        (): SQL => buildFtsExpression(_language, _specs),
      ) as TsVectorColumn;
    }

    return _finalized;
  }

  // Drizzle passthrough — used by mainChain and weightChain
  function dGet(prop: string | symbol) {
    const f = finalize();
    const v = Reflect.get(f, prop as string, f);
    return typeof v === 'function' ? v.bind(f) : v;
  }

  function dSet(prop: string | symbol, value: unknown) {
    Reflect.set(finalize(), prop as string, value);
    return true;
  }

  const drizzleTraps = {
    getPrototypeOf: () => Reflect.getPrototypeOf(finalize()),
    getOwnPropertyDescriptor: (_: object, p: string | symbol) =>
      Reflect.getOwnPropertyDescriptor(finalize(), p),
    ownKeys: () => Reflect.ownKeys(finalize()),
    has: (_: object, p: string | symbol) => p === 'cols' || p in finalize(),
  };

  const colsChain = new Proxy(
    {},
    {
      get(_t, prop) {
        if (prop === 'weight') {
          return (w: FtsWeight): FtsWeightChain => {
            if (_pending === null) {
              throw new Error('tsvector: .weight() called without a pending .cols()');
            }

            const spec: FtsSpec = { cols: _pending, weight: w };
            _specs.push(spec);
            _lastSpec = spec;
            _pending = null;
            return weightChain;
          };
        }

        throw new Error(
          `tsvector: .weight() must follow .cols() before accessing "${String(prop)}"`,
        );
      },
    },
  ) as unknown as FtsColsChain;

  const weightChain = new Proxy(
    {},
    {
      get(_t, prop) {
        if (prop === 'array') {
          return (separator?: string): FtsMainChain => {
            if (_lastSpec) {
              _lastSpec.array = true;
              _lastSpec.separator = separator;
            }
            return mainChain;
          };
        }

        if (prop === 'cols') return mainChainCols;
        return dGet(prop);
      },
      set: (_t, p, v) => dSet(p, v),
      ...drizzleTraps,
    },
  ) as unknown as FtsWeightChain;

  function mainChainCols(columns: string[]): FtsColsChain {
    _pending = columns;
    return colsChain;
  }

  const mainChain = new Proxy(
    {},
    {
      get(_t, prop) {
        if (prop === 'cols') return mainChainCols;
        return dGet(prop);
      },
      set: (_t, p, v) => dSet(p, v),
      ...drizzleTraps,
    },
  ) as unknown as FtsMainChain;

  return new Proxy(col, {
    get(target, prop, receiver) {
      if (prop === 'language') {
        return (lang: FtsLanguage): FtsMainChain => {
          _language = lang;
          return mainChain;
        };
      }

      if (prop === 'cols') return mainChainCols;
      return Reflect.get(target, prop, receiver);
    },
  }) as TsVectorColumn & {
    /** Set the language dictionary for all tiers. Optional — defaults to "english". */
    language: (lang: FtsLanguage) => FtsMainChain;
    /** Start the first weight tier. Skips .language() and uses "english". */
    cols: (columns: string[]) => FtsColsChain;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Query types
// ─────────────────────────────────────────────────────────────────────────────

/** How the keyword string is parsed into a PostgreSQL tsquery. */
export type FtsSearchMode =
  | 'websearch' // Google-style: "phrase", OR, -exclude. Never errors. Default.
  | 'plain' // All words ANDed. No special syntax.
  | 'phrase' // Words must appear contiguously in order.
  | 'raw'; // to_tsquery() — strict syntax. Throws on malformed input.

export interface TsQueryOptions {
  /**
   * websearch (default) — Google-style: "exact phrase", OR, -exclude. Safe for user input.
   * plain    — all words ANDed; no special syntax.
   * phrase   — words must appear in order.
   * raw      — to_tsquery(); throws on bad syntax. For programmatic queries only.
   */
  mode?: FtsSearchMode;
  /** Must match the language used in .language(). @default "english" */
  language?: FtsLanguage;
}

export interface FtsHeadlineOptions {
  maxWords?: number;
  minWords?: number;
  shortWord?: number;
  highlightAll?: boolean;
  maxFragments?: number;
  fragmentDelimiter?: string;
  startSel?: string;
  stopSel?: string;
}

function buildHeadlineOptsString(opts: FtsHeadlineOptions): string {
  function q(s: string) {
    return `'${s.replace(/'/g, "''")}'`;
  }

  const parts: string[] = [];
  if (opts.maxWords !== undefined) parts.push(`MaxWords=${opts.maxWords}`);
  if (opts.minWords !== undefined) parts.push(`MinWords=${opts.minWords}`);
  if (opts.shortWord !== undefined) parts.push(`ShortWord=${opts.shortWord}`);
  if (opts.highlightAll !== undefined) parts.push(`HighlightAll=${opts.highlightAll}`);
  if (opts.maxFragments !== undefined) parts.push(`MaxFragments=${opts.maxFragments}`);
  if (opts.fragmentDelimiter !== undefined)
    parts.push(`FragmentDelimiter=${q(opts.fragmentDelimiter)}`);
  if (opts.startSel !== undefined) parts.push(`StartSel=${q(opts.startSel)}`);
  if (opts.stopSel !== undefined) parts.push(`StopSel=${q(opts.stopSel)}`);

  return parts.join(', ');
}

// ─────────────────────────────────────────────────────────────────────────────
// TsQuery — compiled query object
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A compiled tsquery with methods for WHERE, SELECT, and ORDER BY.
 */
export class TsQuery {
  /** The trimmed keyword string. */
  readonly keywords: string;

  private _mode: FtsSearchMode;
  private _language: string;
  private _compiled: SQL | null = null;

  constructor(keywords: string, opts: TsQueryOptions = {}) {
    this.keywords = keywords.trim();
    this._mode = opts.mode ?? 'websearch';
    this._language = opts.language ?? 'english';
  }

  mode(m: FtsSearchMode): this {
    this._mode = m;
    this._compiled = null;
    return this;
  }

  language(l: FtsLanguage): this {
    this._language = l;
    this._compiled = null;
    return this;
  }

  get tsq(): SQL {
    if (!this._compiled) this._compiled = this._compile();
    return this._compiled;
  }

  private _compile(): SQL {
    if (this.isEmpty) return sql`''::tsquery`;

    // regconfig must be embedded as a literal; keywords remain parameterized
    const lang = sql.raw(`'${this._language.replace(/'/g, "''")}'`);
    const kw = this.keywords;

    switch (this._mode) {
      case 'plain':
        return sql`plainto_tsquery(${lang}, ${kw})`;
      case 'phrase':
        return sql`phraseto_tsquery(${lang}, ${kw})`;
      case 'raw':
        return sql`to_tsquery(${lang}, ${kw})`;
      default:
        return sql`websearch_to_tsquery(${lang}, ${kw})`;
    }
  }

  /** True when the keyword string was empty or whitespace-only. */
  get isEmpty(): boolean {
    return this.keywords.length === 0;
  }

  match(vectorCol: SQL | AnyColumn): SQL<boolean> {
    return sql<boolean>`${vectorCol} @@ ${this.tsq}`;
  }

  notMatch(vectorCol: SQL | AnyColumn): SQL<boolean> {
    return sql<boolean>`NOT (${vectorCol} @@ ${this.tsq})`;
  }

  rank(
    vectorCol: SQL | AnyColumn,
    normalization: FtsNormalizationValue = FtsNormalization.RankSelf,
  ): SQL<number> {
    return sql<number>`ts_rank_cd(${vectorCol}, ${this.tsq}, ${normalization})`;
  }

  rankSimple(
    vectorCol: SQL | AnyColumn,
    normalization: FtsNormalizationValue = FtsNormalization.RankSelf,
  ): SQL<number> {
    return sql<number>`ts_rank(${vectorCol}, ${this.tsq}, ${normalization})`;
  }

  headline(textCol: SQL | AnyColumn, options: FtsHeadlineOptions = {}): SQL<string> {
    const lang = sql.raw(`'${this._language.replace(/'/g, "''")}'`);
    const optsStr = buildHeadlineOptsString(options);

    return optsStr
      ? sql<string>`ts_headline(${lang}, ${textCol}, ${this.tsq}, ${sql.raw(optsStr)})`
      : sql<string>`ts_headline(${lang}, ${textCol}, ${this.tsq})`;
  }

  orderByRank(
    vectorCol: SQL | AnyColumn,
    normalization: FtsNormalizationValue = FtsNormalization.RankSelf,
  ): SQL {
    return sql`ts_rank_cd(${vectorCol}, ${this.tsq}, ${normalization}) DESC`;
  }

  orderByRankAsc(
    vectorCol: SQL | AnyColumn,
    normalization: FtsNormalizationValue = FtsNormalization.RankSelf,
  ): SQL {
    return sql`ts_rank_cd(${vectorCol}, ${this.tsq}, ${normalization}) ASC`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// tsquery() — public query-side entry point
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a compiled tsquery from a keyword string.
 */
export function tsquery(keywords: string, opts?: TsQueryOptions): TsQuery {
  return new TsQuery(keywords, opts);
}
