/**
 * SILAGEGUARD AI V4 — Agricultural Crop & Storage Profiles
 * Agronomic profiles for Indian fodder crops and typical dairy ensiling structures.
 */

export interface CropProfile {
  id: string;
  name: string;
  vernacularNames: {
    hi: string;
    mr: string;
    kn: string;
    te: string;
  };
  optimalPhMin: number;
  optimalPhMax: number;
  optimalMoistureMin: number;
  optimalMoistureMax: number;
  typicalHarvestStage: string;
  packingAdvice: string;
}

export const CROP_PROFILES: Record<string, CropProfile> = {
  CORN_MAIZE: {
    id: "CORN_MAIZE",
    name: "Corn / Maize (मक्का)",
    vernacularNames: {
      hi: "मक्का (Corn)",
      mr: "मका (Maize)",
      kn: "ಮೆಕ್ಕೆಜೋಳ (Maize)",
      te: "మొక్కజొన్న (Maize)"
    },
    optimalPhMin: 3.80,
    optimalPhMax: 4.20,
    optimalMoistureMin: 62.0,
    optimalMoistureMax: 68.0,
    typicalHarvestStage: "1/2 to 2/3 milk-line kernel stage",
    packingAdvice: "Chop length 12–19 mm. Heavy tractor compaction in 15 cm layers to exclude air pockets."
  },

  SORGHUM_JOWAR: {
    id: "SORGHUM_JOWAR",
    name: "Sorghum / Jowar (ज्वार)",
    vernacularNames: {
      hi: "ज्वार (Sorghum)",
      mr: "ज्वारी (Jowar)",
      kn: "ಜೋಳ (Jowar)",
      te: "జొన్నలు (Jowar)"
    },
    optimalPhMin: 4.00,
    optimalPhMax: 4.40,
    optimalMoistureMin: 60.0,
    optimalMoistureMax: 67.0,
    typicalHarvestStage: "Late dough stage (avoids prussic acid / dhurrin accumulation)",
    packingAdvice: "Wilt for 2–4 hours if moisture > 70% before chopping to prevent clostridial seepage."
  },

  HYBRID_NAPIER: {
    id: "HYBRID_NAPIER",
    name: "Hybrid Napier / Bajra (नेपियर)",
    vernacularNames: {
      hi: "नेपियर घास (Napier)",
      mr: "हायब्रिड नेपियर (Napier)",
      kn: "ಹೈಬ್ರಿಡ್ ನೇಪಿಯರ್ (Napier)",
      te: "హైబ్రిడ్ నేపియర్ (Napier)"
    },
    optimalPhMin: 4.20,
    optimalPhMax: 4.60,
    optimalMoistureMin: 60.0,
    optimalMoistureMax: 68.0,
    typicalHarvestStage: "45–55 days re-growth (prior to flowering/lignification)",
    packingAdvice: "Requires molasses or lactic acid bacteria inoculant to boost water-soluble carbohydrate fermentation."
  },

  ALFALFA_LUCERNE: {
    id: "ALFALFA_LUCERNE",
    name: "Alfalfa / Lucerne (लूसर्न)",
    vernacularNames: {
      hi: "लूसर्न / रिजका (Alfalfa)",
      mr: "मेथी घास (Lucerne)",
      kn: "ಕುದುರೆ ಮೆಂತ್ಯ (Alfalfa)",
      te: "ఆల్ఫాల్ఫా (Alfalfa)"
    },
    optimalPhMin: 4.30,
    optimalPhMax: 4.70,
    optimalMoistureMin: 55.0,
    optimalMoistureMax: 65.0,
    typicalHarvestStage: "Early bloom (10% flowering)",
    packingAdvice: "High buffering capacity; wilt to 60% moisture to prevent butyric acid formation."
  },

  SUGARCANE_TOPS: {
    id: "SUGARCANE_TOPS",
    name: "Sugarcane Tops (गन्ने की पत्तियां)",
    vernacularNames: {
      hi: "गन्ने की अगोला (Cane Tops)",
      mr: "ऊसाचे वाडे (Cane Tops)",
      kn: "ಕಬ್ಬಿನ ತುದಿ (Cane Tops)",
      te: "చెరకు ఆకులు (Cane Tops)"
    },
    optimalPhMin: 3.90,
    optimalPhMax: 4.30,
    optimalMoistureMin: 60.0,
    optimalMoistureMax: 68.0,
    typicalHarvestStage: "Freshly cut tops following cane harvest",
    packingAdvice: "Chop finely (10–15 mm) to facilitate tight compaction. Mix with 1% urea + 1% jaggery if nitrogen is low."
  }
};

export const STORAGE_TYPES = [
  "Bunker Pit / Trench",
  "Silage Bag (Silobag)",
  "Ground Clamp (Covered Heap)",
  "Tower / Vertical Silo",
  "Round Bale (Plastic Wrapped)"
];
