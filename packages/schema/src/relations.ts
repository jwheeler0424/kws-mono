import { defineRelationsPart } from 'drizzle-orm';

import * as schema from './schema';

// Add new relation parts here as they are introduced.
export const relations = {
  ...defineRelationsPart(schema),
  ...schema.authRelations,
  ...schema.blogCommentRelations,
  ...schema.blogPostRelations,
  ...schema.blogPreviewTokenRelations,
  ...schema.blogTaxonomyRelations,
  ...schema.mediaRelations,
  ...schema.mlsRelations,
  ...schema.taxonomiesRelations,
  ...schema.termMetaRelations,
};
