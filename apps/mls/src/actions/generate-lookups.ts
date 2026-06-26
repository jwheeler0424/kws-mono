import { db } from "@/lib/database";


export async function generateLookups({ minDate = null, maxDate, firstFetch = false, lastModifiedTimestamp = null }: {
  minDate: Date | number | null,
  maxDate: Date | number | null,
  firstFetch?: boolean,
  lastModifiedTimestamp?: Date | null
}) {
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
  const startDate = minDate ??
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
      startDate,
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
          .insert(lookups)
          .values(officeRecord)
          .onConflictDoUpdate({
            target: [lookups.lookupKey],
            set: officeRecord,
          })
      )
    );

    // 6. Move on to the next page.
    nextLink = newNext;
  } while (nextLink);
}
