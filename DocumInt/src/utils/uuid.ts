/**
 * Generate a UUID v4 with fallback for environments that don't support crypto.randomUUID
 */
export function generateUUID(): string {
  // Check if crypto.randomUUID is available (secure context required)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback implementation using Math.random() for compatibility
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
