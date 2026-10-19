let handler: (() => Promise<void>) | undefined;
let active: Promise<void> | undefined;

export function setMediaPriorityHandler(next: () => Promise<void>) {
  handler = next;
}

export async function servicePriorityMedia(): Promise<void> {
  if (!handler) return;
  active ??= handler().finally(() => {
    active = undefined;
  });
  await active;
}
