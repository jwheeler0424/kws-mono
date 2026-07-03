# TsVector Plugin

Full-text search helpers for Drizzle + PostgreSQL, implemented in
packages/schema/src/plugins/tsvector.ts.

This plugin provides two independent but complementary APIs:

1. Schema API for generated search vectors through tsvector(...).
2. Query API for reusable compiled tsquery fragments through tsquery(...).

## Why this plugin exists

1. Keep FTS declarations close to schema definitions.
2. Support weighted relevance tiers with a fluent, typed chain.
3. Avoid repeated raw SQL for common query operations (match, rank, headline).
4. Preserve PostgreSQL-native behavior while improving ergonomics.

## Exports

- tsvector
- tsquery
- TsQuery
- FtsLanguage
- FtsWeight
- FtsSearchMode
- FtsNormalization
- FtsHeadlineOptions

## Quick start

```ts
import { index, pgTable, text } from 'drizzle-orm/pg-core';

import { tsvector } from '../../plugins/tsvector';

export const posts = pgTable(
  'posts',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    body: text('body'),
    tags: text('tags').array(),

    // Keep the generated vector last in the column map.
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
  (t) => [index('idx_posts_search_vector').using('gin', t.searchVector)],
);
```

## Schema API

### Fluent chain shape

```text
tsvector(name)
  .language(lang)?
  .cols(columns).weight(weight)
  .array(separator)?
  .cols(columns).weight(weight)
  ...
```

### Core concepts

1. Each .cols(...).weight(...) pair forms one weighted tier.
2. Each tier contributes setweight(to_tsvector(...), 'A'|'B'|'C'|'D').
3. Multiple tiers are concatenated with ||.
4. Bare column names are treated as identifiers.
5. Expression strings are passed through as raw SQL snippets.

### Input validation behavior

The plugin fails fast before SQL generation in these cases:

1. .language(' ') throws: tsvector: .language() requires a non-empty value.
2. .cols([]) throws: tsvector: .cols() requires at least one column or expression.
3. .cols(['city', ' ']) throws: tsvector: .cols() entry at index 1 is empty.
4. Accessing any method after .cols(...) except .weight(...) throws.

This avoids hidden malformed expressions later in migration or query execution.

### Column string rules

Use database DDL names and SQL fragments intentionally:

1. Identifier: city
2. Cast expression: year_built::text
3. Functional expression: lower(unparsed_address)

Examples:

```ts
.cols(['city'])
.cols(['year_built::text'])
.cols(['lower(unparsed_address)'])
```

### Array tiers

Calling .array(separator?) marks the current weighted tier as text[] input.

1. Default separator is a single space.
2. Generated SQL uses immutable_array_to_string(column, separator).
3. Helper function provisioning is outside plugin scope and must exist in DB runtime.

Example:

```ts
.cols(['appliances', 'heating'])
.weight('D')
.array(', ')
```

### Weight strategy guidance

Use weights to align relevance with user intent:

1. A: strict identifiers and exact names.
2. B: location context.
3. C: supporting metadata.
4. D: verbose narrative text and large feature arrays.

## Query API

tsquery(keywords, opts?) returns a TsQuery instance with reusable SQL helpers.

```ts
import { tsquery } from '../../plugins/tsvector';

const q = tsquery('waterfront seattle', {
  mode: 'websearch',
  language: 'english',
});
```

### Modes

1. websearch: default, user-friendly parsing.
2. plain: plain term parsing, no strict operators.
3. phrase: phrase matching behavior.
4. raw: PostgreSQL to_tsquery syntax; malformed input can fail.

### TsQuery instance API

1. mode(m): set parsing mode and invalidate cached compiled SQL.
2. language(l): set search config and invalidate cached compiled SQL.
3. isEmpty: true when keywords are empty or whitespace-only.
4. tsq: lazily compiled SQL tsquery fragment.
5. match(vectorCol): SQL boolean for vector @@ query.
6. notMatch(vectorCol): SQL boolean for NOT (vector @@ query).
7. rank(vectorCol, normalization?): ts_rank_cd expression.
8. rankSimple(vectorCol, normalization?): ts_rank expression.
9. headline(textCol, options?): ts_headline expression.
10. orderByRank(vectorCol, normalization?): descending rank expression.
11. orderByRankAsc(vectorCol, normalization?): ascending rank expression.

### Query composition example

```ts
import { and, desc } from 'drizzle-orm';

import { tsquery } from '../../plugins/tsvector';

const q = tsquery(searchInput, { mode: 'websearch', language: 'english' });

const whereClause = q.isEmpty ? undefined : q.match(posts.searchVector);

const query = db
  .select({
    id: posts.id,
    title: posts.title,
    rank: q.rank(posts.searchVector),
    snippet: q.headline(posts.body, {
      maxWords: 20,
      minWords: 5,
      startSel: '<mark>',
      stopSel: '</mark>',
    }),
  })
  .from(posts)
  .where(whereClause)
  .orderBy(q.orderByRank(posts.searchVector), desc(posts.id));
```

## SQL behavior summary

Schema API generates expressions shaped like:

1. to_tsvector(language::regconfig, concatenated_text)
2. setweight(..., 'A'|'B'|'C'|'D')
3. tier1 || tier2 || tier3

Query API compiles to one of:

1. websearch_to_tsquery(language, keywords)
2. plainto_tsquery(language, keywords)
3. phraseto_tsquery(language, keywords)
4. to_tsquery(language, keywords)

## Performance guidance

1. Plugin-chain/proxy overhead is negligible and schema-definition scoped.
2. Runtime cost comes from PostgreSQL execution, vector width, and index design.
3. Larger vectors increase write cost because generated vectors recompute on insert/update.
4. Use GIN indexes on search vector columns queried with @@.
5. Keep high-signal columns in stronger tiers and avoid over-indexing low-value text.

## Operational guidelines

1. Keep generated search vector as the last column in pgTable column maps.
2. Keep language consistent between schema vector generation and query construction.
3. Treat raw mode as advanced and validated input only.
4. Prefer websearch mode for user-entered search text.

## Error reference

Known plugin-thrown messages:

1. tsvector: no tiers defined
2. tsvector: .language() requires a non-empty value
3. tsvector: .cols() requires at least one column or expression
4. tsvector: .cols() entry at index N is empty
5. tsvector: .weight() called without a pending .cols()
6. tsvector: .weight() must follow .cols() before accessing "<property>"
7. tsvector: .cols([...]) was not followed by .weight()

## Test coverage

Behavioral tests live in packages/schema/src/plugins/tsvector.test.ts and currently cover:

1. language validation.
2. cols validation.
3. chain order enforcement.
4. tsquery empty-input behavior.
5. tsquery mode compilation smoke checks.

## Recommended future test additions

1. Snapshot tests of generated SQL for representative tier combinations.
2. Explicit tests for headline option rendering.
3. Integration tests validating GIN-backed search query plans.
