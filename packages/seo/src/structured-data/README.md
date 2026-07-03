# Structured Data Builders

Type-safe JSON-LD builders for TypeScript applications.

This library provides strongly-typed helpers for generating [Schema.org](https://schema.org)
structured data for SEO, rich results, and search engine indexing.

It is designed for:

- Marketing websites
- Blogs / editorial content
- Local business websites
- SaaS landing pages
- Real estate portals
- Agent / brokerage platforms
- E-commerce product pages

Instead of manually writing JSON-LD objects, use typed builder functions that validate input shapes
and produce clean schema output.

---

## Features

- Fully typed TypeScript builders
- Minimal runtime overhead
- JSON-LD graph composition
- Reusable schema nodes
- SEO-focused defaults
- Schema composition for complex pages
- Rich support for real estate listings

---

## Installation

```bash
npm install your-package-name
```

or

```bash
bun add your-package-name
```

---

## Basic Usage

```ts
import { articleSchema, jsonLdScript } from '@your/package';

const schema = articleSchema({
  headline: 'How to Buy a House',
  url: 'https://example.com/blog/how-to-buy-a-house',
  datePublished: '2026-06-24',
  author: {
    name: 'Jane Doe',
  },
});

const scripts = jsonLdScript(schema);
```

Output:

```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "How to Buy a House",
  ...
}
```

---

# Core Helpers

---

## `jsonLd`

Wraps a schema object with `@context`.

```ts
jsonLd({
  '@type': 'Thing',
  name: 'Example',
});
```

Output:

```json
{
  "@context": "https://schema.org",
  "@type": "Thing",
  "name": "Example"
}
```

---

## `jsonLdScript`

Converts schema nodes into script tags.

```ts
const scripts = jsonLdScript(schema);
```

Returns:

```ts
SeoScriptTag[]
```

Useful for framework head injection.

---

## `jsonLdGraph`

Combines multiple schema nodes into a single script using `@graph`.

Useful when:

- a page has multiple schema objects
- you want a single script tag
- Google Rich Results prefers consolidated JSON-LD

Example:

```ts
const graph = jsonLdGraph([
  websiteSchema(...),
  organizationSchema(...),
  breadcrumbListSchema(...),
])
```

Output:

```json
{
  "@context": "https://schema.org",
  "@graph": [...]
}
```

---

# Available Builders

---

## Content / Editorial

### `articleSchema`

Supports:

- Article
- BlogPosting
- NewsArticle

Example:

```ts
articleSchema({
  type: 'BlogPosting',
  headline: 'Best Mortgage Rates',
  url: 'https://example.com/blog/rates',
  datePublished: '2026-01-01',
  author: {
    name: 'John Smith',
  },
});
```

---

## `faqPageSchema`

Creates FAQ rich result markup.

```ts
faqPageSchema([
  {
    question: 'What is escrow?',
    answer: 'Escrow is ...',
  },
]);
```

---

## `breadcrumbListSchema`

```ts
breadcrumbListSchema([
  { name: 'Home', url: '/' },
  { name: 'Blog', url: '/blog' },
]);
```

---

## `videoObjectSchema`

Video structured data.

Supports:

- thumbnails
- upload dates
- duration
- embed URLs

Example:

```ts
videoObjectSchema({
  name: 'Market Update',
  description: 'Weekly market update',
  thumbnailUrl: 'https://cdn.example.com/thumb.jpg',
  uploadDate: '2026-06-01',
});
```

---

# Business Builders

---

## `organizationSchema`

For company / brand schema.

Supports:

- logo
- sameAs
- contact points

Example:

```ts
organizationSchema({
  name: 'Acme Realty',
  url: 'https://acme.com',
  logo: 'https://acme.com/logo.png',
});
```

---

## `localBusinessSchema`

Supports:

- address
- geo coordinates
- phone
- hours
- pricing

Example:

```ts
localBusinessSchema({
  name: 'Acme Realty Downtown',
  address: {
    streetAddress: '123 Main St',
    addressLocality: 'Austin',
    postalCode: '78701',
    addressCountry: 'US',
  },
});
```

---

## `serviceSchema`

For service businesses.

Examples:

- mortgage consulting
- inspections
- property management
- brokerage services

---

# People / Profile Builders

---

## `personSchema`

Supports:

- image
- employer
- social links
- job title

Example:

```ts
personSchema({
  name: 'John Smith',
  jobTitle: 'Realtor',
});
```

---

## `profilePageSchema`

Use for author pages, agent profiles, team pages.

Example:

```ts
profilePageSchema({
  url: 'https://example.com/agents/jane',
  name: 'Jane Doe',
  mainEntity: {
    name: 'Jane Doe',
    jobTitle: 'Broker Associate',
  },
});
```

---

# Commerce Builders

---

## `productSchema`

Supports:

- offers
- ratings
- pricing
- SKU
- brand

Example:

```ts
productSchema({
  name: 'Luxury Condo Package',
  offers: {
    price: 500000,
    priceCurrency: 'USD',
  },
});
```

---

## `reviewSchema`

Individual review schema.

Example:

```ts
reviewSchema({
  author: 'Alice',
  reviewBody: 'Fantastic experience',
  reviewRating: {
    ratingValue: 5,
  },
});
```

---

## `aggregateRatingSchema`

Aggregate rating metadata.

Example:

```ts
aggregateRatingSchema({
  ratingValue: 4.9,
  reviewCount: 124,
});
```

---

# Website Builders

---

## `websiteSchema`

Supports sitelinks search box.

Example:

```ts
websiteSchema({
  name: 'Acme Realty',
  url: 'https://acme.com',
  searchUrlTemplate: 'https://acme.com/search?q={search_term_string}',
});
```

---

# Real Estate Builders

This package includes advanced real-estate schema support.

---

## `residenceSchema`

Supports:

- houses
- apartments
- rooms
- suites
- rentals

Example:

```ts
residenceSchema({
  type: 'SingleFamilyResidence',
  name: 'Luxury Hillside Home',
  address: {
    streetAddress: '1 Ocean View',
    addressLocality: 'Malibu',
    postalCode: '90265',
    addressCountry: 'US',
  },
  numberOfBedrooms: 4,
  numberOfBathroomsTotal: 3,
});
```

---

## `apartmentComplexSchema`

Use for multifamily communities.

Supports:

- unit counts
- available inventory
- amenities
- bedroom ranges

---

## `realEstateListingSchema`

Listing-level schema.

Supports:

- sale listings
- rental listings
- pricing
- seller
- open houses
- reviews
- ratings

Example:

```ts
realEstateListingSchema({
  name: 'Luxury Condo Listing',
  url: 'https://example.com/listing/123',
  about: residenceSchema(...),
  offers: {
    price: 850000,
    priceCurrency: 'USD',
  },
})
```

---

## `realEstateAgentSchema`

Agent / brokerage structured data.

Supports:

- service area
- contact info
- ratings
- reviews

---

## `openHouseSchema`

Event schema specialized for open houses.

Supports:

- one-time events
- recurring schedules
- virtual or physical tours

Example:

```ts
openHouseSchema({
  name: 'Saturday Open House',
  url: 'https://example.com/listing/123',
  startDate: '2026-07-01T12:00:00-07:00',
  location: {
    name: 'Listing Property',
    address: {
      streetAddress: '123 Main',
      addressLocality: 'Austin',
      postalCode: '78701',
      addressCountry: 'US',
    },
  },
});
```

---

# Combining Schemas

A page often contains multiple schema nodes.

Example:

```ts
const graph = jsonLdGraph([
  websiteSchema(...),
  organizationSchema(...),
  articleSchema(...),
  breadcrumbListSchema(...),
])
```

Recommended patterns:

### Blog Post Page

- WebSite
- Organization
- Article
- BreadcrumbList
- FAQPage (optional)

### Product Page

- Product
- AggregateRating
- Review
- BreadcrumbList

### Real Estate Listing Page

- RealEstateListing
- Residence
- RealEstateAgent
- OpenHouse
- Review
- AggregateRating

### Agent Profile Page

- ProfilePage
- Person
- RealEstateAgent
- Review

---

# Framework Integration

---

## React / Next.js

```tsx
<script
  type='application/ld+json'
  dangerouslySetInnerHTML={{
    __html: JSON.stringify(schema),
  }}
/>
```

---

## TanStack Start / SSR

```ts
head: () => ({
  scripts: jsonLdScript(schema),
});
```

---

# Design Philosophy

This library intentionally:

- prefers composition over inheritance
- keeps builders narrowly scoped
- avoids giant schema abstractions
- preserves raw schema.org compatibility

If Schema.org introduces new properties, you can extend builders or compose custom JSON-LD nodes
using `jsonLd()`.

---

# Extending

You can build custom schemas:

```ts
import { jsonLd } from '@your/package';

const customSchema = jsonLd({
  '@type': 'SoftwareApplication',
  name: 'My App',
});
```

---

# License

MIT
