/**
 * SILAGEGUARD AI V4 — Authentication Service
 * Manages Farmer profiles, OTP verification, guest mode, and offline scan rights.
 */

import { apiClient, ApiResponse } from "../api/client";
import { API_CONFIG } from "../../constants/api";
import { storageService } from "../storage/storageService";
import { AuthTokens, UserProfile } from "../../types/backend";
import { useAppStore } from "../../store/useAppStore";

export const authService = {
  /**
   * Request OTP for farmer phone number
   */
  async requestOtp(phone: string): Promise<ApiResponse<{ otp_sent: boolean; dev_otp?: string }>> {
    return apiClient.post("/api/v1/auth/otp/request", { phone });
  },

  /**
   * Verify OTP and persist session tokens
   */
  async verifyOtp(phone: string, otp: string): Promise<ApiResponse<{ tokens: AuthTokens; profile: UserProfile }>> {
    const res = await apiClient.post<{ tokens: AuthTokens; profile: UserProfile }>("/api/v1/auth/otp/verify", {
      phone,
      otp,
    });

    if (res.success && res.data?.tokens) {
      await storageService.saveTokens(res.data.tokens);
      if (res.data.profile) {
        await storageService.saveUserProfile(res.data.profile);
        useAppStore.getState().setUser(res.data.profile);
      }
    }

    return res;
  },

  /**
   * Login with email/password if configured
   */
  async login(credentials: { email?: string; phone?: string; password?: string }): Promise<ApiResponse<AuthTokens>> {
    const res = await apiClient.post<AuthTokens>(API_CONFIG.ENDPOINTS.AUTH_LOGIN, credentials);
    if (res.success && res.data) {
      await storageService.saveTokens(res.data);
    }
    return res;
  },

  /**
   * Switch to offline Guest mode (immediate scan access for farmers without network)
   */
  async enableGuestMode(): Promise<UserProfile> {
    const guestProfile: UserProfile = {
      id: "GUEST-FARMER",
      phone: "0000000000",
      name: "Guest Farmer",
      full_name: "Guest Farmer",
      district: "Local Field",
      state: "Offline",
      role: "farmer",
      isGuest: true,
    };
    useAppStore.getState().setUser(guestProfile);
    useAppStore.getState().setGuestMode(true);
    await storageService.saveUserProfile(guestProfile);
    return guestProfile;
  },

  /**
   * Restore persisted session on app launch
   */
  async restoreSession(): Promise<UserProfile | null> {
    const tokens = await storageService.getTokens();
    const profile = await storageService.getUserProfile();

    if (profile) {
      useAppStore.getState().setUser(profile);
      return profile;
    }

    if (tokens?.accessToken) {
      const meRes = await apiClient.get<UserProfile>(API_CONFIG.ENDPOINTS.AUTH_ME);
      if (meRes.success && meRes.data) {
        await storageService.saveUserProfile(meRes.data);
        useAppStore.getState().setUser(meRes.data);
        return meRes.data;
      }
    }

    // Default to Guest Mode for immediate offline utility
    return this.enableGuestMode();
  },

  /**
   * Logout and clear local credentials
   */
  async logout(): Promise<void> {
    await storageService.clearTokens();
    await storageService.removeItem("sg_user_profile");
    useAppStore.getState().setUser(null);
    useAppStore.getState().setGuestMode(true);
  },
};
