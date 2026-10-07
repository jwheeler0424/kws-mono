export const FEATURED_PROPERTY_STATUSES = ['Active'] as const;

export interface FeaturedPropertyCandidate {
  standardStatus: string | null;
  mlgCanView: boolean;
  deletedAt: Date | string | null;
  listAgentMlsId: string | null;
  coListAgentMlsId: string | null;
  buyerAgentMlsId: string | null;
  coBuyerAgentMlsId: string | null;
}

export function createFeaturedPropertyMatcher(memberIds: readonly string[]) {
  const memberScope = new Set(memberIds.map((memberId) => memberId.trim()).filter(Boolean));

  return (property: FeaturedPropertyCandidate): boolean => {
    if (
      property.standardStatus !== 'Active' ||
      !property.mlgCanView ||
      property.deletedAt !== null
    ) {
      return false;
    }

    return [
      property.listAgentMlsId,
      property.coListAgentMlsId,
      property.buyerAgentMlsId,
      property.coBuyerAgentMlsId,
    ].some((memberId) => Boolean(memberId && memberScope.has(memberId.trim())));
  };
}
