/**
 * localStorage cache utility — fallback when the API is unreachable.
 * All keys are prefixed with "mct_" to avoid collisions.
 */
export const localCache = {
  get: (key) => {
    try {
      const item = localStorage.getItem(`mct_${key}`);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  },
  set: (key, value) => {
    try {
      localStorage.setItem(`mct_${key}`, JSON.stringify(value));
    } catch (e) {
      console.warn('localStorage write failed:', e);
    }
  },
  clear: (key) => {
    try {
      localStorage.removeItem(`mct_${key}`);
    } catch {}
  }
};
