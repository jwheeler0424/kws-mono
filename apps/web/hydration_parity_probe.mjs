import { sql } from 'drizzle-orm';

import { getListingsForSearchAndFilter } from './src/features/mls/queries/listings.ts';
import { getPropertyCardQueryConfig } from './src/features/mls/queries/properties.ts';
import { db } from './src/lib/database/index.ts';

const search = await getListingsForSearchAndFilter({});
const uuids = search.markers.slice(0, 24).map((m) => m.id);
console.log('uuids', uuids.length);

const cfg = getPropertyCardQueryConfig();
const rows = await db.query.properties
  .findMany({
    ...cfg,
    where: {
      RAW: (table) => sql`${table.id} = ANY(${sql.placeholder('uuids')})`,
    },
  })
  .prepare('hydration_parity_probe')
  .execute({ uuids });

console.log('rows', rows.length);
console.log('first row keys', rows[0] ? Object.keys(rows[0]).slice(0, 10) : []);
