import { DISPLAY_SEASONS } from "./cropRecommenderConfig";

const PROFILE_LANGUAGES = ["English", "Hindi", "Hinglish"];

const advisorUi = {
  english: {
    introTitle: "AI Crop Advisor",
    introSub: "Powered by Gemini | Contextual recommendations based on your region and season",
    responseLanguage: "Response Language",
    responseLanguageAria: "Advisor response language",
    locationLabel: "Your Location / District",
    locationPlaceholder: "e.g. Punjab, Vidarbha, Cauvery Delta...",
    locationAria: "Your location or district",
    locationHint: "Be specific. District-level input usually works better than a state name.",
    seasonLabel: "Cropping Season",
    submitLabel: "Get AI Recommendation",
    invalidHint: "Enter a location and pick a season to continue",
    loadingText: (area, season) => `AI advisor is preparing suggestions for ${area} | ${season}...`,
    loadingSub: "Regional patterns, climate, and agronomic fit are being analyzed",
    resultsLabel: (season) => `AI Advisor | ${season} Season`,
    resultsTitle: (area) => `Top crops for ${area}`,
    backToForm: "Back to form",
    liveMode: "Live AI advisory",
    offlineMode: "Local advisory backup",
    languageMeta: "English",
    seasonMeta: (season) => `${season} season`,
    optionsMeta: (count) => `${count} crop options`,
    fallbackDisclaimer:
      "Live Gemini advice is unavailable right now, so these suggestions are coming from the local advisory backup. Please verify before making a final decision.",
    liveDisclaimer: "AI-generated recommendations. Verify with a local agricultural expert before taking action.",
    retryLiveAi: "Retry live AI",
    followUpTitle: "Ask a follow-up",
    followUpPlaceholder: "Ask anything about this crop...",
    followUpSend: "Go",
    followUpThinking: "Thinking...",
    followUpError: "I could not get an answer right now. Please try again.",
    voiceUnsupported: "Voice input is not available in this browser. Try Chrome/Edge or type your location.",
    voiceStopped: "Voice input stopped.",
    voiceBlocked: "Microphone permission is blocked. Allow mic access and try again.",
    voiceListening: "Listening... say your district or state name.",
    voiceHeard: (transcript) => `Heard "${transcript}". Now choose a season to continue.`,
    voiceNoMatch: "I could not understand that clearly. Try again or type your location.",
    voiceStartFailed: "Voice input could not start. Please type your location.",
    voiceButtonIdle: "Mic",
    voiceButtonActive: "Stop",
    voiceIdleAria: "Start voice input",
    voiceActiveAria: "Stop voice input",
    cardWater: "Water",
    cardReason: "Why this fits",
    cardSoil: "Best soil",
    genericAiError: "AI recommendation could not be generated. Please try again.",
  },
  hindi: {
    introTitle: "AI फसल सलाहकार",
    introSub: "Gemini आधारित | आपके क्षेत्र और मौसम के अनुसार सुझाव",
    responseLanguage: "जवाब की भाषा",
    responseLanguageAria: "सलाहकार की जवाब भाषा",
    locationLabel: "आपका क्षेत्र / जिला",
    locationPlaceholder: "जैसे पंजाब, विदर्भ, कावेरी डेल्टा...",
    locationAria: "आपका क्षेत्र या जिला",
    locationHint: "जितना संभव हो उतना स्पष्ट लिखें। राज्य से बेहतर जिला-स्तर का नाम काम करता है।",
    seasonLabel: "फसल का मौसम",
    submitLabel: "AI सुझाव प्राप्त करें",
    invalidHint: "आगे बढ़ने के लिए क्षेत्र लिखें और मौसम चुनें",
    loadingText: (area, season) => `AI सलाहकार ${area} | ${season} के लिए सुझाव तैयार कर रहा है...`,
    loadingSub: "क्षेत्रीय पैटर्न, मौसम और कृषि उपयुक्तता का विश्लेषण किया जा रहा है",
    resultsLabel: (season) => `AI सलाहकार | ${season} मौसम`,
    resultsTitle: (area) => `${area} के लिए शीर्ष फसलें`,
    backToForm: "फॉर्म पर वापस जाएँ",
    liveMode: "लाइव AI सलाह",
    offlineMode: "स्थानीय सलाह बैकअप",
    languageMeta: "हिन्दी",
    seasonMeta: (season) => `${season} मौसम`,
    optionsMeta: (count) => `${count} फसल विकल्प`,
    fallbackDisclaimer:
      "अभी लाइव Gemini उपलब्ध नहीं है, इसलिए ये सुझाव स्थानीय सलाह बैकअप से आए हैं। अंतिम निर्णय से पहले पुष्टि करें।",
    liveDisclaimer: "AI द्वारा तैयार सुझाव। अंतिम निर्णय से पहले स्थानीय कृषि विशेषज्ञ से पुष्टि करें।",
    retryLiveAi: "लाइव AI फिर आज़माएँ",
    followUpTitle: "आगे सवाल पूछें",
    followUpPlaceholder: "इस फसल के बारे में कुछ भी पूछें...",
    followUpSend: "भेजें",
    followUpThinking: "सोच रहा है...",
    followUpError: "अभी जवाब नहीं मिल पाया। कृपया फिर से कोशिश करें।",
    voiceUnsupported: "इस ब्राउज़र में वॉइस इनपुट उपलब्ध नहीं है। Chrome/Edge आज़माएँ या स्थान टाइप करें।",
    voiceStopped: "वॉइस इनपुट रोक दिया गया।",
    voiceBlocked: "माइक्रोफोन अनुमति बंद है। अनुमति दें और फिर कोशिश करें।",
    voiceListening: "सुन रहा हूँ... अपना जिला या राज्य का नाम बोलें।",
    voiceHeard: (transcript) => `"${transcript}" सुना गया। आगे बढ़ने के लिए मौसम चुनें।`,
    voiceNoMatch: "बोला गया इनपुट समझ नहीं आया। फिर से कोशिश करें या स्थान टाइप करें।",
    voiceStartFailed: "वॉइस इनपुट शुरू नहीं हो सका। कृपया स्थान टाइप करें।",
    voiceButtonIdle: "बोलें",
    voiceButtonActive: "रोकें",
    voiceIdleAria: "वॉइस इनपुट शुरू करें",
    voiceActiveAria: "वॉइस इनपुट बंद करें",
    cardWater: "पानी",
    cardReason: "यह क्यों उपयुक्त है",
    cardSoil: "उपयुक्त मिट्टी",
    genericAiError: "AI सुझाव नहीं मिल सके। कृपया फिर से कोशिश करें।",
  },
  hinglish: {
    introTitle: "AI Crop Advisor",
    introSub: "Gemini powered | aapke region aur season ke hisaab se suggestions",
    responseLanguage: "Response Language",
    responseLanguageAria: "Advisor response language",
    locationLabel: "Aapka Region / District",
    locationPlaceholder: "jaise Punjab, Vidarbha, Cauvery Delta...",
    locationAria: "Aapka region ya district",
    locationHint: "Jitna specific input hoga utna better. State se zyada district-level input kaam karta hai.",
    seasonLabel: "Cropping Season",
    submitLabel: "AI Recommendation Lo",
    invalidHint: "Aage badhne ke liye location likho aur season chuno",
    loadingText: (area, season) => `AI advisor ${area} | ${season} season ke liye analyse kar raha hai...`,
    loadingSub: "Regional patterns, climate aur agronomic fit analyse ho raha hai",
    resultsLabel: (season) => `AI Advisor | ${season} Season`,
    resultsTitle: (area) => `${area} ke liye top crops`,
    backToForm: "Form par wapas",
    liveMode: "Live AI advisory",
    offlineMode: "Local advisory backup",
    languageMeta: "Hinglish",
    seasonMeta: (season) => `${season} season`,
    optionsMeta: (count) => `${count} crop options`,
    fallbackDisclaimer:
      "Abhi live Gemini available nahi hai, isliye ye recommendations local advisory backup se aaye hain. Final decision se pehle verify kar lo.",
    liveDisclaimer: "AI-generated recommendations. Final decision se pehle local agricultural expert se verify kar lo.",
    retryLiveAi: "Live AI dobara try karo",
    followUpTitle: "Aage sawaal poochho",
    followUpPlaceholder: "Is crop ke baare mein kuch bhi poochho...",
    followUpSend: "Go",
    followUpThinking: "Soch raha hai...",
    followUpError: "Abhi answer nahi mil paya. Please dobara try karo.",
    voiceUnsupported: "Is browser mein voice input supported nahi hai. Chrome ya Edge try karo, ya location type karo.",
    voiceStopped: "Voice input rok diya gaya.",
    voiceBlocked: "Microphone permission block hai. Allow karo aur dobara try karo.",
    voiceListening: "Sun raha hoon... apna district ya state naam bolo.",
    voiceHeard: (transcript) => `"${transcript}" suna. Continue karne ke liye season chuno.`,
    voiceNoMatch: "Input samajh nahi aaya. Dobara try karo ya location type karo.",
    voiceStartFailed: "Voice input start nahi ho saka. Location type kar do.",
    voiceButtonIdle: "Speak",
    voiceButtonActive: "Stop",
    voiceIdleAria: "Start voice input",
    voiceActiveAria: "Stop voice input",
    cardWater: "Pani",
    cardReason: "Yeh kyun fit hai",
    cardSoil: "Best mitti",
    genericAiError: "AI recommendation nahi mil payi. Please dobara try karo.",
  },
};

