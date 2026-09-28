/**
 * SILAGEGUARD AI — Multilingual Agronomic Advisory Engine
 * Generates actionable, farmer-friendly advisories across 5 Indian languages:
 * English, Hindi (हिन्दी), Marathi (मराठी), Kannada (ಕನ್ನಡ), Telugu (తెలుగు).
 * Optimized for both visual cards and offline Text-To-Speech (TTS).
 */

import { SilageDecision } from "../fusion/multimodalFusionEngine";
import { LanguageCode } from "../../utils/constants";

export interface FarmerAdvisory {
  decision: SilageDecision;
  language: LanguageCode;
  title: string;
  problem: string;
  reason: string;
  immediateAction: string;
  futurePrevention: string;
  speechText: string;
  severity: "INFO" | "CAUTION" | "CRITICAL";
}

interface AdvisoryContent {
  title: string;
  problem: string;
  reason: string;
  immediateAction: string;
  futurePrevention: string;
  speechText: string;
  severity: "INFO" | "CAUTION" | "CRITICAL";
}

const ADVISORIES: Record<LanguageCode, Record<SilageDecision, AdvisoryContent>> = {
  en: {
    SAFE: {
      severity: "INFO",
      title: "Silage is High Quality & Safe for Feeding",
      problem: "No spoilage detected. Ideal lactic fermentation.",
      reason: "Bunker sealing and moisture content are optimal, resulting in low pH (3.8-4.2) and no fungal contamination.",
      immediateAction: "Safe to feed directly to lactating dairy cows and calves. Highly palatable.",
      futurePrevention: "Maintain clean defacing habits and keep the plastic sheet tightly weighed down with tires/gravel bags.",
      speechText: "Your silage is safe and of excellent quality. You can feed it to your cattle immediately."
    },
    CAUTION: {
      severity: "CAUTION",
      title: "Feed with Caution — Secondary Heating Detected",
      problem: "Mild aerobic heating or elevated moisture level.",
      reason: "Air intrusion on the pit surface is causing yeasts to consume lactic acid, raising core temperature.",
      immediateAction: "Feed only to non-lactating heifers or dry cows. Feed within 6 hours. Do not let it sit in open bunks overnight.",
      futurePrevention: "Remove at least 15 to 20 cm of silage face daily to outrun air penetration into the bunker.",
      speechText: "Warning. Silage has mild heating. Feed with caution to dry cows within six hours."
    },
    UNSAFE: {
      severity: "CRITICAL",
      title: "DANGER — Unsafe for Cattle. Elevated Spoilage Risk Detected",
      problem: "Severe bacterial decomposition or visible fungal mould patterns detected.",
      reason: "High pH above 5.0 and thermal rise indicate Clostridial degradation and active aerobic respiration. Laboratory testing is advised if mycotoxin contamination is suspected.",
      immediateAction: "DO NOT FEED to dairy cows or pregnant heifers! Scrape off and isolate the suspect spoiled layer immediately.",
      futurePrevention: "Chop at 32-36% dry matter. Pack bunker pit with heavy tractors in 15 cm layers to exclude all oxygen.",
      speechText: "Danger! This silage shows elevated spoilage risk and abnormal fermentation. Do not feed it to your animals. Isolate the affected portion immediately."
    }
  },
  hi: {
    SAFE: {
      severity: "INFO",
      title: "साइलेज सुरक्षित और उच्च गुणवत्ता वाला है",
      problem: "कोई सड़न नहीं मिली। उत्तम लैक्टिक किण्वन।",
      reason: "पिट की अच्छी पैकिंग और सही नमी के कारण अम्लता (pH 3.8-4.2) बनी हुई है और फफूंद नहीं है।",
      immediateAction: "दुधारू गायों और भैंसों को तुरंत खिलाने के लिए पूरी तरह सुरक्षित और पौष्टिक।",
      futurePrevention: "साइलेज निकालते समय प्लास्टिक शीट को ठीक से दबाकर रखें ताकि हवा अंदर न जाए।",
      speechText: "आपका साइलेज सुरक्षित और बहुत अच्छी गुणवत्ता का है। इसे आप पशुओं को तुरंत खिला सकते हैं।"
    },
    CAUTION: {
      severity: "CAUTION",
      title: "सावधानी से खिलाएं — हल्का गर्म होना शुरू हुआ है",
      problem: "सतह पर हवा लगने से हल्का तापमान बढ़ रहा है।",
      reason: "हवा लगने से यीस्ट लैक्टिक एसिड को खत्म कर रहा है, जिससे चारा गर्म हो रहा है।",
      immediateAction: "केवल सूखे या बिना दूध वाले पशुओं को खिलाएं। 6 घंटे के अंदर खिला दें, रात भर बाहर न छोड़ें।",
      futurePrevention: "रोजाना साइलेज की सामने की 15-20 सेमी परत पूरी तरह काटकर निकालें ताकि हवा गहराई तक न पहुंचे।",
      speechText: "सावधानी रखें। साइलेज हल्का गर्म हो रहा है। इसे 6 घंटे के भीतर पशुओं को खिला दें।"
    },
    UNSAFE: {
      severity: "CRITICAL",
      title: "खतरा — यह चारा पशुओं के लिए असुरक्षित और खराब है",
      problem: "फफूंद और बदबूदार क्लोस्ट्रीडियल सड़न के लक्षण मिले।",
      reason: "pH 5 से ऊपर और अत्यधिक गर्मी हानिकारक बैक्टीरिया और फफूंद की मौजूदगी दर्शाती है। माइकोटॉक्सिन की पुष्टि हेतु प्रयोगशाला परीक्षण आवश्यक है।",
      immediateAction: "दुधारू या गाभिन पशुओं को बिल्कुल न खिलाएं! संदिग्ध खराब परत को तुरंत अलग करें।",
      futurePrevention: "साइलेज बनाते समय 15 सेमी की परतों में ट्रैक्टर से अच्छी तरह दबाएं ताकि ऑक्सीजन पूरी तरह निकल जाए।",
      speechText: "खतरा! यह साइलेज खराब और असुरक्षित है। इसे पशुओं को बिल्कुल न खिलाएं और खराब चारा तुरंत अलग कर दें।"
    }
  },
  mr: {
    SAFE: {
      severity: "INFO",
      title: "मुरघास उत्कृष्ट व जनावरांसाठी सुरक्षित आहे",
      problem: "कोणतीही बुरशी किंवा नासाडी नाही. उत्तम आंबण्याची प्रक्रिया.",
      reason: "पिट योग्य प्रकारे बंद केल्यामुळे व योग्य ओलाव्यामुळे सामू (pH) ३.८ ते ४.२ दरम्यान संतुलित राहिला आहे.",
      immediateAction: "दुभत्या गाई व म्हशींना तात्काळ खाऊ घालण्यास पूर्णपणे सुरक्षित.",
      futurePrevention: "मुरघास काढताना प्लास्टिक कव्हर व्यवस्थित वाळूच्या पोत्यांनी दाबून ठेवा.",
      speechText: "तुमचा मुरघास सुरक्षित आणि उत्तम दर्जाचा आहे. तुम्ही हा जनावरांना लगेच देऊ शकता."
    },
    CAUTION: {
      severity: "CAUTION",
      title: "सावधगिरी बाळगा — मुरघास गरम होत आहे",
      problem: "हवा लागल्यामुळे पृष्ठभागावर उष्णता वाढत आहे.",
      reason: "हवेच्या संपर्कामुळे यीस्ट सक्रिय होऊन चारा तापत आहे आणि पोषणमूल्य कमी होत आहे.",
      immediateAction: "फक्त भाकड किंवा मोठ्या कालवडींना द्या. ६ तासांच्या आत खाऊ घाला.",
      futurePrevention: "रोज समोरचा १५ ते २० सेमी थर एकसारखा कापा जेणेकरून हवा आत शिरणार नाही.",
      speechText: "लक्ष द्या. मुरघास गरम होत आहे. सावधगिरी बाळगा आणि सहा तासांच्या आत जनावरांना द्या."
    },
    UNSAFE: {
      severity: "CRITICAL",
      title: "धोका — हा मुरघास जनावरांसाठी असुरक्षित व घातक आहे",
      problem: "पांढरी/हिरवी बुरशी आणि दुर्गंधीयुक्त नासाडीचे लक्षण आढळले.",
      reason: "pH ५ च्या वर गेला असून तीव्र उष्णतेमुळे खराब जीवाणू वाढले आहेत. मायकोटॉक्सिन तपासणीसाठी प्रयोगशाळा चाचणी आवश्यक आहे.",
      immediateAction: "दुभत्या किंवा गाभण जनावरांना अजिबात खाऊ घालू नका! खराब थर त्वरित खड्ड्याबाहेर फेकून नष्ट करा.",
      futurePrevention: "मुरघास भरताना ट्रॅक्टरने दाबून हवा पूर्णपणे बाहेर काढा आणि हवा बंद प्लास्टिक वापरा.",
      speechText: "धोका! हा मुरघास खराब आणि घातक आहे. जनावरांना अजिबात खाऊ घालू नका."
    }
  },
  kn: {
    SAFE: {
      severity: "INFO",
      title: "ಸೈಲೇಜ್ ಅತ್ಯುತ್ತಮ ಗುಣಮಟ್ಟದ್ದಾಗಿದ್ದು ಹಸುಗಳಿಗೆ ಸುರಕ್ಷಿತವಾಗಿದೆ",
      problem: "ಯಾವುದೇ ಬೂಷ್ಟು ಅಥವಾ ಕೊಳೆತವಿಲ್ಲ.",
      reason: "ಸರಿಯಾದ ತೇವಾಂಶ ಮತ್ತು ಗಾಳಿಯಾಡದಂತೆ ಮುಚ್ಚಿರುವುದರಿಂದ ಆಮ್ಲತೆ (pH 3.8-4.2) ಉತ್ತಮವಾಗಿದೆ.",
      immediateAction: "ಹಾಲು ಕೊಡುವ ಹಸು ಮತ್ತು ಎಮ್ಮೆಗಳಿಗೆ ತಕ್ಷಣ ತಿನ್ನಿಸಲು ಸಂಪೂರ್ಣ ಸುರಕ್ಷಿತ.",
      futurePrevention: "ಸೈಲೇಜ್ ತೆಗೆದ ನಂತರ ಪ್ಲಾಸ್ಟಿಕ್ ಶೀಟ್ ಅನ್ನು ಗಾಳಿ ಹೋಗದಂತೆ ಬಿಗಿಯಾಗಿ ಮುಚ್ಚಿಡಿ.",
      speechText: "ನಿಮ್ಮ ಸೈಲೇಜ್ ಸುರಕ್ಷಿತವಾಗಿದೆ ಮತ್ತು ಉತ್ತಮ ಗುಣಮಟ್ಟದ್ದಾಗಿದೆ. ಹಸುಗಳಿಗೆ ತಕ್ಷಣ ನೀಡಬಹುದು."
    },
    CAUTION: {
      severity: "CAUTION",
      title: "ಎಚ್ಚರಿಕೆಯಿಂದ ತಿನ್ನಿಸಿ — ಮೇವು ಸ್ವಲ್ಪ ಬಿಸಿಯಾಗುತ್ತಿದೆ",
      problem: "ಮೇಲ್ಮೈಗೆ ಗಾಳಿ ತಗುಲಿದ ಕಾರಣ ಉಷ್ಣಾಂಶ ಹೆಚ್ಚುತ್ತಿದೆ.",
      reason: "ಗಾಳಿಯ ಸಂಪರ್ಕದಿಂದ ಈಸ್ಟ್ ಸಕ್ರಿಯವಾಗಿ ಲ್ಯಾಕ್ಟಿಕ್ ಆಮ್ಲವನ್ನು ನಾಶಪಡಿಸುತ್ತಿದೆ.",
      immediateAction: "ಹಾಲು ಕೊಡುವ ಹಸುಗಳಿಗೆ ನೀಡಬೇಡಿ. 6 ಗಂಟೆಗಳ ಒಳಗೆ ತಿನ್ನಿಸಿ ಮುಗಿಸಿ.",
      futurePrevention: "ದಿನವೂ ಮುಂಭಾಗದ 15-20 ಸೆಂ.ಮೀ ಪದರವನ್ನು ಸಮನಾಗಿ ಕತ್ತರಿಸಿ ತೆಗೆಯಿರಿ.",
      speechText: "ಎಚ್ಚರಿಕೆ. ಸೈಲೇಜ್ ಸ್ವಲ್ಪ ಬಿಸಿಯಾಗುತ್ತಿದೆ. ಎಚ್ಚರಿಕೆಯಿಂದ ಆರು ಗಂಟೆಗಳ ಒಳಗೆ ತಿನ್ನಿಸಿ."
    },
    UNSAFE: {
      severity: "CRITICAL",
      title: "ಅಪಾಯ — ಈ ಸೈಲೇಜ್ ಹಾಳಾಗಿದ್ದು ಜಾನುವಾರುಗಳಿಗೆ ಅಪಾಯಕಾರಿ",
      problem: "ತೀವ್ರ ಬೂಷ್ಟು ಮತ್ತು ಕೆಟ್ಟ ವಾಸನೆ ಪತ್ತೆಯಾಗಿದೆ.",
      reason: "pH 5 ಕ್ಕಿಂತ ಹೆಚ್ಚಿದ್ದು ಹಾನಿಕಾರಕ ಬ್ಯಾಕ್ಟೀರಿಯಾಗಳು ಬೆಳೆದಿವೆ. ಮೈಕೋಟಾಕ್ಸಿನ್ ದೃಢೀಕರಣಕ್ಕೆ ಪ್ರಯೋಗಾಲಯ ಪರೀಕ್ಷೆ ಅಗತ್ಯ.",
      immediateAction: "ಹಸುಗಳಿಗೆ ಖಂಡಿತವಾಗಿ ತಿನ್ನಿಸಬೇಡಿ! ಹಾಳಾದ ಮೇಲಿನ ಪದರವನ್ನು ತಕ್ಷಣ ತೆಗೆದು ಪ್ರತ್ಯೇಕಿಸಿ.",
      futurePrevention: "ಸೈಲೇಜ್ ತಯಾರಿಸುವಾಗ ಟ್ರ್ಯಾಕ್ಟರ್‌ನಿಂದ ಚೆನ್ನಾಗಿ ಅದುಮಿ ಗಾಳಿಯನ್ನು ಹೊರಹಾಕಿ.",
      speechText: "ಅಪಾಯ! ಈ ಸೈಲೇಜ್ ಹಾಳಾಗಿದೆ ಮತ್ತು ಅಪಾಯಕಾರಿಯಾಗಿದೆ. ಇದನ್ನು ಜಾನುವಾರುಗಳಿಗೆ ನೀಡಬೇಡಿ."
    }
  },
  te: {
    SAFE: {
      severity: "INFO",
      title: "సైలేజ్ చాలా సురక్షితమైనది మరియు మంచి నాణ్యత గలది",
      problem: "ఎలాంటి బూజు లేదా కుళ్ళు లేదు.",
      reason: "సరైన తేమ మరియు గాలి చొరబడకుండా నిల్వ చేయడం వలన ఆమ్లత (pH 3.8-4.2) స్థిರంగా ఉంది.",
      immediateAction: "పాడి ఆవులు మరియు గేదెలకు నేరుగా తినిపించవచ్చు. పాలలో కొవ్వు పెరుగుతుంది.",
      futurePrevention: "తీసిన తర్వాత ప్లాస్టిక్ కవర్‌ను గాలి వెళ్ళకుండా రాళ్ళతో గట్టిగా కప్పండి.",
      speechText: "మీ సైలేజ్ చాలా మంచి నాణ్యతతో సురక్షితంగా ఉంది. పశువులకు వెంటనే వేయవచ్చు."
    },
    CAUTION: {
      severity: "CAUTION",
      title: "జాగ్రత్తగా తినిపించండి — స్వల్పంగా వేడెక్కింది",
      problem: "పైభాగంలో గాలి తగలడం వల్ల వేడి పెరుగుతోంది.",
      reason: "గాలి చేరడం వల్ల ఈస్ట్ పెరిగి న్యూట్రిషన్ పాడవుతోంది.",
      immediateAction: "ఈనిన పాడి పశువులకు వేయకండి. 6 గంటల లోపల తినిపించండి.",
      futurePrevention: "ప్రతిరోజూ 15 నుండి 20 సెం.మీ పొరను సమానంగా తొలగించండి.",
      speechText: "జాగ్రత్త. సైలేజ్ కొద్దిగా వేడెక్కుతోంది. ఆరు గంటల లోపు పశువులకు తినిపించండి."
    },
    UNSAFE: {
      severity: "CRITICAL",
      title: "ప్రమాదం — ఈ సైలేజ్ పాడైపోయింది, పశువులకు హానికరం",
      problem: "తీవ్రమైన బూజు మరియు దుర్వాసన గుర్తించబడింది.",
      reason: "pH 5 కన్నా ఎక్కువ ఉండడం మరియు అధిక వేడి హానికర బ్యాక్టీరియా ఉనికిని సూచిస్తుంది. మైకోటాక్సిన్ల నిర్ధారణకు ల్యాబ్ పరీక్ష అవసరం.",
      immediateAction: "పాడి పశువులకు ఎట్టి పరిస్థితుల్లోనూ వేయకండి! పాడైన భాగాన్ని వెంటనే వేరు చేయండి.",
      futurePrevention: "సైలేజ్ వేసేటప్పుడు ట్రాక్టర్‌తో బాగా తొక్కి గాలి లేకుండా జాగ్రత్తపడండి.",
      speechText: "ప్రమాదం! ఈ సైలేజ్ పాడైపోయింది మరియు ప్రమాదకరం. పశువులకు అస్సలు తినిపించవద్దు."
    }
  }
};

export function generateFarmerAdvisory(
  decision: SilageDecision,
  language: LanguageCode = "en"
): FarmerAdvisory {
  const langKey = ADVISORIES[language] ? language : "en";
  const content = ADVISORIES[langKey][decision];

  return {
    decision,
    language: langKey,
    title: content.title,
    problem: content.problem,
    reason: content.reason,
    immediateAction: content.immediateAction,
    futurePrevention: content.futurePrevention,
    speechText: content.speechText,
    severity: content.severity
  };
}
