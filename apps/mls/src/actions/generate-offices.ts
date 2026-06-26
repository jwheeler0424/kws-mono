import { db } from "@/lib/database/drizzle";
import { fetchOffices } from "./fetch";
import { throttle } from "@/lib/utils/queued-throttle";
import { formatOffices } from "./format";
import { office } from "@/lib/database/schema/mls.schema";
import { batchPromises } from "@/lib/utils/batch-promises";

const throttledFetchOffices = throttle(fetchOffices, 200);

export async function generateOffices(
  maxDate: Date | number | null = null,
  firstFetch = false,
  lastModifiedTimestamp: Date | null = null
) {
  // 1. Find the most recent modification time (or default to Jan 1 of three years ago).
  const lastModified =
    !firstFetch && !lastModifiedTimestamp
      ? await db.query.office.findFirst({
          columns: { modificationTimestamp: true },
          orderBy: (office, { desc }) => desc(office.modificationTimestamp),
        })
      : null;

  const currentYear = new Date().getFullYear();
  const startYear = currentYear - 2;
  const minDate =
    lastModified?.modificationTimestamp ??
    lastModifiedTimestamp ??
    new Date(`${startYear}-01-01`);

  // 2. We'll page through offices using just a nextLink token.
  let nextLink: string | null = null;
  let iteration = 1;

  do {
    // 3. Fetch a batch of offices.
    console.log(`Fetching property offices (Iteration: ${iteration++})...`);
    const { offices, nextLink: newNext } = await throttledFetchOffices(
      minDate,
      nextLink,
      maxDate
    );

    // 4. Stop if nothing came back.
    if (!Array.isArray(offices) || offices.length === 0) break;

    // 5. Format and immediately process each office in this batch.
    const formattedOffices = formatOffices(offices);

    await batchPromises(
      formattedOffices.map((officeRecord) =>
        db
          .insert(office)
          .values(officeRecord)
          .onConflictDoUpdate({
            target: [office.officeMlsId],
            set: officeRecord,
          })
      )
    );

    // 6. Move on to the next page.
    nextLink = newNext;
  } while (nextLink);
}