const cropUi = {
  english: {
    retry: "Retry",
    autoFillWeather: "Auto-fill from Weather",
    autoFillPlaceholder: "Enter city (e.g. Delhi, Mumbai...)",
    autoFillLoading: "Fetching...",
    autoFillAction: "Auto-fill",
    optionalContext: "Optional Context",
    regionLabel: "Region or State",
    regionHint: "Optional local context",
    farmerProfile: "Farmer Profile",
    farmerName: "Farmer Name",
    farmName: "Farm Name",
    defaultRegion: "Default Region",
    preferredLanguage: "Preferred Language",
    saveProfile: "Save Profile",
    applyProfile: "Apply To Form",
    clearProfile: "Clear Profile",
    soilClimate: "Soil & Climate Parameters",
    analysePredict: "Analyse & Predict",
    readyToPredict: "Ready to predict",
    reviewValues: "Review the highlighted values to continue",
    fieldsRemaining: (count) => `${count} field${count !== 1 ? "s" : ""} remaining`,
    requestTimedOut: "Request timed out. Please try again.",
    unableToReach: "Unable to reach the server. Please try again.",
    mlRecommendedCrop: "ML Recommended Crop",
    confidence: "confidence",
    share: "Share",
    supportedByPrefix: "Supported by",
    lowConfidence: "Low confidence - models disagree. Consider verifying manually.",
    alternative: "Alternative",
    topSuggestions: "Top Suggestions",
    whyThisCrop: "Why This Crop",
    regionSeasonContext: "Region And Season Context",
    region: "Region",
    season: "Season",
    cropCalendar: "Crop Calendar",
    modelBreakdown: "Model Breakdown",
    winner: "Winner",
    downloadResult: "Download Result",
    goToFertilizer: "Go to Fertilizer Prediction",
    backToPrediction: "Back to Prediction",
    soilGaugeLabel: "Soil Health",
    yourInputsIdeal: "Your Soil vs Ideal",
    modelConsensus: "Model Consensus",
    allAgree: "All models agree",
    dotCloser: "Dot closer to agreeing model(s)",
    sow: "Sow",
    growing: "Growing",
    harvest: "Harvest",
    yourInputs: "Your inputs",
    idealRange: "Ideal range",
    soilGood: "Good",
    soilFair: "Fair",
    soilPoor: "Poor",
    soilGreatTip: "Great soil balance",
    soilNeedsAttentionTip: "Some nutrients need attention",
    soilNeedsImprovementTip: "Soil needs improvement",
    suitabilityHigh: "Highly Suitable",
    suitabilityMid: "Moderately Suitable",
    suitabilityLow: "Use Caution",
    suitabilityHighNote: "Conditions are strongly aligned with this recommendation.",
    suitabilityMidNote: "The recommendation is solid, but a few conditions may need monitoring.",
    suitabilityLowNote: "Treat this result carefully and verify field conditions before acting on it.",
    required: "Required",
    enterCity: "Please enter a city",
    importPlaceholder: "Paste your soil test report here...\nExample:\nNitrogen: 90\nPhosphorous: 42\nPotassium: 43\npH: 6.5",
    importDetect: "Auto-detect values",
    importFound: "Found",
    importApply: "Apply to form",
    importNotFound: "Could not detect values. Try a different format.",
    noDescription: "No description available.",
    pasteLabReport: "Paste lab report",
    loadError: "Failed to fetch weather data.",
    weatherFetchFailed: "Failed to fetch weather data.",
  },
  hindi: {
    retry: "फिर कोशिश करें",
    autoFillWeather: "मौसम से ऑटो-फिल",
    autoFillPlaceholder: "शहर लिखें (जैसे दिल्ली, मुंबई...)",
    autoFillLoading: "लाया जा रहा है...",
    autoFillAction: "ऑटो-फिल",
    optionalContext: "वैकल्पिक संदर्भ",
    regionLabel: "क्षेत्र या राज्य",
    regionHint: "स्थानीय संदर्भ वैकल्पिक है",
    farmerProfile: "किसान प्रोफाइल",
    farmerName: "किसान का नाम",
    farmName: "खेत का नाम",
    defaultRegion: "डिफ़ॉल्ट क्षेत्र",
    preferredLanguage: "पसंदीदा भाषा",
    saveProfile: "प्रोफाइल सहेजें",
    applyProfile: "फॉर्म में भरें",
    clearProfile: "साफ़ करें",
    soilClimate: "मिट्टी और जलवायु मानक",
    analysePredict: "विश्लेषण करें और सुझाव पाएँ",
    readyToPredict: "भविष्यवाणी के लिए तैयार",
    reviewValues: "आगे बढ़ने से पहले मान जाँचें",
    fieldsRemaining: (count) => `${count} फ़ील्ड बाकी`,
    requestTimedOut: "अनुरोध समय समाप्त। कृपया फिर कोशिश करें।",
    unableToReach: "सर्वर से संपर्क नहीं हो सका। कृपया फिर कोशिश करें।",
    mlRecommendedCrop: "ML द्वारा सुझाई गई फसल",
    confidence: "विश्वास",
    share: "साझा करें",
    supportedByPrefix: "समर्थित द्वारा",
    lowConfidence: "विश्वास कम है - मॉडल अलग राय दे रहे हैं। कृपया जाँच करें।",
    alternative: "वैकल्पिक",
    topSuggestions: "शीर्ष सुझाव",
    whyThisCrop: "यह फसल क्यों",
    regionSeasonContext: "क्षेत्र और मौसम संदर्भ",
    region: "क्षेत्र",
    season: "मौसम",
    cropCalendar: "फसल कैलेंडर",
    modelBreakdown: "मॉडल विवरण",
    winner: "विजेता",
    downloadResult: "परिणाम डाउनलोड करें",
    goToFertilizer: "उर्वरक भविष्यवाणी पर जाएँ",
    backToPrediction: "भविष्यवाणी पर वापस",
    soilGaugeLabel: "मिट्टी स्वास्थ्य",
    yourInputsIdeal: "आपकी मिट्टी बनाम आदर्श",
    modelConsensus: "मॉडल सहमति",
    allAgree: "सभी मॉडल सहमत हैं",
    dotCloser: "बिंदु सहमत मॉडल की ओर है",
    sow: "बुवाई",
    growing: "विकास",
    harvest: "कटाई",
    yourInputs: "आपके मान",
    idealRange: "आदर्श सीमा",
    soilGood: "अच्छा",
    soilFair: "सामान्य",
    soilPoor: "कमज़ोर",
    soilGreatTip: "मिट्टी का संतुलन अच्छा है",
    soilNeedsAttentionTip: "कुछ पोषक तत्वों पर ध्यान दें",
    soilNeedsImprovementTip: "मिट्टी में सुधार की ज़रूरत है",
    suitabilityHigh: "बहुत उपयुक्त",
    suitabilityMid: "मध्यम उपयुक्त",
    suitabilityLow: "सावधानी से उपयोग करें",
    suitabilityHighNote: "ये परिस्थितियाँ इस सिफारिश से अच्छी तरह मेल खाती हैं।",
    suitabilityMidNote: "सिफारिश ठीक है, लेकिन कुछ मानों पर नज़र रखें।",
    suitabilityLowNote: "इस परिणाम का सावधानी से उपयोग करें और खेत की स्थिति जाँचें।",
    required: "आवश्यक",
    enterCity: "कृपया शहर दर्ज करें",
    importPlaceholder: "अपनी मिट्टी की लैब रिपोर्ट यहाँ पेस्ट करें...\nउदाहरण:\nNitrogen: 90\nPhosphorous: 42\nPotassium: 43\npH: 6.5",
    importDetect: "मान पहचानें",
    importFound: "मिले",
    importApply: "फॉर्म में भरें",
    importNotFound: "मान नहीं मिले। दूसरा प्रारूप आज़माएँ।",
    noDescription: "विवरण उपलब्ध नहीं है।",
    pasteLabReport: "लैब रिपोर्ट पेस्ट करें",
    loadError: "शहर का मौसम डेटा नहीं मिला।",
    weatherFetchFailed: "मौसम डेटा प्राप्त नहीं हो पाया।",
  },
  hinglish: {
    retry: "Retry",
    autoFillWeather: "Weather se auto-fill",
    autoFillPlaceholder: "City likho (jaise Delhi, Mumbai...)",
    autoFillLoading: "Fetch ho raha hai...",
    autoFillAction: "Auto-fill",
    optionalContext: "Optional context",
    regionLabel: "Region ya State",
    regionHint: "Local context optional hai",
    farmerProfile: "Farmer Profile",
    farmerName: "Farmer Name",
    farmName: "Farm Name",
    defaultRegion: "Default Region",
    preferredLanguage: "Preferred Language",
    saveProfile: "Profile save karo",
    applyProfile: "Form me bharo",
    clearProfile: "Clear karo",
    soilClimate: "Soil aur climate parameters",
    analysePredict: "Analyse aur predict karo",
    readyToPredict: "Predict karne ke liye ready",
    reviewValues: "Aage badhne se pehle highlighted values check karo",
    fieldsRemaining: (count) => `${count} field remaining`,
    requestTimedOut: "Request timeout ho gaya. Please dobara try karo.",
    unableToReach: "Server tak pahunch nahi hui. Please dobara try karo.",
    mlRecommendedCrop: "ML recommended crop",
    confidence: "confidence",
    share: "Share",
    supportedByPrefix: "Supported by",
    lowConfidence: "Low confidence - models agree nahi kar rahe. Manual check karo.",
    alternative: "Alternative",
    topSuggestions: "Top Suggestions",
    whyThisCrop: "Yeh crop kyun",
    regionSeasonContext: "Region aur season context",
    region: "Region",
    season: "Season",
    cropCalendar: "Crop Calendar",
    modelBreakdown: "Model Breakdown",
    winner: "Winner",
    downloadResult: "Result download karo",
    goToFertilizer: "Fertilizer prediction par jao",
    backToPrediction: "Prediction par wapas",
    soilGaugeLabel: "Soil Health",
    yourInputsIdeal: "Aapke inputs vs ideal",
    modelConsensus: "Model Consensus",
    allAgree: "Sabhi models agree karte hain",
    dotCloser: "Dot agreeing model ki taraf hai",
    sow: "Bowaai",
    growing: "Growing",
    harvest: "Harvest",
    yourInputs: "Aapke inputs",
    idealRange: "Ideal range",
    soilGood: "Good",
    soilFair: "Fair",
    soilPoor: "Poor",
    soilGreatTip: "Soil balance achha hai",
    soilNeedsAttentionTip: "Kuch nutrients par dhyan dena hoga",
    soilNeedsImprovementTip: "Soil ko improvement chahiye",
    suitabilityHigh: "Highly Suitable",
    suitabilityMid: "Moderately Suitable",
    suitabilityLow: "Use Caution",
    suitabilityHighNote: "Yeh recommendation current conditions se achhi tarah match karti hai.",
    suitabilityMidNote: "Recommendation theek hai, lekin kuch conditions ko monitor karna hoga.",
    suitabilityLowNote: "Is result ko dhyan se use karo aur field conditions verify karo.",
    required: "Required",
    enterCity: "Please city likho",
    importPlaceholder: "Apni soil lab report yahan paste karo...\nExample:\nNitrogen: 90\nPhosphorous: 42\nPotassium: 43\npH: 6.5",
    importDetect: "Values detect karo",
    importFound: "Found values",
    importApply: "Form me bharo",
    importNotFound: "Values detect nahi ho paye. Dusra format try karo.",
    noDescription: "Description available nahi hai.",
    pasteLabReport: "Lab report paste karo",
    loadError: "City se weather data nahi mil paya.",
    weatherFetchFailed: "Weather data fetch nahi ho paya.",
  },
};

