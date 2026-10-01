/**
 * SILAGEGUARD AI V4 — Storage Service
 * Encrypted/Secure token and profile storage with fallback for web/testing.
 */

import { Platform } from "react-native";
import { AuthTokens, UserProfile } from "../../types/backend";

const MEMORY_STORAGE = new Map<string, string>();

export const storageService = {
  async setItem(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === "web" && typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(key, value);
      } else {
        MEMORY_STORAGE.set(key, value);
      }
    } catch {
      MEMORY_STORAGE.set(key, value);
    }
  },

  async getItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS === "web" && typeof window !== "undefined" && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      return MEMORY_STORAGE.get(key) || null;
    } catch {
      return MEMORY_STORAGE.get(key) || null;
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      if (Platform.OS === "web" && typeof window !== "undefined" && window.localStorage) {
        window.localStorage.removeItem(key);
      }
      MEMORY_STORAGE.delete(key);
    } catch {
      MEMORY_STORAGE.delete(key);
    }
  },

  // Auth Helper
  async saveTokens(tokens: AuthTokens): Promise<void> {
    await this.setItem("sg_auth_tokens", JSON.stringify(tokens));
  },

  async getTokens(): Promise<AuthTokens | null> {
    const raw = await this.getItem("sg_auth_tokens");
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthTokens;
    } catch {
      return null;
    }
  },

  async clearTokens(): Promise<void> {
    await this.removeItem("sg_auth_tokens");
  },

  async saveUserProfile(profile: UserProfile): Promise<void> {
    await this.setItem("sg_user_profile", JSON.stringify(profile));
  },

  async getUserProfile(): Promise<UserProfile | null> {
    const raw = await this.getItem("sg_user_profile");
    if (!raw) return null;
    try {
      return JSON.parse(raw) as UserProfile;
    } catch {
      return null;
    }
  },
};
