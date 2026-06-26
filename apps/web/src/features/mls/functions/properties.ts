import { shuffle } from '@/lib/tools/shuffle';
import { env } from '@kws/config';
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { getAvailableProperties, getFeaturedProperties, getPendingProperties, getSoldProperties } from '../queries';

const MAX_FEATURED_PROPERTIES = 24;

const propertyCardQueryParamsSchema = z.object({
  officeIds: z.array(z.string().min(1)).optional(),
  memberIds: z.array(z.string().min(1)).optional(),
});

export const getAvailablePropertiesServerFn = createServerFn({ method: 'GET' })
  .validator(propertyCardQueryParamsSchema)
  .handler(({ data }) => getAvailableProperties({
    officeIds: data.officeIds ?? (env.MLS_OFFICE_ID ? env.MLS_OFFICE_ID : undefined),
    memberIds: data.memberIds ?? (env.MLS_MEMBER_ID ? env.MLS_MEMBER_ID : undefined),
    ...data,
  }));

export const getFeaturedPropertiesServerFn = createServerFn({ method: 'GET' })
  .validator(propertyCardQueryParamsSchema)
  .handler(async ({ data }) => {
    const featuredProperties = await getFeaturedProperties({
      officeIds: data.officeIds ?? (env.MLS_OFFICE_ID ? env.MLS_OFFICE_ID : undefined),
      memberIds: data.memberIds ?? (env.MLS_MEMBER_ID ? env.MLS_MEMBER_ID : undefined),
      ...data,
    });
    // Keep payload small for homepage rendering; shuffle only the bounded set.
    return shuffle(featuredProperties.slice(0, MAX_FEATURED_PROPERTIES));
  });

export const getPendingPropertiesServerFn = createServerFn({ method: 'GET' })
  .validator(propertyCardQueryParamsSchema)
  .handler(({ data }) => getPendingProperties({
    officeIds: data.officeIds ?? (env.MLS_OFFICE_ID ? env.MLS_OFFICE_ID : undefined),
    memberIds: data.memberIds ?? (env.MLS_MEMBER_ID ? env.MLS_MEMBER_ID : undefined),
    ...data,
  }));

export const getSoldPropertiesServerFn = createServerFn({ method: 'GET' })
  .validator(propertyCardQueryParamsSchema)
  .handler(({ data }) => getSoldProperties({
    officeIds: data.officeIds ?? (env.MLS_OFFICE_ID ? env.MLS_OFFICE_ID : undefined),
    memberIds: data.memberIds ?? (env.MLS_MEMBER_ID ? env.MLS_MEMBER_ID : undefined),
    ...data,
  }));