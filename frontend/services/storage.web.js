// SILAGEGUARD AI — Web Storage Implementation (Zero native SQLite dependencies)
// Uses browser window.localStorage for persistent key-value configuration

export const Storage = {
  async getItem(key) {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      return null;
    } catch (e) {
      console.warn("Storage.getItem error:", e.message);
      return null;
    }
  },

  async setItem(key, value) {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(key, String(value));
      }
    } catch (e) {
      console.warn("Storage.setItem error:", e.message);
    }
  },
};
