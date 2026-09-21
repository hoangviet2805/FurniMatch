const mojibake = /[ÃÂÆÐ]/;

/** Restores UTF-8 Vietnamese text that was previously saved as Windows-1252. */
export const repairVietnameseText = (value: string): string => {
  if (!mojibake.test(value)) return value;
  try {
    const bytes = Uint8Array.from(value, character => character.charCodeAt(0));
    const repaired = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return repaired.includes('�') ? value : repaired;
  } catch {
    return value;
  }
};

export const repairResponseText = (value: unknown): unknown => {
  if (typeof value === 'string') return repairVietnameseText(value);
  if (Array.isArray(value)) return value.map(repairResponseText);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, repairResponseText(item)]));
  }
  return value;
};
