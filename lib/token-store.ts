// Module-level singleton shared by /api/tokenize and /api/detokenize.
// In-memory only — resets when the server process restarts.

export interface TokenMap {
  map: Record<string, string>; // token → original value
  createdAt: Date;
  text: string; // original text, kept for reference
}

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export const tokenMaps = new Map<string, TokenMap>();

export function purgeExpired(): void {
  const now = Date.now();
  for (const [id, entry] of tokenMaps) {
    if (now - entry.createdAt.getTime() > TOKEN_TTL_MS) {
      tokenMaps.delete(id);
    }
  }
}
