const isDev = import.meta.env.DEV;

export function logError(context: string, error: unknown) {
  if (!isDev) return;
  console.error(`[${context}]`, error);
}
