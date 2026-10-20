// SILAGEGUARD AI — Image Quality Assessment (IQA) & Preprocessing
// Validates silage photographs before feeding them to MobileNet vision inference

export class ImageValidator {
  /**
   * Assesses image usability for fungal/mould screening
   * Inspects base64 payload size, resolution, and blank/covered frames
   */
  static validate(base64Data, metadata = {}) {
    if (!base64Data || typeof base64Data !== "string") {
      return {
        isValid: false,
        reasons: ["No photo captured. Please snap a picture of the silage face."],
      };
    }

    const cleanBase64 = base64Data.replace(/^data:image\/[a-z]+;base64,/, "");

    // 1. Minimum size check (must be at least ~4KB to avoid blank/corrupted files)
    if (cleanBase64.length < 4096) {
      return {
        isValid: false,
        reasons: ["Photo is too dark or camera lens was covered. Please retake."],
      };
    }

    // 2. Minimum resolution check if width/height available
    if ((metadata.width && metadata.width < 200) || (metadata.height && metadata.height < 200)) {
      return {
        isValid: false,
        reasons: ["Photo resolution is too low. Please hold steady and retake."],
      };
    }

    // 3. Maximum upload limit (must be within reasonable mobile upload limits < 10MB)
    if (cleanBase64.length > 10 * 1024 * 1024) {
      return {
        isValid: false,
        reasons: ["Photo size is too large for low-bandwidth rural cellular network."],
      };
    }

    return {
      isValid: true,
      sizeBytes: Math.round((cleanBase64.length * 3) / 4),
      reasons: [],
    };
  }
}
