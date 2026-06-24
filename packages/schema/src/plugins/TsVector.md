# Full-Text Search — `src/lib/database/plugins/tsvector.ts`

PostgreSQL full-text search extension for Drizzle ORM. Thin typed wrapper over the native PostgreSQL
FTS system — no extra dependencies, no plugins.

## Contents

- [Full-Text Search — `src/lib/database/plugins/tsvector.ts`](#full-text-search--srclibdatabasepluginstsvectorts)
  - [Contents](#contents)
  - [Overview](#overview)
    - [Important implementation note](#important-implementation-note)
  - [Schema API — `tsvector`](#schema-api--tsvector)
    - [Minimal example](#minimal-example)
    - [Chain anatomy](#chain-anatomy)
    - [`.language(lang?)`](#languagelang)
    - [`.cols(columns)`](#colscolumns)
    - [`.weight(tier)`](#weighttier)
    - [`.array(separator?)`](#arrayseparator)
    - [Column name rules](#column-name-rules)
    - [Weight tiers](#weight-tiers)
    - [The "last column" rule](#the-last-column-rule)
    - [Migration generation behavior](#migration-generation-behavior)
  - [Query API — `tsquery`](#query-api--tsquery)
    - [`tsquery(keywords, opts?)`](#tsquerykeywords-opts)
    - [`.mode(m)`](#modem)
    - [`.language(lang)`](#languagelang-1)
    - [`q.isEmpty`](#qisempty)
    - [`q.tsq`](#qtsq)
    - [`q.match(col)`](#qmatchcol)
    - [`q.notMatch(col)`](#qnotmatchcol)
    - [`q.rank(col, norm?)`](#qrankcol-norm)
    - [`q.rankSimple(col, norm?)`](#qranksimplecol-norm)
    - [`q.headline(col, opts?)`](#qheadlinecol-opts)
    - [`q.orderByRank(col, norm?)`](#qorderbyrankcol-norm)
    - [`q.orderByRankAsc(col, norm?)`](#qorderbyrankasccol-norm)
  - [Reference types](#reference-types)
    - [`FtsLanguage`](#ftslanguage)
    - [`FtsNormalization`](#ftsnormalization)
    - [`FtsWeight`](#ftsweight)
    - [`FtsSearchMode`](#ftssearchmode)
    - [`FtsHeadlineOptions`](#ftsheadlineoptions)
  - [Patterns and recipes](#patterns-and-recipes)
    - [Basic search with ranking](#basic-search-with-ranking)
    - [Search bar with snippet](#search-bar-with-snippet)
    - [Combining FTS with other filters](#combining-fts-with-other-filters)
    - [Multiple languages](#multiple-languages)
    - [Exclusion filters](#exclusion-filters)
    - [Phrase search](#phrase-search)
    - [Adjusting ranking behavior](#adjusting-ranking-behavior)
    - [Multi-fragment snippets](#multi-fragment-snippets)
    - [Graceful empty-query handling](#graceful-empty-query-handling)

---

## Overview

Two independent APIs that work together:

| API        | Purpose                                                                                                                                                | Key export |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| **Schema** | Declare a weighted `tsvector` generated column. `drizzle-kit generate` emits `GENERATED ALWAYS AS STORED` DDL, and the GIN index is declared normally. | `tsvector` |
| **Query**  | Build a compiled tsquery once; use it in `WHERE`, `SELECT`, and `ORDER BY` without repeating the keyword string.                                       | `tsquery`  |

```ts
import { tsvector, tsquery, FtsNormalization } from '@/lib/db/fts';
```

### Important implementation note

For tiers marked with `.array()`, the generated SQL uses an immutable helper function:

```sql
immutable_array_to_string(text[], text)
```

This helper is **automatically injected into newly generated migration files** by the project’s
custom migration generation wrapper. You do **not** need to write or maintain that SQL manually.

---

## Schema API — `tsvector`

### Minimal example

```ts
import { pgTable, serial, text, index } from 'drizzle-orm/pg-core';
import { tsvector } from '@/lib/db/fts';

export const posts = pgTable(
  'posts',
  {
    id: serial('id').primaryKey(),
    title: text('title').notNull(),
    body: text('body'),
    tags: text('tags').array(),

    // Always declare searchVector last — see "The last column rule" below
    searchVector: tsvector('search_vector')
      .language('english')
      .cols(['title'])
      .weight('A')
      .cols(['body'])
      .weight('D')
      .cols(['tags'])
      .weight('D')
      .array(),
  },
  (t) => ({
    searchVectorIdx: index('idx_posts_search_vector').using('gin', t.searchVector),
  }),
);
```

`drizzle-kit generate` produces a migration that includes:

```sql
CREATE OR REPLACE FUNCTION immutable_array_to_string(text[], text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$ SELECT array_to_string($1, $2); $$;

CREATE TABLE "posts" (
  "id" serial PRIMARY KEY NOT NULL,
  "title" text NOT NULL,
  "body" text,
  "tags" text[],
  "search_vector" "tsvector" GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce("title"::text, '')), 'A') ||
    setweight(to_tsvector('english', coalesce("body"::text, '')), 'D') ||
    setweight(to_tsvector('english', coalesce(immutable_array_to_string(tags, ' '::text), '')), 'D')
  ) STORED
);

CREATE INDEX "idx_posts_search_vector" ON "posts" USING gin ("search_vector");
```

PostgreSQL maintains `search_vector` automatically on every `INSERT` and `UPDATE`. No trigger, no
backfill, no application code needed.

---

### Chain anatomy

```drizzle
tsvector(name)
  .language(lang)?      → FtsMainChain   optional step; defaults to "english"
  .cols(["col", ...])   → FtsColsChain   has .weight()
  .weight("A"–"D")      → FtsWeightChain has .array(sep?) + .cols() + Drizzle
  .array(sep?)?         → FtsMainChain   optional; has .cols() + Drizzle
```

---

### `.language(lang?)`

Optional first step. Sets the PostgreSQL text search configuration for all tiers. If omitted, all
tiers default to `"english"`.

```ts
tsvector('search_vector').language('english').cols(['title']).weight('A');

tsvector('search_vector').language('french').cols(['title']).weight('A');

tsvector('search_vector').language('simple').cols(['title']).weight('A');

// Omit entirely — defaults to "english"
tsvector('search_vector').cols(['title']).weight('A');
```

| Option | Type          | Default     | Description                                                                                          |
| ------ | ------------- | ----------- | ---------------------------------------------------------------------------------------------------- |
| `lang` | `FtsLanguage` | `"english"` | PostgreSQL text search configuration. Controls stemming and stop-word removal. Applied to all tiers. |

---

### `.cols(columns)`

Specifies one or more source columns for the next weight tier. Must be immediately followed by
`.weight()`.

```ts
.cols(['title'])                        // single column
.cols(['city', 'postal_code'])          // multiple — concatenated within the tier
.cols(['year_built::text'])             // inline cast for non-text columns
.cols(['last_name', 'first_name'])      // joined with a space separator
.cols(['lower(title)'])                 // raw SQL expression
```

Column names are **PostgreSQL DDL names** — the snake_case string in your database schema, not the
Drizzle TypeScript property name.

---

### `.weight(tier)`

Commits the preceding `.cols()` group at the given relevance tier. Returns `FtsWeightChain` with
`.array()` and `.cols()`.

```ts
.cols(['title'])   .weight('A')
.cols(['city'])    .weight('B')
.cols(['author'])  .weight('C')
.cols(['body'])    .weight('D')
```

`.weight()` **must** immediately follow `.cols()`. Accessing any other property on the intermediate
chain before calling `.weight()` throws an error.

---

### `.array(separator?)`

Marks the current tier's columns as `text[]`. Wraps each column in
`immutable_array_to_string(col, separator)` so every array element is indexed as text.

```ts
.cols(['tags'])        .weight('D').array()       // separator defaults to " "
.cols(['categories'])  .weight('D').array(' ')    // same
.cols(['csv_field'])   .weight('D').array(', ')   // comma-separated
.cols(['pipe_field'])  .weight('D').array(' | ')  // custom separator
```

`.array()` is optional and returns `FtsMainChain` so the chain can continue with another `.cols()`.

---

### Column name rules

| Column type                    | How to pass it               |
| ------------------------------ | ---------------------------- |
| `text`, `varchar`, `char`      | `"column_name"`              |
| `integer`, `bigint`, `numeric` | `"column_name::text"`        |
| `date`, `timestamp`            | `"column_name::text"`        |
| `uuid`                         | `"column_name::text"`        |
| `text[]`                       | `"column_name"` + `.array()` |
| SQL expression                 | `"lower(column_name)"`       |

---

### Weight tiers

| Weight | Typical use                                     |
| ------ | ----------------------------------------------- |
| `"A"`  | Primary identifiers: address, title, listing ID |
| `"B"`  | Location: city, zip, area, county               |
| `"C"`  | Contextual: agent name, office, classification  |
| `"D"`  | Descriptive: body text, feature lists, remarks  |

Multiple tiers can share the same weight letter.

---

### The "last column" rule

`searchVector` **must always be declared last** in the `pgTable` column map.

`drizzle-kit` generates columns in schema order. When you add new source columns that the generated
expression references, those source columns must already exist before `search_vector` is added or
regenerated.

```ts
// ✅ Correct
export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: text('title'),
  // ... all source columns ...
  searchVector: tsvector('search_vector').language('english')..., // ← last
})

// ❌ Wrong
export const posts = pgTable('posts', {
  searchVector: tsvector('search_vector').language('english')..., // ← first
  id: serial('id').primaryKey(),
  title: text('title'),
})
```

---

### Migration generation behavior

- **New databases**: `CREATE TABLE` includes the full `GENERATED ALWAYS AS (...) STORED` expression
  inline.
- **Expression changes**: `drizzle-kit` typically emits a drop/re-add of the generated column
  expression because PostgreSQL does not support altering the expression in place.
- **GIN index**: declared in the index factory as normal.
- **Array support**: migrations automatically include the `immutable_array_to_string(text[], text)`
  helper function at the top of the generated migration file.

This helper injection is part of the project’s migration generation flow, so consumers of the
extension do not need to manage it manually.

---

## Query API — `tsquery`

### `tsquery(keywords, opts?)`

Factory function. Always returns a `TsQuery` — never `null`. Check `.isEmpty` before applying FTS
conditions.

```ts
import { tsquery } from '@/lib/db/fts';

tsquery('waterfront Seattle');
tsquery('waterfront', { mode: 'plain' });
tsquery('open floor plan', { mode: 'phrase', language: 'english' });
tsquery(userInput ?? '');

// Fluent configuration — equivalent
tsquery('waterfront Seattle').mode('websearch').language('english');
tsquery('open floor plan').mode('phrase');
tsquery('план квартира').mode('plain').language('russian');

// Mixed
tsquery(userInput, { language: 'french' }).mode('websearch');
```

| Option     | Type            | Default       | Description                               |
| ---------- | --------------- | ------------- | ----------------------------------------- |
| `mode`     | `FtsSearchMode` | `"websearch"` | How keywords are parsed into a tsquery.   |
| `language` | `FtsLanguage`   | `"english"`   | Must match the language in `.language()`. |

---

### `.mode(m)`

Set the search mode. Returns `this` for chaining. Invalidates the compiled tsquery.

```ts
tsquery('hello world').mode('plain');
tsquery('open floor plan').mode('phrase');
tsquery('title & body').mode('raw');
```

---

### `.language(lang)`

Set the language dictionary. Returns `this` for chaining. Invalidates the compiled tsquery.

```ts
tsquery('план квартира').language('russian');
tsquery('bonjour monde').language('french');
```

---

### `q.isEmpty`

`true` when the keyword string was empty or whitespace-only after trimming.

```ts
const q = tsquery(params.keywords ?? '');
if (!q.isEmpty) {
  filters.push(q.match(listings.searchVector));
}
```

---

### `q.tsq`

The compiled `SQL` tsquery fragment. Built lazily on first access; rebuilt after `.mode()` or
`.language()` calls.

```ts
const q = tsquery('waterfront');

sql`ts_rank_cd(${col}, ${q.tsq}, 32) > 0.1`;

sql`ts_headline(
  'english',
  coalesce(${t.title}, '') || ' ' || coalesce(${t.body}, ''),
  ${q.tsq}
)`;
```

---

### `q.match(col)`

`vector @@ tsquery` — WHERE filter. Hits the GIN index.

```ts
.where(q.match(posts.searchVector))
```

**Returns** `SQL<boolean>`

---

### `q.notMatch(col)`

`NOT (vector @@ tsquery)` — exclusion filter.

```ts
const qInclude = tsquery('waterfront');
const qExclude = tsquery('commercial').where(
  and(qInclude.match(listings.searchVector), qExclude.notMatch(listings.searchVector)),
);
```

**Returns** `SQL<boolean>`

---

### `q.rank(col, norm?)`

`ts_rank_cd(vector, tsquery, normalization)` — cover density ranking.

```ts
q.rank(posts.searchVector);
q.rank(posts.searchVector, FtsNormalization.RankSelf);
q.rank(posts.searchVector, FtsNormalization.LogLength);
q.rank(posts.searchVector, FtsNormalization.RankSelf | FtsNormalization.LogLength);
```

**Returns** `SQL<number>`

---

### `q.rankSimple(col, norm?)`

`ts_rank(vector, tsquery, normalization)` — frequency-based ranking.

```ts
q.rankSimple(posts.searchVector);
```

**Returns** `SQL<number>`

---

### `q.headline(col, opts?)`

`ts_headline(lang, text, tsquery, opts)` — highlighted excerpt.

```ts
q.headline(posts.body);

q.headline(posts.body, { startSel: '<mark>', stopSel: '</mark>' });

q.headline(posts.body, {
  maxFragments: 3,
  fragmentDelimiter: ' … ',
  maxWords: 30,
});

q.headline(posts.body, { highlightAll: true });

q.headline(sql`coalesce(${posts.title}, '') || ' ' || coalesce(${posts.body}, '')`);
```

**Returns** `SQL<string>`

---

### `q.orderByRank(col, norm?)`

`ts_rank_cd(...) DESC` — highest relevance first.

```ts
.orderBy(q.orderByRank(posts.searchVector))
.orderBy(q.orderByRank(posts.searchVector, FtsNormalization.LogLength))
```

**Returns** `SQL`

---

### `q.orderByRankAsc(col, norm?)`

`ts_rank_cd(...) ASC` — lowest relevance first.

```ts
.orderBy(q.orderByRankAsc(posts.searchVector))
```

**Returns** `SQL`

---

## Reference types

### `FtsLanguage`

All 28 built-in PostgreSQL text search configurations, plus `(string & {})` to accept custom
installed configs while preserving IDE autocomplete.

```ts
'arabic' |
  'armenian' |
  'basque' |
  'catalan' |
  'danish' |
  'dutch' |
  'english' |
  'finnish' |
  'french' |
  'german' |
  'greek' |
  'hindi' |
  'hungarian' |
  'indonesian' |
  'irish' |
  'italian' |
  'lithuanian' |
  'nepali' |
  'norwegian' |
  'portuguese' |
  'romanian' |
  'russian' |
  'simple' |
  'spanish' |
  'swedish' |
  'tamil' |
  'turkish' |
  'yiddish' |
  (string & {});
```

`"simple"` performs no stemming — words are indexed exactly as written. Useful for proper nouns,
codes, and identifiers.

---

### `FtsNormalization`

Bitmask constants for ranking normalization. OR-combine for multiple effects.

```ts
FtsNormalization.None; // 0
FtsNormalization.LogLength; // 1
FtsNormalization.Length; // 2
FtsNormalization.ExtentHarmonic; // 4
FtsNormalization.UniqueWordCount; // 8
FtsNormalization.LogUniqueWords; // 16
FtsNormalization.RankSelf; // 32
FtsNormalization.SumLexemeFreqs; // 64
```

```ts
q.rank(col, FtsNormalization.RankSelf | FtsNormalization.LogLength);
```

---

### `FtsWeight`

```ts
type FtsWeight = 'A' | 'B' | 'C' | 'D';
```

---

### `FtsSearchMode`

| Mode          | PostgreSQL function    | Notes                                                                                 |
| ------------- | ---------------------- | ------------------------------------------------------------------------------------- |
| `"websearch"` | `websearch_to_tsquery` | Google-style: `"phrase"`, `OR`, `-exclude`. Never throws. **Default.**                |
| `"plain"`     | `plainto_tsquery`      | All words ANDed. No special syntax.                                                   |
| `"phrase"`    | `phraseto_tsquery`     | Words must appear in order.                                                           |
| `"raw"`       | `to_tsquery`           | Full syntax: `&`, `\|`, `!`, `<->`. Throws on malformed input. Programmatic use only. |

---

### `FtsHeadlineOptions`

All options are optional. Omitted options use PostgreSQL defaults.

| Option              | Type    | PG default | Description                                               |
| ------------------- | ------- | ---------- | --------------------------------------------------------- |
| `maxWords`          | number  | 35         | Max words per fragment                                    |
| `minWords`          | number  | 15         | Min words per fragment                                    |
| `shortWord`         | number  | 3          | Words ≤ this length excluded from fragment boundaries     |
| `highlightAll`      | boolean | false      | Highlight whole document; overrides maxWords              |
| `maxFragments`      | number  | 0          | `0` = one fragment; `N` = up to N non-contiguous excerpts |
| `fragmentDelimiter` | string  | `" ... "`  | Text between fragments when `maxFragments > 1`            |
| `startSel`          | string  | `"<b>"`    | Opening tag for highlighted terms                         |
| `stopSel`           | string  | `"</b>"`   | Closing tag for highlighted terms                         |

---

## Patterns and recipes

### Basic search with ranking

```ts
async function searchPosts(keywords: string) {
  const q = tsquery(keywords);
  if (q.isEmpty) return [];

  return db
    .select({
      id: posts.id,
      title: posts.title,
      rank: q.rank(posts.searchVector),
    })
    .from(posts)
    .where(q.match(posts.searchVector))
    .orderBy(q.orderByRank(posts.searchVector));
}
```

---

### Search bar with snippet

```ts
async function search(keywords: string, page = 1) {
  const q = tsquery(keywords);
  const perPage = 20;

  if (q.isEmpty) {
    return db
      .select()
      .from(posts)
      .limit(perPage)
      .offset((page - 1) * perPage);
  }

  return db
    .select({
      id: posts.id,
      title: posts.title,
      snippet: q.headline(posts.body, {
        maxFragments: 2,
        fragmentDelimiter: ' … ',
        startSel: '<mark>',
        stopSel: '</mark>',
        maxWords: 40,
        minWords: 20,
      }),
      rank: q.rank(posts.searchVector),
    })
    .from(posts)
    .where(q.match(posts.searchVector))
    .orderBy(q.orderByRank(posts.searchVector))
    .limit(perPage)
    .offset((page - 1) * perPage);
}
```

---

### Combining FTS with other filters

```ts
const q = tsquery(keywords);

const results = await db
  .select(SUMMARY_COLS)
  .from(listings)
  .where(
    and(
      eq(listings.active, true),
      gte(listings.listPrice, String(minPrice)),
      inArray(listings.standardStatus, ['Active']),
      q.isEmpty ? undefined : q.match(listings.searchVector),
    ),
  )
  .orderBy(
    q.isEmpty ? desc(listings.originalEntryTimestamp) : q.orderByRank(listings.searchVector),
  );
```

---

### Multiple languages

```ts
export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  titleEn: text('title_en'),
  titleFr: text('title_fr'),
  descEn: text('desc_en'),
  descFr: text('desc_fr'),

  searchEn: tsvector('search_en')
    .language('english')
    .cols(['title_en'])
    .weight('A')
    .cols(['desc_en'])
    .weight('D'),

  searchFr: tsvector('search_fr')
    .language('french')
    .cols(['title_fr'])
    .weight('A')
    .cols(['desc_fr'])
    .weight('D'),
});

const lang: FtsLanguage = userLocale === 'fr' ? 'french' : 'english';
const vectorCol = lang === 'french' ? products.searchFr : products.searchEn;
const q = tsquery(keywords).language(lang);

db.select({ id: products.id, rank: q.rank(vectorCol) })
  .from(products)
  .where(q.match(vectorCol))
  .orderBy(q.orderByRank(vectorCol));
```

---

### Exclusion filters

```ts
const qInclude = tsquery('waterfront lake view');
const qExclude = tsquery('flood zone');

db.select()
  .from(listings)
  .where(and(qInclude.match(listings.searchVector), qExclude.notMatch(listings.searchVector)));

const q = tsquery('waterfront lake view -flood -zone');
db.select().from(listings).where(q.match(listings.searchVector));
```

---

### Phrase search

```ts
const q = tsquery('open floor plan', { mode: 'phrase' });

const q2 = tsquery('1234 Main Street').mode('phrase');

const q3 = tsquery('"open floor plan" waterfront');
```

---

### Adjusting ranking behavior

```ts
import { FtsNormalization } from '@/lib/db/fts';

q.rank(col);
q.rank(col, FtsNormalization.RankSelf | FtsNormalization.LogLength);
q.rank(col, FtsNormalization.Length);
q.rank(col, FtsNormalization.None)

  .where(
    and(
      q.match(listings.searchVector),
      sql`ts_rank_cd(${listings.searchVector}, ${q.tsq}, 32) > 0.05`,
    ),
  );
```

---

### Multi-fragment snippets

```ts
const q = tsquery('PostgreSQL full text search');

db.select({
  id: docs.id,
  snippet: q.headline(docs.body, {
    maxFragments: 5,
    fragmentDelimiter: '\n…\n',
    maxWords: 25,
    minWords: 10,
    shortWord: 4,
    startSel: '**',
    stopSel: '**',
  }),
})
  .from(docs)
  .where(q.match(docs.searchVector))
  .orderBy(q.orderByRank(docs.searchVector));
```

---

### Graceful empty-query handling

```ts
async function searchListings(params: SearchParams) {
  const q = tsquery(params.keywords ?? '');

  const filters: SQL[] = [
    eq(listings.active, true),
    ...(q.isEmpty ? [] : [q.match(listings.searchVector)]),
  ];

  const extraCols = q.isEmpty
    ? {}
    : {
        rank: q.rank(listings.searchVector),
        snippet: q.headline(listings.publicRemarks),
      };

  return db
    .select({ ...BASE_COLS, ...extraCols })
    .from(listings)
    .where(and(...filters))
    .orderBy(q.isEmpty ? desc(listings.createdAt) : q.orderByRank(listings.searchVector));
}
```
