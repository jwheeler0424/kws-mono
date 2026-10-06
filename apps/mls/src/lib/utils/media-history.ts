export function omitMediaUrl(key: string, value: unknown): unknown {
  return key === 'MediaURL' || key === 'mediaURL' ? undefined : value;
}
