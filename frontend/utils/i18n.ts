/**
 * SILAGEGUARD AI - Multilingual i18n Translation Dictionary
 * Full language translation coverage for Indian farmers across:
 * English (en), Hindi (hi), Marathi (mr), Kannada (kn), and Telugu (te).
 */

import { LanguageCode } from "./constants";

export type TranslationKey = keyof typeof translations.en;

export const translations = {
  en: {
    // Navigation & Headers
    home: "Home",
    scan: "Scan",
    history: "History",
    settings: "Settings",
    bluetooth: "Bluetooth",
    
    // Status & Quality Badges
    safe: "SAFE SILAGE",
    caution: "CAUTION",
    unsafe: "UNSAFE / SPOILED",
    mssiScore: "Quality Score",
    confidence: "AI Confidence",
    
    // Quick Actions / Buttons
    startNewScan: "New Scan",
    connectProbe: "Connect Sensor Probe",
    viewHistory: "Scan History",
    shareQR: "Share Audit QR Code",
    qrCopied: "QR Code copied to clipboard!",
    downloadPdf: "Download PDF Report",
    whyThisResult: "Why This Result?",
    resetHistory: "Reset Cached Scans",
    resetConfirmTitle: "Reset Local Scans?",
    resetConfirmBody: "Are you sure you want to clear cached test scans?",
    cancel: "Cancel",
    reset: "Reset",
    resetSuccess: "Local scan history cleared successfully!",
    
    // Telemetry & Metrics
    phAcidity: "pH Acidity",
    moisture: "Moisture",
    heatRise: "Core Heat Rise",
    mouldSignal: "Mould Signal",
    target: "Target",
    
    // Screen Titles
    farmerSettings: "Farmer Settings & Language",
    hardwareSim: "Hardware Simulation Mode",
    darkTheme: "Dark Industrial Theme",
    lightTheme: "Daylight High-Contrast",
    scanHistoryTitle: "Silage Scan History",
    recentScans: "Recent Silage Scans",
    
    // Farmer Friendly Labels
    goodSilage: "Good Quality - Safe for Cattle",
    warningSilage: "Needs Attention - Feed Carefully",
    badSilage: "Spoiled Silage - Do Not Feed",
  },
  hi: {
    home: "मुख्य पृष्ठ",
    scan: "स्कैन करें",
    history: "इतिहास",
    settings: "सेटिंग्स",
    bluetooth: "ब्लूटूथ",
    
    safe: "सुरक्षित साइलेज",
    caution: "सावधानी",
    unsafe: "असुरक्षित / खराब",
    mssiScore: "गुणवत्ता स्कोर",
    confidence: "एआई सटीकता",
    
    startNewScan: "नया स्कैन",
    connectProbe: "सेंसर प्रोब जोड़ें",
    viewHistory: "स्कैन इतिहास",
    shareQR: "QR कोड साझा करें",
    qrCopied: "QR कोड क्लिपबोर्ड पर कॉपी हो गया!",
    downloadPdf: "PDF रिपोर्ट डाउनलोड करें",
    whyThisResult: "यह परिणाम क्यों?",
    resetHistory: "कैश किए गए स्कैन रीसेट करें",
    resetConfirmTitle: "स्थानीय स्कैन रीसेट करें?",
    resetConfirmBody: "क्या आप वाकई कैश किए गए टेस्ट स्कैन को हटाना चाहते हैं?",
    cancel: "रद्द करें",
    reset: "रीसेट करें",
    resetSuccess: "स्थानीय स्कैन इतिहास सफलतापूर्वक साफ़ किया गया!",
    
    phAcidity: "pH मान",
    moisture: "नमी प्रतिशत",
    heatRise: "आंतरिक तापमान",
    mouldSignal: "फफूंद का संकेत",
    target: "लक्ष्य",
    
    farmerSettings: "किसान सेटिंग्स और भाषा",
    hardwareSim: "हार्डवेयर सिमुलेशन मोड",
    darkTheme: "डार्क थीम",
    lightTheme: "लाइट थीम",
    scanHistoryTitle: "साइलेज स्कैन इतिहास",
    recentScans: "हाल के साइलेज स्कैन",
    
    goodSilage: "उत्कृष्ट गुणवत्ता - पशुओं के लिए सुरक्षित",
    warningSilage: "ध्यान दें - सावधानी से खिलाएं",
    badSilage: "खराब साइलेज - पशुओं को न खिलाएं",
  },
  mr: {
    home: "मुख्य पृष्ठ",
    scan: "स्कॅन करा",
    history: "इतिहास",
    settings: "सेटिंग्ज",
    bluetooth: "ब्लूटूथ",
    
    safe: "सुरक्षित सायलेज",
    caution: "काळजी घ्या",
    unsafe: "असुरक्षित / खराब",
    mssiScore: "गुणवत्ता स्कोर",
    confidence: "AI अचूकता",
    
    startNewScan: "नवीन स्कॅन",
    connectProbe: "सेंसर प्रोब जोडा",
    viewHistory: "स्कॅन इतिहास",
    shareQR: "QR कोड शेअर करा",
    qrCopied: "QR कोड कॉपी झाला!",
    downloadPdf: "PDF अहवाल डाउनलोड करा",
    whyThisResult: "हा निकाल का?",
    resetHistory: "स्कॅन इतिहास रीसेट करा",
    resetConfirmTitle: "स्थानिक स्कॅन रीसेट करायचे?",
    resetConfirmBody: "तुम्हाला खरोखर साठवलेले चाचणी स्कॅन हटवायचे आहेत का?",
    cancel: "रद्द करा",
    reset: "रीसेट",
    resetSuccess: "स्थानिक स्कॅन इतिहास यशस्वीरित्या हटवला!",
    
    phAcidity: "pH प्रमाण",
    moisture: "ओलावा प्रमाण",
    heatRise: "आतील तापमान",
    mouldSignal: "बुरशीचे प्रमाण",
    target: "लक्ष्य",
    
    farmerSettings: "शेतकरी सेटिंग्ज व भाषा",
    hardwareSim: "हार्डवेअर सिम्युलेशन मोड",
    darkTheme: "डार्क थीम",
    lightTheme: "लाइट थीम",
    scanHistoryTitle: "सायलेज स्कॅन इतिहास",
    recentScans: "नुकतेच केलेले स्कॅन",
    
    goodSilage: "उत्कृष्ट गुणवत्ता - जनावरांसाठी सुरक्षित",
    warningSilage: "लक्ष द्या - काळजीपूर्वक द्या",
    badSilage: "खराब सायलेज - जनावरांना देऊ नका",
  },
  kn: {
    home: "ಮುಖ್ಯ ಪುಟ",
    scan: "ಸ್ಕ್ಯಾನ್ ಮಾಡಿ",
    history: "ಇತಿಹಾಸ",
    settings: "ಸೆಟ್ಟಿಂಗ್‌ಗಳು",
    bluetooth: "ಬ್ಲೂಟೂತ್",
    
    safe: "ಸುರಕ್ಷಿತ ಸೈಲೇಜ್",
    caution: "ಎಚ್ಚರಿಕೆ",
    unsafe: "ಅಸುರಕ್ಷಿತ / ಹಾಳಾಗಿದೆ",
    mssiScore: "ಗುಣಮಟ್ಟದ ಸ್ಕೋರ್",
    confidence: "AI ನಿಖರತೆ",
    
    startNewScan: "ಹೊಸ ಸ್ಕ್ಯಾನ್",
    connectProbe: "ಸಂವೇದಕ ಸಾಧನ ಜೋಡಿಸಿ",
    viewHistory: "ಸ್ಕ್ಯಾನ್ ಇತಿಹಾಸ",
    shareQR: "QR ಕೋಡ್ ಹಂಚಿಕೊಳ್ಳಿ",
    qrCopied: "QR ಕೋಡ್ ಕಾಪಿ ಮಾಡಲಾಗಿದೆ!",
    downloadPdf: "PDF ವರದಿ ಡೌನ್‌ಲೋಡ್",
    whyThisResult: "ಈ ಫಲಿತಾಂಶ ಏಕೆ?",
    resetHistory: "ಸ್ಕ್ಯಾನ್ ಇತಿಹಾಸ ಮರುಹೊಂದಿಸಿ",
    resetConfirmTitle: "ಇತಿಹಾಸ ಮರುಹೊಂದಿಸಬೇಕೇ?",
    resetConfirmBody: "ನೀವು ಖಂಡಿತವಾಗಿಯೂ ಇತಿಹಾಸವನ್ನು ಅಳಿಸಲು ಬಯಸುತ್ತೀರಾ?",
    cancel: "ರದ್ದುಮಾಡಿ",
    reset: "ಮರುಹೊಂದಿಸಿ",
    resetSuccess: "ಸ್ಕ್ಯಾನ್ ಇತಿಹಾಸವನ್ನು ಯಶಸ್ವಿಯಾಗಿ ಅಳಿಸಲಾಗಿದೆ!",
    
    phAcidity: "pH ಆಮ್ಲೀಯತೆ",
    moisture: "ತೇವಾಂಶ",
    heatRise: "ಆಂತರಿಕ ತಾಪಮಾನ",
    mouldSignal: "ಶಿಲೀಂಧ್ರ ಸೂಚನೆ",
    target: "ಗುರಿ",
    
    farmerSettings: "ರೈತರ ಸೆಟ್ಟಿಂಗ್‌ಗಳು ಮತ್ತು ಭಾಷೆ",
    hardwareSim: "ಹಾರ್ಡ್‌ವೇರ್ ಸಿಮ್ಯುಲೇಶನ್ ಮೋಡ್",
    darkTheme: "ಡಾರ್ಕ್ ಥೀಮ್",
    lightTheme: "ಲೈಟ್ ಥೀಮ್",
    scanHistoryTitle: "ಸೈಲೇಜ್ ಸ್ಕ್ಯಾನ್ ಇತಿಹಾಸ",
    recentScans: "ಇತ್ತೀಚಿನ ಸ್ಕ್ಯಾನ್‌ಗಳು",
    
    goodSilage: "ಉತ್ತಮ ಗುಣಮಟ್ಟ - ದನಗಳಿಗೆ ಸುರಕ್ಷಿತ",
    warningSilage: "ಗಮನ ಕೊಡಿ - ಎಚ್ಚರಿಕೆಯಿಂದ ನೀಡಿ",
    badSilage: "ಹಾಳಾದ ಸೈಲೇಜ್ - ದನಗಳಿಗೆ ನೀಡಬೇಡಿ",
  },
  te: {
    home: "హోమ్",
    scan: "స్కాన్ చేయండి",
    history: "చరిత్ర",
    settings: "సెట్టింగ్లు",
    bluetooth: "బ్లూటూత్",
    
    safe: "సురక్షిత సైలేజ్",
    caution: "జాగ్రత్త",
    unsafe: "అసురక్షితం / పాడైంది",
    mssiScore: "నాణ్యత స్కోర్",
    confidence: "AI నిఖరత",
    
    startNewScan: "కొత్త స్కాన్",
    connectProbe: "సెన్సార్ ప్రాబ్ కనెక్ట్ చేయండి",
    viewHistory: "స్కాన్ చరిత్ర",
    shareQR: "QR కోడ్ షేర్ చేయండి",
    qrCopied: "QR కోడ్ కాపీ చేయబడింది!",
    downloadPdf: "PDF నివేదిక డౌన్‌లోడ్",
    whyThisResult: "ఈ ఫలితం ఎందుకు?",
    resetHistory: "స్కాన్ చరిత్రను రీసెట్ చేయండి",
    resetConfirmTitle: "హిస్టరీ రీసెట్ చేయాలా?",
    resetConfirmBody: "మీరు ఖచ్చితంగా స్థానిక స్కాన్ చరిత్రను తీసివేయాలనుకుంటున్నారా?",
    cancel: "రద్దు చేయి",
    reset: "రీసెట్",
    resetSuccess: "స్కాన్ చరిత్ర విజయవంతంగా క్లియర్ చేయబడింది!",
    
    phAcidity: "pH పిహెచ్ శాతం",
    moisture: "తేమ శాతం",
    heatRise: "అంతర్గత ఉష్ణోగ్రత",
    mouldSignal: "బూజు గుర్తింపు",
    target: "లక్ష్యం",
    
    farmerSettings: "రైతు సెట్టింగ్‌లు & భాష",
    hardwareSim: "హార్డ్‌వేర్ సిమ్యులేషన్ మోడ్",
    darkTheme: "డార్క్ థీమ్",
    lightTheme: "లైట్ థీమ్",
    scanHistoryTitle: "సైలేజ్ స్కాన్ చరిత్ర",
    recentScans: "ఇటీవలి స్కాన్లు",
    
    goodSilage: "మంచి నాణ్యత - పశువులకు సురక్షితం",
    warningSilage: "శ్రద్ధ వహించండి - జాగ్రత్తగా తినిపించండి",
    badSilage: "పాడైన సైలేజ్ - పశువులకు పెట్టవద్దు",
  }
};

export function t(key: TranslationKey, lang: LanguageCode = "en"): string {
  const langDict = translations[lang] || translations.en;
  return langDict[key] || translations.en[key] || key;
}