export function mapProfileLanguageToAdvisor(language) {
  const key = String(language || "").toLowerCase();
  if (key === "hindi") return "hindi";
  if (key === "hinglish") return "hinglish";
  return "english";
}

export function getAdvisorUi(language = "english") {
  return advisorUi[language] || advisorUi.english;
}

export function localizeAdvisorScale(value, language = "english", kind = "confidence") {
  const normalized = String(value || "").toLowerCase();
  if (language === "hindi") {
    if (kind === "confidence") {
      if (normalized === "high") return "उच्च";
      if (normalized === "medium") return "मध्यम";
      if (normalized === "low") return "कम";
    }
    if (kind === "fit") {
      if (normalized === "perfect") return "उत्तम";
      if (normalized === "good") return "अच्छा";
      if (normalized === "poor") return "कमज़ोर";
    }
  }
  if (language === "hinglish") {
    if (kind === "fit") {
      if (normalized === "perfect") return "Best";
      if (normalized === "good") return "Good";
      if (normalized === "poor") return "Weak";
    }
  }
  return value;
}

export function getCropUi(language = "english") {
  return cropUi[language] || cropUi.english;
}

export function getProfileLanguageOptions(language = "english") {
  if (language === "hindi") {
    return [
      { value: "English", label: "English" },
      { value: "Hindi", label: "हिन्दी" },
      { value: "Hinglish", label: "हिंग्लिश" },
    ];
  }
  if (language === "hinglish") {
    return [
      { value: "English", label: "English" },
      { value: "Hindi", label: "Hindi" },
      { value: "Hinglish", label: "Hinglish" },
    ];
  }
  return PROFILE_LANGUAGES.map((item) => ({ value: item, label: item }));
}

