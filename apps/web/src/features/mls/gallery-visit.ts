export function isAutomatedGalleryVisit(userAgent: string, purpose = ''): boolean {
  return (
    /bot|crawler|spider|slurp|facebookexternalhit|preview|prerender/i.test(userAgent) ||
    /prefetch|prerender/i.test(purpose)
  );
}
