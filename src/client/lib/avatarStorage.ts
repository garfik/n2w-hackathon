const STORAGE_KEY = 'n2w_avatar_ids';

/** Get all avatar IDs from localStorage. */
export function getAvatarIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((id): id is string => typeof id === 'string');
    return [];
  } catch {
    return [];
  }
}

/** Add an avatar ID to localStorage (prepend so newest first). */
export function addAvatarId(id: string): void {
  const ids = getAvatarIds().filter((existing) => existing !== id);
  ids.unshift(id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

/** Remove an avatar ID from localStorage. */
export function removeAvatarId(id: string): void {
  const ids = getAvatarIds().filter((existing) => existing !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

/** Check if any avatar IDs exist in localStorage. */
export function hasAvatarIds(): boolean {
  return getAvatarIds().length > 0;
}
