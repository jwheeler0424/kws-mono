import { properties, type TMlsMedia } from '@kws/schema';
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
  const listing = await db.query.properties.findFirst({
    columns: {
      NWM: false
    },
    extras: {
      NWM: sql<TPropertyNwmFlags>`jsonb_build_object(
        'NWM_IDXMustRemovePrimaryPhotoYN', ${properties.NWM}->>'NWM_IDXMustRemovePrimaryPhotoYN',
        'NWM_IDXMustRemovePhotosYN', ${properties.NWM}->>'NWM_IDXMustRemovePhotosYN',
        'NWM_ShowMapLink', ${properties.NWM}->>'NWM_ShowMapLink',
        'NWM_StyleCode', ${properties.NWM}->>'NWM_StyleCode'
      )`.as('NWM'),
    },
    where: {
      listingKey,
    },
    with: {
      media: {
        where: {
          deletedAt: {
            isNull: true,
          },
        },
        orderBy: {
          preferredPhotoYN: 'desc',
          order: 'asc',
        },
      },
    },
  });

  return listing ?? null;
}

export async function getListingMarkers() {
  const markers = await db.query.properties.findMany({
    columns: {
      listingKey: true,
    },
  });

  return markers;
}