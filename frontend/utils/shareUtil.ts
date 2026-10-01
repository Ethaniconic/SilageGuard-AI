/**
 * SILAGEGUARD AI V4 - Robust Cross-Platform Clipboard & Share Utility
 * Operates reliably across Web (Chrome, Firefox, Safari, Edge), iOS, and Android.
 * Handles desktop browser permission quirks, mobile share sheets, and clipboard fallbacks.
 */

import { Platform, Share, Clipboard } from "react-native";

export interface ShareResult {
  success: boolean;
  copied: boolean;
  shared: boolean;
}

export async function shareOrCopyPayload(
  text: string,
  title: string = "SilageGuard QR Payload"
): Promise<ShareResult> {
  if (!text) {
    return { success: false, copied: false, shared: false };
  }

  // 1. Web Platform: Primary path is Clipboard API with Textarea fallback
  if (Platform.OS === "web") {
    // Attempt modern async clipboard
    if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return { success: true, copied: true, shared: false };
      } catch (clipErr) {
        console.warn("Async clipboard failed, trying execCommand fallback:", clipErr);
      }
    }

    // Attempt textarea execCommand copy fallback
    if (typeof document !== "undefined") {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        textarea.style.pointerEvents = "none";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        const copySuccess = document.execCommand("copy");
        document.body.removeChild(textarea);
        if (copySuccess) {
          return { success: true, copied: true, shared: false };
        }
      } catch (docErr) {
        console.warn("execCommand copy failed:", docErr);
      }
    }

    // If Web Share API is available on mobile web browser
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title,
          text,
        });
        return { success: true, copied: false, shared: true };
      } catch (shareErr: any) {
        if (shareErr?.name === "AbortError") {
          return { success: true, copied: false, shared: false };
        }
      }
    }

    return { success: false, copied: false, shared: false };
  }

  // 2. Native Mobile (iOS / Android)
  try {
    const shareResult = await Share.share({
      title,
      message: text,
    });
    if (shareResult.action === Share.sharedAction) {
      return { success: true, copied: false, shared: true };
    }
    return { success: true, copied: false, shared: false };
  } catch (nativeShareErr) {
    console.warn("Native share failed, copying to clipboard:", nativeShareErr);
    try {
      Clipboard.setString(text);
      return { success: true, copied: true, shared: false };
    } catch {
      return { success: false, copied: false, shared: false };
    }
  }
}