export function getLocalizedFieldMeta(language = "english") {
  if (language === "hindi") {
    return {
      N: { label: "नाइट्रोजन", explainer: "नाइट्रोजन पत्तियों की बढ़वार और हरियाली के लिए ज़रूरी है।" },
      P: { label: "फॉस्फोरस", explainer: "फॉस्फोरस जड़ों और शुरुआती विकास में मदद करता है।" },
      K: { label: "पोटैशियम", explainer: "पोटैशियम पानी संतुलन और रोग-प्रतिरोधक क्षमता को बेहतर बनाता है।" },
      temperature: { label: "तापमान", explainer: "औसत दिन का तापमान। ज़्यादातर फसलें 15 से 30 डिग्री में बेहतर बढ़ती हैं।" },
      humidity: { label: "नमी", explainer: "हवा की आर्द्रता। बहुत अधिक नमी से फफूंदी बढ़ सकती है।" },
      ph: { label: "मिट्टी का pH", explainer: "अधिकतर फसलों के लिए pH 6 से 7.5 अच्छा माना जाता है।" },
      rainfall: { label: "वर्षा", explainer: "मौसमी या वार्षिक वर्षा की मात्रा। इससे सिंचाई की ज़रूरत समझने में मदद मिलती है।" },
    };
  }
  if (language === "hinglish") {
    return {
      N: { label: "Nitrogen", explainer: "Nitrogen leafy growth aur greenery ke liye zaroori hota hai." },
      P: { label: "Phosphorous", explainer: "Phosphorous roots aur early growth ko support karta hai." },
      K: { label: "Potassium", explainer: "Potassium water balance aur disease resistance ko strong banata hai." },
      temperature: { label: "Temperature", explainer: "Average daytime temperature. Zyada tar crops 15 se 30 degree ke beech achha perform karti hain." },
      humidity: { label: "Humidity", explainer: "Hawa ki nami. Zyada humidity fungus badha sakti hai." },
      ph: { label: "Soil pH", explainer: "Most crops ke liye pH 6 se 7.5 tak theek mana jata hai." },
      rainfall: { label: "Rainfall", explainer: "Seasonal ya annual rainfall amount. Isse irrigation planning me madad milti hai." },
    };
  }
  return {};
}

