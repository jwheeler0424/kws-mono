export function createRunId(prefix: string): string {
  const stamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${stamp}-${rand}`;
}
