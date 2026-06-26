import { db } from "@/lib/database/drizzle";
import { fetchMembers } from "./fetch";
import { throttle } from "@/lib/utils/queued-throttle";
import { formatMembers } from "./format";
import { member } from "@/lib/database/schema/mls.schema";
import { batchPromises } from "@/lib/utils/batch-promises";

const throttledFetchMembers = throttle(fetchMembers, 200);

export async function generateMembers(
  includeOffice = false,
  maxDate: Date | number | null = null,
  firstFetch = false,
  lastModifiedTimestamp: Date | null = null
) {
  // 1. Find the most recent modification time (or default to Jan 1 of three years ago).
  const lastModified =
    !firstFetch && !lastModifiedTimestamp
      ? await db.query.member.findFirst({
          columns: { modificationTimestamp: true },
          orderBy: (member, { desc }) => desc(member.modificationTimestamp),
        })
      : null;

  const currentYear = new Date().getFullYear();
  const startYear = currentYear - 2;
  const minDate =
    lastModified?.modificationTimestamp ??
    lastModifiedTimestamp ??
    new Date(`${startYear}-01-01`);

  // 2. We'll page through members using just a nextLink token.
  let nextLink: string | null = null;
  let iteration = 1;

  do {
    // 3. Fetch a batch of members.
    console.log(`Fetching MLS members (Iteration: ${iteration++})...`);
    const { members, nextLink: newNext } = await throttledFetchMembers(
      minDate,
      nextLink,
      includeOffice,
      maxDate
    );

    // 4. Stop if nothing came back.
    if (!Array.isArray(members) || members.length === 0) break;

    // 5. Format and immediately process each member in this batch.
    const formattedMembers = formatMembers(members);

    await batchPromises(
      formattedMembers.map((memberRecord) =>
        db
          .insert(member)
          .values(memberRecord)
          .onConflictDoUpdate({
            target: [member.memberMlsId],
            set: memberRecord,
          })
      )
    );

    // 6. Move on to the next page.
    nextLink = newNext;
  } while (nextLink);
}
