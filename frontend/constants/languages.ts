/**
 * SILAGEGUARD AI V4 — Central Multilingual Translation Registry
 * Complete localized strings for English, Hindi, Marathi, Kannada, and Telugu.
 * High-clarity agricultural vocabulary optimized for dairy farmers.
 */

import { LanguageCode, LanguageInfo } from "../types/advisory";

export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी" },
  { code: "mr", name: "Marathi", nativeName: "मराठी" },
  { code: "kn", name: "Kannada", nativeName: "ಕನ್ನಡ" },
  { code: "te", name: "Telugu", nativeName: "తెలుగు" }
];

export const TRANSLATIONS: Record<LanguageCode, Record<string, string>> = {
  en: {
    appName: "SilageGuard AI",
    tagline: "Rapid Feed & Silage Quality Testing System",
    goodMorning: "Good Morning, Farmer",
    goodAfternoon: "Good Afternoon, Farmer",
    goodEvening: "Good Evening, Farmer",
    offlineActive: "OFFLINE AIR-GAP ACTIVE",
    probeConnected: "PROBE CONNECTED",
    probeDisconnected: "PROBE DISCONNECTED",
    startScan: "START SILAGE SCAN",
    todaySummary: "TODAY'S SILAGE SUMMARY",
    totalScans: "Total Scans",
    safeBatches: "Safe Batches",
    alerts: "Alerts",
    averageMssi: "Average Quality",
    recentScans: "RECENT SCANS",
    learnSilage: "LEARN SILAGE",
    calibration: "PROBE CALIBRATION",
    
    // Tabs
    tabHome: "Home",
    tabScan: "Scan",
    tabInsights: "Insights",
    tabHistory: "History",
    tabSettings: "Settings",

    // Scan Wizard
    step1Title: "1. Capture Face",
    step1Subtitle: "Take 3 photos (Top, Face, Pocket)",
    step2Title: "2. Probe Core",
    step2Subtitle: "Insert lance 40-60 cm deep",
    step3Title: "3. Analyze",
    step3Subtitle: "Dual edge AI inference (< 4s)",

    // Verdicts
    verdictSafe: "SAFE TO FEED (LOW SCREENING RISK)",
    verdictCaution: "FEED WITH CAUTION",
    verdictUnsafe: "DO NOT FEED / HAZARD",
    verdictInsufficient: "INSUFFICIENT DATA",

    // Actions
    viewExplainability: "WHY THIS RESULT?",
    verifyCertificate: "VERIFY QR CERTIFICATE",
    shareReport: "SHARE REPORT",
    playAudioAdvisory: "LISTEN TO ADVISORY",
    retakeScan: "RETAKE SCAN",
    done: "DONE"
  },

  hi: {
    appName: "साइलेजगार्ड AI",
    tagline: "पशु आहार एवं साइलेज गुणवत्ता जांच प्रणाली",
    goodMorning: "सुप्रभात, किसान भाई",
    goodAfternoon: "नमस्ते, किसान भाई",
    goodEvening: "शुभ संध्या, किसान भाई",
    offlineActive: "ऑफ़लाइन मोड सक्रिय",
    probeConnected: "सेंसर जुड़ा हुआ है",
    probeDisconnected: "सेंसर नहीं जुड़ा है",
    startScan: "साइलेज जांच शुरू करें",
    todaySummary: "आज की साइलेज रिपोर्ट",
    totalScans: "कुल जांच",
    safeBatches: "सुरक्षित साइलेज",
    alerts: "खतरे की चेतावनी",
    averageMssi: "औसत गुणवत्ता",
    recentScans: "हाल की जांचें",
    learnSilage: "साइलेज सीखें",
    calibration: "सेंसर कैलिब्रेशन",

    tabHome: "मुख्य पृष्ठ",
    tabScan: "जांच करें",
    tabInsights: "आंकड़े",
    tabHistory: "इतिहास",
    tabSettings: "सेटिंग्स",

    step1Title: "1. फोटो लें",
    step1Subtitle: "3 कोणों से फोटो खींचें",
    step2Title: "2. सेंसर लगाएं",
    step2Subtitle: "सेंसर को 40-60 सेमी गहरा डालें",
    step3Title: "3. विश्लेषण",
    step3Subtitle: "बिना इंटरनेट तुरंत परिणाम",

    verdictSafe: "खिलाने के लिए सुरक्षित",
    verdictCaution: "सावधानी से खिलाएं",
    verdictUnsafe: "बिल्कुल न खिलाएं (खतरा)",
    verdictInsufficient: "अधूरा डेटा",

    viewExplainability: "यह परिणाम क्यों आया?",
    verifyCertificate: "प्रमाणपत्र देखें",
    shareReport: "रिपोर्ट शेयर करें",
    playAudioAdvisory: "सलाह सुनें",
    retakeScan: "दोबारा जांच करें",
    done: "समाप्त"
  },

  mr: {
    appName: "सायलेजगार्ड AI",
    tagline: "जनावरांच्या चाऱ्याची गुणवत्ता तपासणी प्रणाली",
    goodMorning: "शुभ प्रभात, शेतकरी मित्र",
    goodAfternoon: "शुभ दुपार, शेतकरी मित्र",
    goodEvening: "शुभ संध्याकाळ, शेतकरी मित्र",
    offlineActive: "ऑफलाइन मोड सक्रिय",
    probeConnected: "प्रोब जोडला आहे",
    probeDisconnected: "प्रोब जोडलेला नाही",
    startScan: "सायलेज तपासणी सुरू करा",
    todaySummary: "आजचा सायलेज अहवाल",
    totalScans: "एकूण तपासण्या",
    safeBatches: "सुरक्षित चारा",
    alerts: "धोक्याच्या सूचना",
    averageMssi: "सरासरी गुणवत्ता",
    recentScans: "अलीकडील तपासण्या",
    learnSilage: "सायलेज माहिती",
    calibration: "प्रोब कॅलिब्रेशन",

    tabHome: "मुख्य पान",
    tabScan: "तपासा",
    tabInsights: "अहवाल",
    tabHistory: "इतिहास",
    tabSettings: "सेटिंग्ज",

    step1Title: "1. फोटो काढा",
    step1Subtitle: "3 वेगवेगळ्या बाजूंनी फोटो घ्या",
    step2Title: "2. प्रोब लावा",
    step2Subtitle: "प्रोब 40-60 सेमी खोल घाला",
    step3Title: "3. विश्लेषण",
    step3Subtitle: "इंटरनेटशिवाय लगेच निकाल",

    verdictSafe: "जनावरांना खाऊ घालण्यास सुरक्षित",
    verdictCaution: "काळजीपूर्वक खाऊ घाला",
    verdictUnsafe: "खाऊ घालू नका (धोका)",
    verdictInsufficient: "अपुरा डेटा",

    viewExplainability: "हा निकाल का आला?",
    verifyCertificate: "प्रमाणपत्र तपासा",
    shareReport: "अहवाल पाठवा",
    playAudioAdvisory: "सल्ला ऐका",
    retakeScan: "पुन्हा तपासा",
    done: "पूर्ण"
  },

  kn: {
    appName: "ಸೈಲೇಜ್‌ಗಾರ್ಡ್ AI",
    tagline: "ಹಸುಗಳ ಮೇವಿನ ಗುಣಮಟ್ಟ ಪರೀಕ್ಷಾ ವ್ಯವಸ್ಥೆ",
    goodMorning: "ಶುಭೋದಯ, ರೈತ ಬಾಂಧವರೇ",
    goodAfternoon: "ಶುಭ ಮಧ್ಯಾಹ್ನ, ರೈತ ಬಾಂಧವರೇ",
    goodEvening: "ಶುಭ ಸಂಜೆ, ರೈತ ಬಾಂಧವರೇ",
    offlineActive: "ಆಫ್‌ಲೈನ್ ಸಕ್ರಿಯವಾಗಿದೆ",
    probeConnected: "ಸೆನ್ಸರ್ ಸಂಪರ್ಕಗೊಂಡಿದೆ",
    probeDisconnected: "ಸೆನ್ಸರ್ ಸಂಪರ್ಕ ಕಡಿತಗೊಂಡಿದೆ",
    startScan: "ಪರೀಕ್ಷೆ ಪ್ರಾರಂಭಿಸಿ",
    todaySummary: "ಇಂದಿನ ಸೈಲೇಜ್ ವರದಿ",
    totalScans: "ಒಟ್ಟು ಪರೀಕ್ಷೆಗಳು",
    safeBatches: "ಸುರಕ್ಷಿತ ಮೇವು",
    alerts: "ಎಚ್ಚರಿಕೆಗಳು",
    averageMssi: "ಸರಾಸರಿ ಗುಣಮಟ್ಟ",
    recentScans: "ಇತ್ತೀಚಿನ ಪರೀಕ್ಷೆಗಳು",
    learnSilage: "ಸೈಲೇಜ್ ಮಾಹಿತಿ",
    calibration: "ಸೆನ್ಸರ್ ಕ್ಯಾಲಿಬ್ರೇಷನ್",

    tabHome: "ಮುಖಪುಟ",
    tabScan: "ಪರೀಕ್ಷಿಸಿ",
    tabInsights: "ವಿಶ್ಲೇಷಣೆ",
    tabHistory: "ಇತಿಹಾಸ",
    tabSettings: "ಸೆಟ್ಟಿಂಗ್ಸ್",

    step1Title: "1. ಫೋಟೋ ತೆಗೆಯಿರಿ",
    step1Subtitle: "3 ಕೋನಗಳಿಂದ ಫೋಟೋ ಸೆರೆಹಿಡಿಯಿರಿ",
    step2Title: "2. ಸೆನ್ಸರ್ ಇರಿಸಿ",
    step2Subtitle: "40-60 ಸೆಂ.ಮೀ ಆಳಕ್ಕೆ ಇಳಿಸಿ",
    step3Title: "3. ಫಲಿತಾಂಶ",
    step3Subtitle: "ಇಂಟರ್ನೆಟ್ ಇಲ್ಲದೆ ತಕ್ಷಣ ಫಲಿತಾಂಶ",

    verdictSafe: "ಹಸುಗಳಿಗೆ ನೀಡಲು ಸುರಕ್ಷಿತ",
    verdictCaution: "ಎಚ್ಚರಿಕೆಯಿಂದ ನೀಡಿ",
    verdictUnsafe: "ಖಂಡಿತ ನೀಡಬೇಡಿ (ಅಪಾಯ)",
    verdictInsufficient: "ಅಪೂರ್ಣ ಮಾಹಿತಿ",

    viewExplainability: "ಈ ಫಲಿತಾಂಶ ಏಕೆ ಬಂತು?",
    verifyCertificate: "ಪ್ರಮಾಣಪತ್ರ ಪರಿಶೀಲಿಸಿ",
    shareReport: "ವರದಿ ಹಂಚಿಕೊಳ್ಳಿ",
    playAudioAdvisory: "ಸಲಹೆ ಆಲಿಸಿ",
    retakeScan: "ಮತ್ತೆ ಪರೀಕ್ಷಿಸಿ",
    done: "ಮುಗಿದಿದೆ"
  },

  te: {
    appName: "సైలేజ్‌గార్డ్ AI",
    tagline: "పశుగ్రాసం మరియు సైలేజ్ నాణ్యత పరీక్ష వ్యవస్థ",
    goodMorning: "శుభోదయం, రైతు సోదరా",
    goodAfternoon: "శుభ మధ్యాహ్నం, రైతు సోదరా",
    goodEvening: "శుభ సాయంత్రం, రైతు సోదరా",
    offlineActive: "ఆఫ్‌లైన్ మోడ్ యాక్టివ్",
    probeConnected: "సెన్సార్ అనుసంధానించబడింది",
    probeDisconnected: "సెన్సార్ కలపబడలేదు",
    startScan: "సైలేజ్ పరీక్ష ప్రారంభించండి",
    todaySummary: "నేటి సైలేజ్ నివేదిక",
    totalScans: "మొత్తం పరీక్షలు",
    safeBatches: "సురక్షితమైన మేత",
    alerts: "హెచ్చరికలు",
    averageMssi: "సగటు నాణ్యత",
    recentScans: "ఇటీవలి పరీక్షలు",
    learnSilage: "సైలేజ్ సమాచారం",
    calibration: "సెన్సార్ క్యాలిబ్రేషన్",

    tabHome: "హోమ్",
    tabScan: "పరీక్షించు",
    tabInsights: "విశ్లేషణ",
    tabHistory: "చరిత్ర",
    tabSettings: "సెట్టింగ్స్",

    step1Title: "1. ఫోటో తీయండి",
    step1Subtitle: "3 వైపుల నుండి ఫోటో తీయండి",
    step2Title: "2. సెన్సార్ చొప్పించండి",
    step2Subtitle: "40-60 సెం.మీ లోతుగా ఉంచండి",
    step3Title: "3. ఫలితం",
    step3Subtitle: "ఇంటర్నెట్ లేకుండా తక్షణ ఫలితం",

    verdictSafe: "పశువులకు మేపడానికి సురక్షితం",
    verdictCaution: "జాగ్రత్తగా మేపండి",
    verdictUnsafe: "మేపవద్దు (ప్రమాదకరం)",
    verdictInsufficient: "సరిపోని సమాచారం",

    viewExplainability: "ఈ ఫలితం ఎందుకు వచ్చింది?",
    verifyCertificate: "ధృవీకరణ పత్రం",
    shareReport: "నివేదికను షేర్ చేయండి",
    playAudioAdvisory: "సలహా వినండి",
    retakeScan: "మళ్ళీ పరీక్షించండి",
    done: "పూర్తయింది"
  }
};

export function getTranslation(key: string, lang: LanguageCode = "en"): string {
  return TRANSLATIONS[lang]?.[key] || TRANSLATIONS.en[key] || key;
}
