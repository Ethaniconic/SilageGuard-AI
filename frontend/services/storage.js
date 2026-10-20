// Cross-platform key-value persistent storage for Expo (Web localStorage + Native SQLite fallback)
import * as SQLite from "expo-sqlite";
import { Platform } from "react-native";

let db = null;
if (Platform.OS !== "web") {
  try {
    db = SQLite.openDatabaseSync("silageguard_app.db");
    db.execSync(`
      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);
  } catch (err) {
    console.warn("SQLite storage init fallback:", err.message);
  }
}

export const Storage = {
  async getItem(key) {
    try {
      if (Platform.OS === "web" && typeof window !== "undefined" && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      if (db) {
        const row = db.getFirstSync("SELECT value FROM app_settings WHERE key = ?", [key]);
        return row ? row.value : null;
      }
      return null;
    } catch (e) {
      console.warn("Storage.getItem error:", e.message);
      return null;
    }
  },

  async setItem(key, value) {
    try {
      if (Platform.OS === "web" && typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(key, String(value));
        return;
      }
      if (db) {
        db.runSync(
          "INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)",
          [key, String(value)]
        );
      }
    } catch (e) {
      console.warn("Storage.setItem error:", e.message);
    }
  },
};
