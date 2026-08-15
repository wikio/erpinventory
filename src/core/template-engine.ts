export type MergeContext = Record<string, string | number | boolean | null | undefined>;

const MERGE_FIELD = /{{\s*([^{}]+?)\s*}}/g;

export function mergeFields(template: string, context: MergeContext): string {
  return String(template).replace(MERGE_FIELD, (_match, key: string) => String(context[key] ?? ''));
}

export function mergeFieldNames(template: string): string[] {
  return [...String(template).matchAll(MERGE_FIELD)].map((match) => match[1].trim());
}

export function assertSafeTemplateSize(template: string, maxBytes = 1_000_000): void {
  if (new TextEncoder().encode(template).byteLength > maxBytes) throw new RangeError('Template exceeds the safe size limit');
}
