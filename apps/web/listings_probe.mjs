import { db } from './src/lib/database/index.ts';
import { getListingsForSearchAndFilter } from './src/features/mls/queries/listings.ts';

const search = await getListingsForSearchAndFilter({});
const ids = search.markers.slice(0, 5).map((m) => String(m.id));
console.log('sample ids', ids);

const pool = db.$client;
const r1 = await pool.query('select count(*)::int as c from properties where id = any($1)', [ids]);
console.log('count any(no-cast)=', r1.rows[0]);

const r2 = await pool.query('select count(*)::int as c from properties where id = any($1::uuid[])', [ids]);
console.log('count any(uuid-cast)=', r2.rows[0]);

const r3 = await pool.query('select count(*)::int as c from properties where id = $1::uuid', [ids[0]]);
console.log('count eq single uuid-cast=', r3.rows[0]);
