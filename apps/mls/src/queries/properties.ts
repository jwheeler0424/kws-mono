import { db } from "@/lib/database";
import { env } from '@kws/config';

export const getLatestPropertyTimestamp = async () => {
  const result = await db.query.properties.findFirst({
    columns:{
      modificationTimestamp: true
    },
    orderBy: (properties, { desc }) => desc(properties.modificationTimestamp),
  });
  return result?.modificationTimestamp ?? env.MLS_START_DATE;
};