export function getZoneLabel(zone, language = "english") {
  if (language === "hindi") {
    if (zone === "ok") return "संतुलित";
    if (zone === "high") return "ऊँचा";
    return "कम";
  }
  if (language === "hinglish") {
    if (zone === "ok") return "Balanced";
    if (zone === "high") return "High";
    return "Low";
  }
  if (zone === "ok") return "ok";
  return zone;
}

export function getLocalizedSeasons(language = "english") {
  if (language === "hindi") {
    return DISPLAY_SEASONS.map((season) => {
      if (season.value === "Kharif") return { ...season, label: "खरीफ", desc: "जून – अक्टूबर · मानसून" };
      if (season.value === "Rabi") return { ...season, label: "रबी", desc: "नवंबर – अप्रैल · सर्दी" };
      if (season.value === "Zaid") return { ...season, label: "ज़ायद", desc: "मार्च – जून · गर्मी" };
      return season;
    });
  }
  if (language === "hinglish") {
    return DISPLAY_SEASONS.map((season) => {
      if (season.value === "Kharif") return { ...season, desc: "Jun – Oct · Monsoon" };
      if (season.value === "Rabi") return { ...season, desc: "Nov – Apr · Winter" };
      if (season.value === "Zaid") return { ...season, desc: "Mar – Jun · Summer" };
      return season;
    });
  }
  return DISPLAY_SEASONS;
}
