import { type TMlsMedia } from '@kws/schema';
import type { PropertyListing, TPropertyNwmFlags } from '@kws/types';

import { db } from '@/lib/database';
import { sql } from 'drizzle-orm';

export type TPropertyWithMedia = Omit<PropertyListing, 'NWM'> & {
  NWM: TPropertyNwmFlags | null;
  media: TMlsMedia[];
};

export async function getListingDetailByKey(
  { listingKey }: { listingKey: string },
): Promise<TPropertyWithMedia | null> {
  const [listing, media] = await Promise.all([
    db.query.properties.findFirst({
      columns: {
        NWM: false,
      },
      extras: {
        NWM: (table) => sql<TPropertyNwmFlags>`jsonb_build_object(
          'NWM_IDXMustRemovePrimaryPhotoYN', ${table.NWM}->>'NWM_IDXMustRemovePrimaryPhotoYN',
          'NWM_IDXMustRemovePhotosYN', ${table.NWM}->>'NWM_IDXMustRemovePhotosYN',
          'NWM_ShowMapLink', ${table.NWM}->>'NWM_ShowMapLink',
          'NWM_StyleCode', ${table.NWM}->>'NWM_StyleCode'
        )`,
      },
      where: {
        listingKey,
      },
    }),
    db.query.mlsMedia.findMany({
      columns: {
        mediaURL: false,
      },
      where: {
        resourceRecordKey: listingKey,
      },
      with: {
        media: {
          with: {
            variants: {
              columns: {
                url: true,
              },
              where: {
                variantName: 'full',
              },
              limit: 1,
            },
          },
        },
      },
      orderBy: (media, { desc }) => [desc(media.preferredPhotoYN), media.order],
    }),
  ]);

  const mediaWithUrl: TMlsMedia[] = media.map((m) => ({
    ...m,
    mediaURL: m.media?.variants?.[0]?.url ?? null,
  }));

  return listing ? { ...listing, media: mediaWithUrl } : null;
}

export async function getListingMarkers() {
  const markers = await db.query.properties.findMany({
    columns: {
      listingKey: true,
    },
  });

  return markers;
}