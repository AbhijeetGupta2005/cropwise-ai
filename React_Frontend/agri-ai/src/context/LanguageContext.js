import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "cw-language";

const LANGUAGE_OPTIONS = [
  { value: "english", short: "EN", label: "English" },
  { value: "hindi", short: "हिं", label: "हिन्दी" },
  { value: "hinglish", short: "HING", label: "Hinglish" },
];

const TRANSLATIONS = {
  english: {
    switcherLabel: "App language",
    navFeatures: "Features",
    navHow: "How it works",
    navCrops: "Crops",
    navOpenApp: "Open app",
    heroEyebrow: "AI | ML | Agriculture",
    heroGrow: "Grow",
    heroSmarter: "smarter",
    heroField: "for the field",
    heroSub: "Predict the best crops and fertilizers from soil conditions, real-time weather, and an ensemble of machine learning models.",
    heroCropBtn: "Crop Recommendation",
    heroFertilizerBtn: "Fertilizer Recommendation",
    statsCropTypes: "Crop Types",
    statsFertilizers: "Fertilizers",
    statsModels: "ML Models",
    statsAccuracy: "Accuracy",
    featuresLabel: "Core Features",
    featuresTitleA: "Practical guidance,",
    featuresTitleB: "built for decisions",
    processLabel: "The Process",
    processTitleA: "Three steps to",
    processTitleB: "better crop choices",
    cropsLabel: "Supported Crops",
    cropsTitleA: "22 crops,",
    cropsTitleB: "one engine",
    ctaLabel: "Get Started",
    ctaTitleA: "Start with your field.",
    ctaTitleB: "Get a recommendation you can use.",
    ctaSub: "Use soil inputs, local weather, and AI guidance to compare options before you commit to a crop or fertilizer plan.",
    ctaCropBtn: "Start with crops >",
    ctaFertilizerBtn: "Try fertilizers >",
    badgeMl: "ML-Powered",
    badgeWeather: "Real-time Weather",
    badgeSignup: "No signup needed",
    badgeFree: "Free to use",
    footerBuiltWith: "Built with ML + Gemini AI",
    footerCrops: "Crops",
    footerFertilizer: "Fertilizer",
    cropTitle: "Crop Recommender",
    cropSubtitle: "Two engines | One goal: the right crop for your land",
    cropHistory: "Prediction History",
    cropTabMl: "ML Model",
    cropTabMlDesc: "N | P | K | Climate data",
    cropTabAi: "AI Advisor",
    cropTabAiDesc: "Region | Season | Gemini",
    fertilizerTitle: "Fertilizer Recommender",
    fertilizerSubtitle: "Enter soil and crop data for an AI-powered fertilizer suggestion",
    fertilizerExample: "Load example",
    fertilizerHistory: "History",
    historyEyebrow: "Saved Decisions",
    historyTitle: "Prediction History",
    historySubtitle: "Track recent crop and fertilizer recommendations in one place.",
    historyHome: "Home",
    historyBack: "Back",
    historyAll: "All",
    historyCrop: "Crop",
    historyFertilizer: "Fertilizer",
    historyClear: "Clear History",
  },
  hindi: {
    switcherLabel: "ऐप की भाषा",
    navFeatures: "विशेषताएँ",
    navHow: "कैसे काम करता है",
    navCrops: "फसलें",
    navOpenApp: "ऐप खोलें",
    heroEyebrow: "AI | ML | कृषि",
    heroGrow: "खेती",
    heroSmarter: "और समझदारी से",
    heroField: "अपने खेत के लिए",
    heroSub: "मिट्टी की स्थिति, रीयल-टाइम मौसम और मशीन लर्निंग मॉडल्स के आधार पर बेहतर फसल और उर्वरक चुनें।",
    heroCropBtn: "फसल सुझाव",
    heroFertilizerBtn: "उर्वरक सुझाव",
    statsCropTypes: "फसल प्रकार",
    statsFertilizers: "उर्वरक",
    statsModels: "ML मॉडल",
    statsAccuracy: "सटीकता",
    featuresLabel: "मुख्य विशेषताएँ",
    featuresTitleA: "व्यावहारिक सलाह,",
    featuresTitleB: "सही फैसलों के लिए",
    processLabel: "प्रक्रिया",
    processTitleA: "बेहतर फसल चुनने के",
    processTitleB: "तीन आसान चरण",
    cropsLabel: "समर्थित फसलें",
    cropsTitleA: "22 फसलें,",
    cropsTitleB: "एक इंजन",
    ctaLabel: "शुरू करें",
    ctaTitleA: "अपने खेत से शुरुआत करें।",
    ctaTitleB: "काम की सलाह तुरंत पाएँ।",
    ctaSub: "मिट्टी, स्थानीय मौसम और AI मार्गदर्शन का उपयोग करके फसल या उर्वरक योजना तय करने से पहले विकल्पों की तुलना करें।",
    ctaCropBtn: "फसल से शुरू करें >",
    ctaFertilizerBtn: "उर्वरक देखें >",
    badgeMl: "ML आधारित",
    badgeWeather: "रीयल-टाइम मौसम",
    badgeSignup: "साइनअप नहीं",
    badgeFree: "निःशुल्क",
    footerBuiltWith: "ML + Gemini AI से निर्मित",
    footerCrops: "फसलें",
    footerFertilizer: "उर्वरक",
    cropTitle: "फसल सुझाव",
    cropSubtitle: "दो इंजन | एक लक्ष्य: आपकी जमीन के लिए सही फसल",
    cropHistory: "सुझाव इतिहास",
    cropTabMl: "ML मॉडल",
    cropTabMlDesc: "N | P | K | जलवायु डेटा",
    cropTabAi: "AI सलाहकार",
    cropTabAiDesc: "क्षेत्र | मौसम | Gemini",
    fertilizerTitle: "उर्वरक सुझाव",
    fertilizerSubtitle: "AI आधारित उर्वरक सुझाव के लिए मिट्टी और फसल का डेटा भरें",
    fertilizerExample: "उदाहरण भरें",
    fertilizerHistory: "इतिहास",
    historyEyebrow: "सहेजे गए निर्णय",
    historyTitle: "सुझाव इतिहास",
    historySubtitle: "हाल की फसल और उर्वरक सिफारिशें एक ही जगह देखें।",
    historyHome: "होम",
    historyBack: "वापस",
    historyAll: "सभी",
    historyCrop: "फसल",
    historyFertilizer: "उर्वरक",
    historyClear: "इतिहास साफ करें",
  },
  hinglish: {
    switcherLabel: "App language",
    navFeatures: "Features",
    navHow: "Kaise kaam karta hai",
    navCrops: "Crops",
    navOpenApp: "App kholo",
    heroEyebrow: "AI | ML | Agriculture",
    heroGrow: "Kheti",
    heroSmarter: "aur smarter",
    heroField: "aapke field ke liye",
    heroSub: "Soil conditions, real-time weather aur machine learning models ke basis par best crop aur fertilizer choose karo.",
    heroCropBtn: "Crop Recommendation",
    heroFertilizerBtn: "Fertilizer Recommendation",
    statsCropTypes: "Crop Types",
    statsFertilizers: "Fertilizers",
    statsModels: "ML Models",
    statsAccuracy: "Accuracy",
    featuresLabel: "Core Features",
    featuresTitleA: "Practical guidance,",
    featuresTitleB: "better decisions ke liye",
    processLabel: "Process",
    processTitleA: "Better crop choice ke",
    processTitleB: "3 simple steps",
    cropsLabel: "Supported Crops",
    cropsTitleA: "22 crops,",
    cropsTitleB: "one engine",
    ctaLabel: "Get Started",
    ctaTitleA: "Apne field se start karo.",
    ctaTitleB: "Kaam ki recommendation pao.",
    ctaSub: "Soil inputs, local weather aur AI guidance ka use karke crop ya fertilizer plan decide karne se pehle options compare karo.",
    ctaCropBtn: "Crops se start karo >",
    ctaFertilizerBtn: "Fertilizers try karo >",
    badgeMl: "ML-Powered",
    badgeWeather: "Real-time Weather",
    badgeSignup: "No signup",
    badgeFree: "Free to use",
    footerBuiltWith: "ML + Gemini AI ke saath built",
    footerCrops: "Crops",
    footerFertilizer: "Fertilizer",
    cropTitle: "Crop Recommender",
    cropSubtitle: "Do engines | ek goal: aapki zameen ke liye sahi crop",
    cropHistory: "Prediction History",
    cropTabMl: "ML Model",
    cropTabMlDesc: "N | P | K | Climate data",
    cropTabAi: "AI Advisor",
    cropTabAiDesc: "Region | Season | Gemini",
    fertilizerTitle: "Fertilizer Recommender",
    fertilizerSubtitle: "AI-powered fertilizer suggestion ke liye soil aur crop data bharo",
    fertilizerExample: "Example load karo",
    fertilizerHistory: "History",
    historyEyebrow: "Saved Decisions",
    historyTitle: "Prediction History",
    historySubtitle: "Recent crop aur fertilizer recommendations ek jagah dekho.",
    historyHome: "Home",
    historyBack: "Back",
    historyAll: "All",
    historyCrop: "Crop",
    historyFertilizer: "Fertilizer",
    historyClear: "History clear karo",
  },
};

const LanguageContext = createContext(null);

function getInitialLanguage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && TRANSLATIONS[saved]) return saved;
  } catch {}
  return "english";
}

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(getInitialLanguage);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch {}
  }, [language]);

  const value = useMemo(() => {
    const dictionary = TRANSLATIONS[language] || TRANSLATIONS.english;
    return {
      language,
      setLanguage,
      options: LANGUAGE_OPTIONS,
      t: (key) => dictionary[key] ?? TRANSLATIONS.english[key] ?? key,
    };
  }, [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
