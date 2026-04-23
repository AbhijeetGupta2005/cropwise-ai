import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useHistory, useLocation } from 'react-router-dom'
import api from "../api/recommenderapi"
import { fertilizerData } from "./Data"
import { savePredictionHistory } from "../utils/predictionHistory"
import { useLanguage } from "../context/LanguageContext"
import "../styles/FertilizerRecommender.css"

function downloadTextReport(filename, content) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function getSuitabilityMeta(score, language = "english") {
  if (language === "hindi") {
    if (score >= 85) return { label: "बहुत उपयुक्त", tone: "high", note: "यह उर्वरक सुझाव मॉडल आउटपुट से मज़बूती से समर्थित है।" }
    if (score >= 65) return { label: "मध्यम रूप से उपयुक्त", tone: "mid", note: "यह उर्वरक सुझाव ठीक लगता है, लेकिन खेत की स्थिति जाँचना बेहतर रहेगा।" }
    return { label: "सावधानी बरतें", tone: "low", note: "इसे सावधानी वाला सुझाव मानें और लागू करने से पहले जाँच लें।" }
  }

  if (language === "hinglish") {
    if (score >= 85) return { label: "Highly Suitable", tone: "high", note: "Yeh fertilizer recommendation model output se strong support leti hai." }
    if (score >= 65) return { label: "Moderately Suitable", tone: "mid", note: "Yeh recommendation theek lagti hai, lekin field conditions check karna better rahega." }
    return { label: "Use Caution", tone: "low", note: "Is result ko cautious suggestion samjho aur apply karne se pehle verify karo." }
  }

  if (score >= 85) return { label: "Highly Suitable", tone: "high", note: "The fertilizer recommendation is strongly supported by the model output." }
  if (score >= 65) return { label: "Moderately Suitable", tone: "mid", note: "The fertilizer recommendation looks reasonable, but field conditions should still be checked." }
  return { label: "Use Caution", tone: "low", note: "Treat this fertilizer result as a cautious suggestion and verify before applying." }
}

function getFertilizerUi(language = "english") {
  if (language === "hindi") {
    return {
      recommendedFertilizer: "सुझाया गया उर्वरक",
      confidence: "विश्वास",
      supportedBy: "समर्थित मॉडल",
      lowConfidence: "कम विश्वास - मॉडल पूरी तरह सहमत नहीं हैं। कृपया मैन्युअली जाँचें।",
      modelBreakdown: "मॉडल विवरण",
      downloadResult: "रिज़ल्ट डाउनलोड करें",
      copyResult: "रिज़ल्ट कॉपी करें",
      copied: "कॉपी हो गया",
      backToPrediction: "सुझाव पर वापस जाएँ",
      fromCropRecommendation: "फसल सुझाव से आया हुआ",
      continuingWith: (crop) => `${crop} के साथ आगे बढ़ रहे हैं`,
      prefilledContext: "NPK और जलवायु मान पहले से भरे गए हैं",
      retry: "फिर कोशिश करें",
      soilComposition: "मिट्टी की संरचना",
      classification: "वर्गीकरण",
      soilType: "मिट्टी का प्रकार",
      cropType: "फसल का प्रकार",
      analysePredict: "विश्लेषण करें और सुझाव पाएँ",
      readyToPredict: "सुझाव के लिए तैयार",
      fieldsRemaining: (count) => `${count} फ़ील्ड बाकी`,
      loadExampleTitle: "उदाहरण डेटा भरें",
      exampleAria: "उदाहरण डेटा भरें",
      historyAria: "सुझाव इतिहास खोलें",
      dismissError: "त्रुटि हटाएँ और फिर से कोशिश करें",
      required: "ज़रूरी",
      mustBe: (min, max) => `${min}-${max} के बीच होना चाहिए`,
      allFieldsComplete: "सभी फ़ील्ड पूरे हैं - सुझाव के लिए तैयार",
      noConsensus: "कोई स्पष्ट सहमति नहीं",
      reportTitle: "उर्वरक सुझाव रिपोर्ट",
      reportRecommended: "सुझाया गया उर्वरक",
      reportInputSummary: "इनपुट सारांश",
      reportNotes: "नोट्स",
      search: (label) => `${label} खोजें...`,
      clearSearch: "खोज साफ़ करें",
      noResults: (query) => `"${query}" के लिए कोई परिणाम नहीं`,
      optionsCount: (count, query) => `${count} विकल्प${query ? ` "${query}" के लिए` : ""}`,
      selectLabel: (label) => `${label} चुनें...`,
      selectError: (label) => `कृपया ${label} चुनें`,
      winningModel: "विजेता मॉडल",
      fillRemainingTitle: (count) => `आगे बढ़ने के लिए बाकी ${count} फ़ील्ड भरें`,
      loadingPrediction: "सुझाव लोड हो रहा है...",
    }
  }

  if (language === "hinglish") {
    return {
      recommendedFertilizer: "Recommended Fertilizer",
      confidence: "confidence",
      supportedBy: "Supported by",
      lowConfidence: "Low confidence - models poori tarah agree nahi kar rahe. Manual check karo.",
      modelBreakdown: "Model Breakdown",
      downloadResult: "Result download karo",
      copyResult: "Result copy karo",
      copied: "Copied",
      backToPrediction: "Prediction par wapas",
      fromCropRecommendation: "Crop recommendation se",
      continuingWith: (crop) => `${crop} ke saath continue kar rahe hain`,
      prefilledContext: "NPK aur climate values prefilled hain",
      retry: "Retry",
      soilComposition: "Soil Composition",
      classification: "Classification",
      soilType: "Soil Type",
      cropType: "Crop Type",
      analysePredict: "Analyse aur predict karo",
      readyToPredict: "Predict karne ke liye ready",
      fieldsRemaining: (count) => `${count} field remaining`,
      loadExampleTitle: "Sample data se form bharo",
      exampleAria: "Example data load karo",
      historyAria: "Prediction history kholo",
      dismissError: "Error hatao aur dobara try karo",
      required: "Required",
      mustBe: (min, max) => `${min}-${max} ke beech hona chahiye`,
      allFieldsComplete: "All fields complete - ready to predict",
      noConsensus: "No clear consensus",
      reportTitle: "Fertilizer Recommendation Report",
      reportRecommended: "Recommended Fertilizer",
      reportInputSummary: "Input Summary",
      reportNotes: "Notes",
      search: (label) => `${label} search karo...`,
      clearSearch: "Search clear karo",
      noResults: (query) => `"${query}" ke liye koi result nahi mila`,
      optionsCount: (count, query) => `${count} option${count !== 1 ? "s" : ""}${query ? ` "${query}" ke liye` : ""}`,
      selectLabel: (label) => `${label} select karo...`,
      selectError: (label) => `Please ${label} select karo`,
      winningModel: "Winner",
      fillRemainingTitle: (count) => `Continue karne ke liye ${count} field fill karo`,
      loadingPrediction: "Prediction load ho raha hai...",
    }
  }

  return {
    recommendedFertilizer: "Recommended Fertilizer",
    confidence: "confidence",
    supportedBy: "Supported by",
    lowConfidence: "Low confidence - models disagree. Consider verifying manually.",
    modelBreakdown: "Model Breakdown",
    downloadResult: "Download Result",
    copyResult: "Copy Result",
    copied: "Copied",
    backToPrediction: "Back to Prediction",
    fromCropRecommendation: "From Crop Recommendation",
    continuingWith: (crop) => `Continuing with ${crop}`,
    prefilledContext: "Prefilled NPK and climate values",
    retry: "Retry",
    soilComposition: "Soil Composition",
    classification: "Classification",
    soilType: "Soil Type",
    cropType: "Crop Type",
    analysePredict: "Analyse & Predict",
    readyToPredict: "All fields complete - ready to predict",
    fieldsRemaining: (count) => `${count} field${count !== 1 ? "s" : ""} remaining`,
    loadExampleTitle: "Fill form with sample data",
    exampleAria: "Load example data",
    historyAria: "Open prediction history",
    dismissError: "Dismiss error and try again",
    required: "Required",
    mustBe: (min, max) => `Must be ${min}-${max}`,
    allFieldsComplete: "All fields complete - ready to predict",
    noConsensus: "No consensus",
    reportTitle: "Fertilizer Recommendation Report",
    reportRecommended: "Recommended Fertilizer",
    reportInputSummary: "Input Summary",
    reportNotes: "Notes",
    search: (label) => `Search ${label.toLowerCase()}...`,
    clearSearch: "Clear search",
    noResults: (query) => `No results for "${query}"`,
    optionsCount: (count, query) => `${count} option${count !== 1 ? "s" : ""}${query ? ` matching "${query}"` : ""}`,
    selectLabel: (label) => `Select ${label.toLowerCase()}...`,
    selectError: (label) => `Please select a ${label.toLowerCase()}`,
    winningModel: "Winning model",
    fillRemainingTitle: (count) => `Fill all ${count} remaining field${count !== 1 ? "s" : ""} to continue`,
    loadingPrediction: "Loading prediction results...",
  }
}

// ─── Field config ──────────────────────────────────────────────────────────────
const FIELDS = [
  { name: "Nitrogen",     label: "Nitrogen",      hint: "0 – 140",   unit: "kg/ha", icon: "N",  min: 0,   max: 140, step: 1   },
  { name: "Potassium",    label: "Potassium",     hint: "0 – 205",   unit: "kg/ha", icon: "K",  min: 0,   max: 205, step: 1   },
  { name: "Phosphorous",  label: "Phosphorous",   hint: "0 – 140",   unit: "kg/ha", icon: "P",  min: 0,   max: 140, step: 1   },
  { name: "Temperature",  label: "Temperature",   hint: "0 – 50 °C", unit: "°C",   icon: "T",  min: 0,   max: 50,  step: 0.1 },
  { name: "Humidity",     label: "Humidity",      hint: "0 – 100 %", unit: "%",    icon: "H",  min: 0,   max: 100, step: 0.1 },
  { name: "Moisture",     label: "Soil Moisture", hint: "0 – 100 %", unit: "%",    icon: "M",  min: 0,   max: 100, step: 0.1 },
]

const SOIL_TYPES = [
  { value: 'Sandy',  label: 'Sandy',  icon: '🟡', desc: 'Low water retention' },
  { value: 'Loamy',  label: 'Loamy',  icon: '🟤', desc: 'Best for most crops' },
  { value: 'Black',  label: 'Black',  icon: '⚫', desc: 'High moisture content' },
  { value: 'Red',    label: 'Red',    icon: '🔴', desc: 'Iron-rich, porous' },
  { value: 'Clayey', label: 'Clayey', icon: '🪨', desc: 'Heavy, water-retentive' },
]

const CROP_TYPES = [
  { value: 'Maize',        label: 'Maize',        icon: '🌽', desc: 'Kharif cereal crop' },
  { value: 'Sugarcane',    label: 'Sugarcane',    icon: '🎋', desc: 'High sugar content' },
  { value: 'Cotton',       label: 'Cotton',       icon: '🌸', desc: 'Fiber cash crop' },
  { value: 'Tobacco',      label: 'Tobacco',      icon: '🍃', desc: 'Commercial leaf crop' },
  { value: 'Paddy',        label: 'Paddy',        icon: '🌾', desc: 'Wetland staple' },
  { value: 'Barley',       label: 'Barley',       icon: '🌿', desc: 'Rabi cereal grain' },
  { value: 'Wheat',        label: 'Wheat',        icon: '🌻', desc: 'Winter staple grain' },
  { value: 'Millets',      label: 'Millets',      icon: '🌱', desc: 'Drought-resistant grain' },
  { value: 'Oil seeds',    label: 'Oil seeds',    icon: '🫒', desc: 'Sunflower, mustard' },
  { value: 'Pulses',       label: 'Pulses',       icon: '🫘', desc: 'Nitrogen-fixing legumes' },
  { value: 'Ground Nuts',  label: 'Ground Nuts',  icon: '🥜', desc: 'Kharif oilseed crop' },
]

// Encoding maps — must match training-time label encoding
const SOIL_MAP  = { Sandy: 4, Loamy: 2, Black: 0, Red: 3, Clayey: 1 }
const CROP_MAP  = {
  Barley: 0, Cotton: 1, "Ground Nuts": 2, Maize: 3,
  Millets: 4, "Oil seeds": 5, Paddy: 6, Pulses: 7,
  Sugarcane: 8, Tobacco: 9, Wheat: 10,
}

// Example data for "Load example" feature
const EXAMPLE_DATA = {
  Nitrogen: "90", Potassium: "40", Phosphorous: "40",
  Temperature: "26", Humidity: "52", Moisture: "38",
  soil_type: "Loamy", crop_type: "Wheat",
}

const INITIAL_FORM = FIELDS.reduce((acc, f) => ({ ...acc, [f.name]: "" }), {
  soil_type: "",
  crop_type: "",
})

const SESSION_KEY = 'fr-form-data'

function getLocalizedFieldConfig(language = "english") {
  if (language === "hindi") {
    return {
      Nitrogen: { label: "नाइट्रोजन" },
      Potassium: { label: "पोटैशियम" },
      Phosphorous: { label: "फॉस्फोरस" },
      Temperature: { label: "तापमान" },
      Humidity: { label: "नमी" },
      Moisture: { label: "मिट्टी की नमी" },
    }
  }
  return {}
}

function getLocalizedSoilTypes(language = "english") {
  if (language === "hindi") {
    return [
      { value: 'Sandy', label: 'बलुई', icon: '🟡', desc: 'पानी कम रोकती है' },
      { value: 'Loamy', label: 'दोमट', icon: '🟤', desc: 'अधिकतर फसलों के लिए उपयुक्त' },
      { value: 'Black', label: 'काली', icon: '⚫', desc: 'नमी अधिक रोकती है' },
      { value: 'Red', label: 'लाल', icon: '🔴', desc: 'लौह-समृद्ध और छिद्रयुक्त' },
      { value: 'Clayey', label: 'चिकनी', icon: '🪨', desc: 'भारी और पानी रोकने वाली' },
    ]
  }
  if (language === "hinglish") {
    return [
      { value: 'Sandy', label: 'Sandy', icon: '🟡', desc: 'Paani kam rokne wali' },
      { value: 'Loamy', label: 'Loamy', icon: '🟤', desc: 'Most crops ke liye best' },
      { value: 'Black', label: 'Black', icon: '⚫', desc: 'Moisture zyada hold karti hai' },
      { value: 'Red', label: 'Red', icon: '🔴', desc: 'Iron-rich aur porous' },
      { value: 'Clayey', label: 'Clayey', icon: '🪨', desc: 'Heavy aur water-retentive' },
    ]
  }
  return SOIL_TYPES
}

function getLocalizedCropTypes(language = "english") {
  if (language === "hindi") {
    return [
      { value: 'Maize', label: 'मक्का', icon: '🌽', desc: 'खरीफ अनाज फसल' },
      { value: 'Sugarcane', label: 'गन्ना', icon: '🎋', desc: 'उच्च शर्करा वाली फसल' },
      { value: 'Cotton', label: 'कपास', icon: '🌸', desc: 'रेशेदार नकदी फसल' },
      { value: 'Tobacco', label: 'तंबाकू', icon: '🍃', desc: 'व्यावसायिक पत्ती फसल' },
      { value: 'Paddy', label: 'धान', icon: '🌾', desc: 'गीली भूमि की मुख्य फसल' },
      { value: 'Barley', label: 'जौ', icon: '🌿', desc: 'रबी अनाज फसल' },
      { value: 'Wheat', label: 'गेहूँ', icon: '🌻', desc: 'सर्दियों की मुख्य फसल' },
      { value: 'Millets', label: 'मोटा अनाज', icon: '🌱', desc: 'सूखा-सहनशील अनाज' },
      { value: 'Oil seeds', label: 'तिलहन', icon: '🫒', desc: 'सरसों, सूरजमुखी आदि' },
      { value: 'Pulses', label: 'दलहन', icon: '🫘', desc: 'नाइट्रोजन स्थिर करने वाली फसलें' },
      { value: 'Ground Nuts', label: 'मूंगफली', icon: '🥜', desc: 'खरीफ तिलहन फसल' },
    ]
  }
  if (language === "hinglish") {
    return [
      { value: 'Maize', label: 'Maize', icon: '🌽', desc: 'Kharif cereal crop' },
      { value: 'Sugarcane', label: 'Sugarcane', icon: '🎋', desc: 'High sugar content' },
      { value: 'Cotton', label: 'Cotton', icon: '🌸', desc: 'Fiber cash crop' },
      { value: 'Tobacco', label: 'Tobacco', icon: '🍃', desc: 'Commercial leaf crop' },
      { value: 'Paddy', label: 'Paddy', icon: '🌾', desc: 'Wetland staple' },
      { value: 'Barley', label: 'Barley', icon: '🌿', desc: 'Rabi cereal crop' },
      { value: 'Wheat', label: 'Wheat', icon: '🌻', desc: 'Winter staple crop' },
      { value: 'Millets', label: 'Millets', icon: '🌱', desc: 'Drought-resistant grain' },
      { value: 'Oil seeds', label: 'Oil seeds', icon: '🫒', desc: 'Mustard, sunflower wagairah' },
      { value: 'Pulses', label: 'Pulses', icon: '🫘', desc: 'Nitrogen-fixing legumes' },
      { value: 'Ground Nuts', label: 'Ground Nuts', icon: '🥜', desc: 'Kharif oilseed crop' },
    ]
  }
  return CROP_TYPES
}

function getLocalizedSeasonLabel(season, language = "english") {
  if (!season) return season

  const seasonKey = String(season).toLowerCase()
  const labels = {
    kharif: { english: "Kharif", hindi: "खरीफ", hinglish: "Kharif" },
    rabi: { english: "Rabi", hindi: "रबी", hinglish: "Rabi" },
    zaid: { english: "Zaid", hindi: "ज़ायद", hinglish: "Zaid" },
  }

  return labels[seasonKey]?.[language] || season
}

function sanitizePrefillForm(prefill) {
  if (!prefill || typeof prefill !== 'object') return null

  const normalized = {
    Nitrogen: prefill.Nitrogen ?? "",
    Potassium: prefill.Potassium ?? "",
    Phosphorous: prefill.Phosphorous ?? "",
    Temperature: prefill.Temperature ?? "",
    Humidity: prefill.Humidity ?? "",
    Moisture: prefill.Moisture ?? "",
    soil_type: prefill.soil_type ?? "",
    crop_type: prefill.crop_type ?? "",
  }

  return normalized
}

// ─── Custom Dropdown ───────────────────────────────────────────────────────────
function CustomDropdown({ id, label, icon, options, value, onChange, onTouch, hasError, ui }) {
  const [open, setOpen]             = useState(false)
  const [query, setQuery]           = useState('')
  const [focusedIdx, setFocusedIdx] = useState(-1)
  const ref        = useRef(null)
  const inputRef   = useRef(null)
  const optionsRef = useRef([])

  const selected = options.find(o => o.value === value)
  const filtered = options.filter(o =>
    o.label.toLowerCase().includes(query.toLowerCase()) ||
    o.desc.toLowerCase().includes(query.toLowerCase())
  )

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Focus search when opened; reset query when closed
  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus()
    if (!open) { setQuery(''); setFocusedIdx(-1) }
  }, [open])

  // Scroll focused option into view
  useEffect(() => {
    if (focusedIdx >= 0 && optionsRef.current[focusedIdx]) {
      optionsRef.current[focusedIdx].scrollIntoView({ block: 'nearest' })
    }
  }, [focusedIdx])

  const handleSelect = (optValue) => {
    onChange(optValue)
    onTouch()
    setOpen(false)
    setQuery('')
    setFocusedIdx(-1)
  }

  const handleKeyDown = (e) => {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault()
        setOpen(true)
      }
      return
    }
    switch (e.key) {
      case 'Escape':
        setOpen(false)
        break
      case 'ArrowDown':
        e.preventDefault()
        setFocusedIdx(i => Math.min(i + 1, filtered.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setFocusedIdx(i => Math.max(i - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (focusedIdx >= 0 && filtered[focusedIdx]) {
          handleSelect(filtered[focusedIdx].value)
        } else if (filtered.length === 1) {
          handleSelect(filtered[0].value)
        }
        break
      case 'Tab':
        setOpen(false)
        break
      default:
        break
    }
  }

  const errorId = `${id}-error`
  const descId  = hasError ? errorId : undefined

  return (
    <div
      className={`fr-dropdown${open ? ' fr-dropdown--open' : ''}${hasError ? ' fr-dropdown--error' : ''}`}
      ref={ref}
    >
      {/* Trigger button
          NOTE: aria-invalid is NOT valid on role=button / <button>.
          Error state is communicated via aria-describedby → the visible
          error message, and the visual fr-dropdown--error border styling. */}
      <button
        type="button"
        className="fr-dropdown__trigger"
        onClick={() => setOpen(o => !o)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-describedby={descId}
      >
        <div className="fr-dropdown__trigger-icon" aria-hidden="true">
          <span>{icon}</span>
        </div>
        <div className="fr-dropdown__trigger-inner">
          <span className="fr-dropdown__trigger-label">{label}</span>
          {selected ? (
            <span className="fr-dropdown__selected-badge">
              <span className="fr-dropdown__selected-icon" aria-hidden="true">{selected.icon}</span>
              <span className="fr-dropdown__selected-text">{selected.label}</span>
            </span>
          ) : (
            <span className="fr-dropdown__placeholder">{ui.selectLabel(label)}</span>
          )}
        </div>
        <span className={`fr-dropdown__chevron${open ? ' fr-dropdown__chevron--open' : ''}`} aria-hidden="true">
          ›
        </span>
      </button>

      {/* Inline error — linked via aria-describedby on the trigger */}
      {hasError && (
        <span id={errorId} className="fr-field-error" role="alert">
          {ui.selectError(label)}
        </span>
      )}

      {/* Dropdown panel */}
      {open && (
        <div className="fr-dropdown__panel" role="listbox" aria-label={`${label} options`}>
          {/* Search */}
          <div className="fr-dropdown__search-wrap">
            <span className="fr-dropdown__search-icon" aria-hidden="true">⌕</span>
            <input
              ref={inputRef}
              className="fr-dropdown__search"
              type="text"
              placeholder={ui.search(label)}
              value={query}
              onChange={e => { setQuery(e.target.value); setFocusedIdx(0) }}
              onKeyDown={handleKeyDown}
              aria-label={`Search ${label} options`}
              autoComplete="off"
            />
            {query && (
              <button
                className="fr-dropdown__search-clear"
                onClick={() => { setQuery(''); setFocusedIdx(-1); inputRef.current?.focus() }}
                aria-label={ui.clearSearch}
              >
                ✕
              </button>
            )}
          </div>

          {/* Options */}
          <div className="fr-dropdown__options">
            {filtered.length === 0 ? (
              <div className="fr-dropdown__empty" role="status">{ui.noResults(query)}</div>
            ) : (
              filtered.map((opt, i) => (
                <button
                  key={opt.value}
                  ref={el => optionsRef.current[i] = el}
                  type="button"
                  role="option"
                  aria-selected={opt.value === value}
                  className={`fr-dropdown__option${opt.value === value ? ' fr-dropdown__option--active' : ''}${focusedIdx === i ? ' fr-dropdown__option--focused' : ''}`}
                  style={{ animationDelay: `${i * 30}ms` }}
                  onClick={() => handleSelect(opt.value)}
                  onMouseEnter={() => setFocusedIdx(i)}
                >
                  <span className="fr-dropdown__option-icon" aria-hidden="true">{opt.icon}</span>
                  <span className="fr-dropdown__option-body">
                    <span className="fr-dropdown__option-label">{opt.label}</span>
                    <span className="fr-dropdown__option-desc">{opt.desc}</span>
                  </span>
                  {opt.value === value && (
                    <span className="fr-dropdown__option-check" aria-label={label}>✓</span>
                  )}
                </button>
              ))
            )}
          </div>

          {/* Footer count */}
          <div className="fr-dropdown__footer" aria-live="polite">
            {ui.optionsCount(filtered.length, query)}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Confidence bar ────────────────────────────────────────────────────────────
function ConfidenceBar({ value }) {
  const color = value >= 80 ? '#c8f55a' : value >= 60 ? '#f5c842' : '#f55a5a'
  return (
    <div className="fr-conf-bar">
      <div className="fr-conf-bar__track" role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100} aria-label={`Confidence: ${value.toFixed(1)}%`}>
        <div className="fr-conf-bar__fill" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="fr-conf-bar__label" style={{ color }} aria-hidden="true">{value.toFixed(1)}%</span>
    </div>
  )
}

// ─── Model badge ───────────────────────────────────────────────────────────────
function ModelBadge({ label, prediction, probability, isFinal, delay, ui }) {
  return (
    <div
      className={`fr-model-badge${isFinal ? ' fr-model-badge--final' : ''}`}
      style={{ animationDelay: delay }}
    >
      <div className="fr-model-badge__header">
        <span className="fr-model-badge__label">{label}</span>
        {isFinal && <span className="fr-model-badge__crown" aria-label={ui.winningModel}>★ {ui.winningModel}</span>}
      </div>
      <span className="fr-model-badge__pred">{prediction}</span>
      <ConfidenceBar value={probability} />
    </div>
  )
}

// ─── Skeleton loader ───────────────────────────────────────────────────────────
function LoadingSkeleton({ ui }) {
  return (
    <div className="fr-skeleton" role="status" aria-live="polite" aria-label={ui.loadingPrediction}>
      <div className="fr-skeleton__img" />
      <div className="fr-skeleton__line fr-skeleton__line--wide" />
      <div className="fr-skeleton__line fr-skeleton__line--mid" />
      <div className="fr-skeleton__line" />
      <div className="fr-skeleton__line fr-skeleton__line--short" />
      <div className="fr-skeleton__block" />
    </div>
  )
}

// ─── Result view ───────────────────────────────────────────────────────────────
function FertilizerResult({ data, formData, onBack }) {
  const { language } = useLanguage()
  const ui         = getFertilizerUi(language)
  const fert       = fertilizerData[data.final_prediction]
  const xgbConf    = Math.min(100, Math.max(0, parseFloat(data.xgb_model_probability)))
  const rfConf     = Math.min(100, Math.max(0, parseFloat(data.rf_model_probability)))
  const svmConf    = Math.min(100, Math.max(0, parseFloat(data.svm_model_probability)))

  const winningConf = Math.max(xgbConf, rfConf, svmConf)
  const confClass   = winningConf >= 80 ? 'high' : winningConf >= 60 ? 'mid' : 'low'
  const suitability = getSuitabilityMeta(winningConf, language)

  const agreeingModels = [
    data.xgb_model_prediction === data.final_prediction && 'XGBoost',
    data.rf_model_prediction  === data.final_prediction && 'Random Forest',
    data.svm_model_prediction === data.final_prediction && 'SVM',
  ].filter(Boolean)

  const [imgError, setImgError] = useState(false)
  const [copied, setCopied]     = useState(false)

  const handleCopy = () => {
    const text = [
      `${ui.reportRecommended}: ${fert.title}`,
      `${ui.confidence}: ${winningConf.toFixed(2)}%`,
      `${ui.supportedBy}: ${agreeingModels.join(', ') || ui.noConsensus}`,
      '',
      fert.description,
    ].join('\n')
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleDownload = () => {
    const lines = [
      ui.reportTitle,
      "================================",
      `${ui.reportRecommended}: ${fert.title}`,
      `${ui.confidence}: ${winningConf.toFixed(2)}%`,
      `${ui.supportedBy}: ${agreeingModels.join(", ") || ui.noConsensus}`,
      "",
      ui.reportInputSummary,
      "-------------",
      `Nitrogen: ${formData?.Nitrogen || "--"}`,
      `Phosphorous: ${formData?.Phosphorous || "--"}`,
      `Potassium: ${formData?.Potassium || "--"}`,
      `Temperature: ${formData?.Temperature || "--"} C`,
      `Humidity: ${formData?.Humidity || "--"}%`,
      `Moisture: ${formData?.Moisture || "--"}%`,
      `Soil Type: ${formData?.soil_type || "--"}`,
      `Crop Type: ${formData?.crop_type || "--"}`,
      "",
      ui.reportNotes,
      "-----",
      fert.description,
    ].join('\n')

    downloadTextReport(
      `${String(data.final_prediction || "fertilizer").toLowerCase().replace(/\s+/g, "-")}-recommendation.txt`,
      lines
    )
  }

  return (
    <div className="fr-result">
      {/* Hero */}
      <div
        className="fr-result__hero"
        style={imgError ? { background: 'linear-gradient(135deg, #1a1f2e, #0f1318)' } : undefined}
      >
        {!imgError && (
          <img
            src={fert.imageUrl}
            alt={`${fert.title} fertilizer`}
            className="fr-result__hero-img"
            onError={() => setImgError(true)}
          />
        )}
        <div className="fr-result__hero-overlay" />
        <div className="fr-result__hero-text">
          <div className="fr-result__eyebrow">{ui.recommendedFertilizer}</div>
          <h1 className="fr-result__name">{fert.title}</h1>
          <div className="fr-result__hero-pills">
            <div className={`fr-conf-pill fr-conf-pill--${confClass}`}>
              {winningConf.toFixed(2)}% {ui.confidence}
            </div>
            <div className={`fr-suitability-pill fr-suitability-pill--${suitability.tone}`}>
              {suitability.label}
            </div>
          </div>
          <div className="fr-result__hero-meta">
            <span className="fr-result__hero-meta-item">
              {ui.supportedBy} <strong>{agreeingModels.join(', ') || ui.noConsensus}</strong>
            </span>
          </div>
        </div>
      </div>

      <div className="fr-result__body">
        <div className={`fr-suitability-banner fr-suitability-banner--${suitability.tone}`}>
          <strong>{suitability.label}</strong>
          <span>{suitability.note}</span>
        </div>
        <div className="fr-result__summary">
        {agreeingModels.length > 0 && (
          <div className="fr-agree-row">
            <span className="fr-agree-row__icon" aria-hidden="true">✓</span>
            <span>{ui.supportedBy} <strong>{agreeingModels.join(', ')}</strong></span>
          </div>
        )}

        {winningConf < 60 && (
          <div className="fr-warning" role="alert">
            ⚠ {ui.lowConfidence}
          </div>
        )}

        </div>

        <p className="fr-result__desc">{fert.description}</p>

        <div className="fr-section-label">{ui.modelBreakdown}</div>
        <div className="fr-models-grid">
          <ModelBadge
            label="XGBoost"
            prediction={data.xgb_model_prediction}
            probability={xgbConf}
            isFinal={data.xgb_model_prediction === data.final_prediction}
            delay="0ms"
            ui={ui}
          />
          <ModelBadge
            label="Random Forest"
            prediction={data.rf_model_prediction}
            probability={rfConf}
            isFinal={data.rf_model_prediction === data.final_prediction}
            delay="80ms"
            ui={ui}
          />
          <ModelBadge
            label="SVM"
            prediction={data.svm_model_prediction}
            probability={svmConf}
            isFinal={data.svm_model_prediction === data.final_prediction}
            delay="160ms"
            ui={ui}
          />
        </div>

        <div className="fr-result__actions">
          <button className="fr-btn fr-btn--ghost" onClick={handleDownload}>{ui.downloadResult}</button>
          <button className="fr-btn fr-btn--ghost" onClick={handleCopy} aria-live="polite">
            {copied ? `✓ ${ui.copied}` : `⎘ ${ui.copyResult}`}
          </button>
          <button className="fr-btn fr-btn--ghost" onClick={onBack}>
            ← {ui.backToPrediction}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────
function FertilizerRecommender() {
  const history = useHistory()
  const { t, language } = useLanguage()
  const ui = getFertilizerUi(language)
  const location = useLocation()
  const localizedFields = FIELDS.map((field) => ({
    ...field,
    ...(getLocalizedFieldConfig(language)[field.name] || {}),
  }))
  const localizedSoilTypes = getLocalizedSoilTypes(language)
  const localizedCropTypes = getLocalizedCropTypes(language)
  const sourceCrop = location.state?.sourceCrop || ""
  const sourceContext = location.state?.sourceContext || null
  const [formData,       setFormData]       = useState(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY)
      return saved ? JSON.parse(saved) : INITIAL_FORM
    } catch { return INITIAL_FORM }
  })
  const [predictionData, setPredictionData] = useState({})
  const [loadingStatus,  setLoadingStatus]  = useState(false)
  const [touched,        setTouched]        = useState({})
  const [rangeErrors,    setRangeErrors]    = useState({})

  useEffect(() => {
    const prefill = sanitizePrefillForm(location.state?.prefillForm)
    if (!prefill) return

    setFormData(prev => ({ ...prev, ...prefill }))
    setTouched({})
    setRangeErrors({})
  }, [location.state])

  // Persist form to sessionStorage on every change
  useEffect(() => {
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(formData)) } catch {}
  }, [formData])

  const filledCount = [
    ...FIELDS.map(f => formData[f.name] !== ""),
    formData.soil_type !== "",
    formData.crop_type !== "",
  ].filter(Boolean).length
  const totalFields   = FIELDS.length + 2
  const progressPct   = (filledCount / totalFields) * 100
  const hasRangeErrors = Object.values(rangeErrors).some(Boolean)
  const isFormValid   = filledCount === totalFields && !hasRangeErrors

  const handleChange = (e, key) => {
    const k = key ?? e.target.id
    setFormData(prev => ({ ...prev, [k]: e.target.value }))
    setTouched(prev => ({ ...prev, [k]: true }))
    // Clear range error when user changes value
    if (rangeErrors[k]) setRangeErrors(prev => ({ ...prev, [k]: null }))
  }

  const handleBlur = useCallback((name, min, max) => {
    const val = parseFloat(formData[name])
    if (formData[name] !== "" && (val < min || val > max)) {
      setRangeErrors(prev => ({ ...prev, [name]: ui.mustBe(min, max) }))
    } else {
      setRangeErrors(prev => ({ ...prev, [name]: null }))
    }
  }, [formData, ui])

  const handleDropdownChange = (key, val) => {
    setFormData(prev => ({ ...prev, [key]: val }))
  }

  const handleLoadExample = () => {
    setFormData(EXAMPLE_DATA)
    setTouched({})
    setRangeErrors({})
  }

  const handleSubmit = async () => {
    // Mark all fields as touched so errors surface
    const allTouched = [...FIELDS.map(f => f.name), 'soil_type', 'crop_type']
      .reduce((acc, k) => ({ ...acc, [k]: true }), {})
    setTouched(allTouched)

    if (!isFormValid) return

    try {
      setLoadingStatus(true)
      const payload = {
        Temperature:  parseFloat(formData.Temperature),
        Humidity:     parseFloat(formData.Humidity),
        Moisture:     parseFloat(formData.Moisture),
        "Soil Type":  SOIL_MAP[formData.soil_type],
        "Crop Type":  CROP_MAP[formData.crop_type],
        Nitrogen:     parseFloat(formData.Nitrogen),
        Potassium:    parseFloat(formData.Potassium),
        Phosphorous:  parseFloat(formData.Phosphorous),
      }
      const response = await api.post("/predict_fertilizer", payload, {
        headers: { "Content-Type": "application/json" },
        timeout: 8000,
      })
      savePredictionHistory({
        type: "fertilizer",
        result: fertilizerData[response.data.final_prediction]?.title || response.data.final_prediction,
        confidence: Math.max(
          parseFloat(response.data.xgb_model_probability) || 0,
          parseFloat(response.data.rf_model_probability) || 0,
          parseFloat(response.data.svm_model_probability) || 0
        ),
        inputs: { ...formData },
      })
      setPredictionData(response.data)
      // Clear persisted form on success
      try { sessionStorage.removeItem(SESSION_KEY) } catch {}
    } catch (error) {
      console.error(error)
      setPredictionData({
        error: error.code === "ECONNABORTED"
          ? (language === "hindi" ? "अनुरोध में समय लग गया। कृपया फिर कोशिश करें।" : language === "hinglish" ? "Request timeout ho gaya. Dobara try karo." : "Request timed out. Please try again.")
          : error.response?.data?.error || (language === "hindi" ? "सर्वर से संपर्क नहीं हो सका। कृपया फिर कोशिश करें।" : language === "hinglish" ? "Server tak nahi pahunch paaye. Dobara try karo." : "Unable to reach the server. Please try again."),
      })
    } finally {
      setLoadingStatus(false)
    }
  }

  const handleRetry = () => {
    setPredictionData({})
  }

  const handleBack = () => {
    setPredictionData({})
    setFormData(INITIAL_FORM)
    setTouched({})
    setRangeErrors({})
    try { sessionStorage.removeItem(SESSION_KEY) } catch {}
  }

  if (loadingStatus) return <LoadingSkeleton ui={ui} />

  if (predictionData.final_prediction) {
    return <FertilizerResult data={predictionData} formData={formData} onBack={handleBack} />
  }

  return (
    <div className="fr-page">
      <div className="fr-orb fr-orb--1" aria-hidden="true" />
      <div className="fr-orb fr-orb--2" aria-hidden="true" />

      <div className="fr-card" role="main">
        {/* Header */}
        <div className="fr-card__header">
          <div className="fr-card__icon" aria-hidden="true">🌱</div>
          <div style={{ flex: 1 }}>
            <h1 className="fr-card__title">{t('fertilizerTitle')}</h1>
            <p className="fr-card__sub">
              <span className="fr-status-dot" aria-hidden="true" />
              {t('fertilizerSubtitle')}
            </p>
          </div>
          <button
            type="button"
            className="fr-btn--example"
            onClick={handleLoadExample}
            title={ui.loadExampleTitle}
            aria-label={ui.exampleAria}
          >
            {t('fertilizerExample')}
          </button>
          <button
            type="button"
            className="fr-btn--example"
            onClick={() => history.push('/history')}
            aria-label={ui.historyAria}
          >
            {t('fertilizerHistory')}
          </button>
        </div>

        {sourceCrop && (
          <div className="fr-handoff">
            <div className="fr-handoff__eyebrow">{ui.fromCropRecommendation}</div>
            <div className="fr-handoff__title">{ui.continuingWith(sourceCrop)}</div>
            <div className="fr-handoff__meta">
              <span>{ui.prefilledContext}</span>
              {sourceContext?.confidence ? <span>{sourceContext.confidence.toFixed(2)}% {ui.confidence}</span> : null}
              {sourceContext?.model ? <span>{sourceContext.model}</span> : null}
              {sourceContext?.season ? <span>{getLocalizedSeasonLabel(sourceContext.season, language)}</span> : null}
              {sourceContext?.region ? <span>{sourceContext.region}</span> : null}
            </div>
          </div>
        )}

        {predictionData.error && (
          <div className="fr-alert" role="alert">
            <span className="fr-alert__icon" aria-hidden="true">⚠</span>
            <span>{predictionData.error}</span>
            <button
              type="button"
              className="fr-alert__retry"
              onClick={handleRetry}
              aria-label={ui.dismissError}
            >
              {ui.retry} ↺
            </button>
          </div>
        )}

        {/* Numeric inputs */}
        <div className="fr-section-label">{ui.soilComposition}</div>
        <div className="fr-inputs-grid">
          {localizedFields.map(({ name, label, hint, unit, icon, min, max, step }, i) => {
            const hasError     = touched[name] && !formData[name]
            const hasRange     = !!rangeErrors[name]
            const fieldErrorId = `${name}-error`
            return (
              <div
                key={name}
                className={`fr-field${hasError || hasRange ? ' fr-field--error' : ''}`}
                style={{ animationDelay: `${i * 55}ms` }}
              >
                <div className="fr-field__icon" aria-hidden="true">{icon}</div>
                <div className="fr-field__inner">
                  <input
                    className="fr-field__input"
                    type="number"
                    id={name}
                    value={formData[name]}
                    onChange={handleChange}
                    onBlur={() => handleBlur(name, min, max)}
                    min={min}
                    max={max}
                    step={step}
                    placeholder=" "
                    autoComplete="off"
                    aria-invalid={hasError || hasRange || undefined}
                    aria-describedby={hasError || hasRange ? fieldErrorId : undefined}
                  />
                  <label className="fr-floating-label" htmlFor={name}>{label}</label>
                  <span className="fr-field__hint" aria-hidden="true">{hint}</span>
                </div>
                <span className="fr-field__unit" aria-hidden="true">{unit}</span>
                {(hasError || hasRange) && (
                  <span id={fieldErrorId} className="fr-field-error" role="alert">
                    {hasRange ? rangeErrors[name] : ui.required}
                  </span>
                )}
              </div>
            )
          })}
        </div>

        {/* Custom Dropdowns */}
        <div className="fr-section-label" style={{ marginTop: '1.8rem' }}>{ui.classification}</div>
        <div className="fr-selects-row">
          <CustomDropdown
            id="soil_type"
            label={ui.soilType}
            icon="🪨"
            options={localizedSoilTypes}
            value={formData.soil_type}
            onChange={(val) => handleDropdownChange('soil_type', val)}
            onTouch={() => setTouched(prev => ({ ...prev, soil_type: true }))}
            hasError={touched.soil_type && !formData.soil_type}
            ui={ui}
          />
          <CustomDropdown
            id="crop_type"
            label={ui.cropType}
            icon="🌾"
            options={localizedCropTypes}
            value={formData.crop_type}
            onChange={(val) => handleDropdownChange('crop_type', val)}
            onTouch={() => setTouched(prev => ({ ...prev, crop_type: true }))}
            hasError={touched.crop_type && !formData.crop_type}
            ui={ui}
          />
        </div>

        {/* Progress */}
        <div
          className="fr-progress"
          role="progressbar"
          aria-valuenow={Math.round(progressPct)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Form completion: ${Math.round(progressPct)}%`}
        >
          <div className="fr-progress__fill" style={{ width: `${progressPct}%` }} />
        </div>

        <button
          className={`fr-btn fr-btn--primary${!isFormValid ? ' fr-btn--disabled' : ''}`}
          onClick={handleSubmit}
          disabled={!isFormValid}
          aria-disabled={!isFormValid}
          title={!isFormValid ? ui.fillRemainingTitle(totalFields - filledCount) : undefined}
          aria-describedby="fr-submit-hint"
        >
          <span>{ui.analysePredict}</span>
          <span className="fr-btn__arrow" aria-hidden="true">→</span>
        </button>

        <p
          id="fr-submit-hint"
          className="fr-hint"
          style={{ color: isFormValid ? 'rgba(200,245,90,0.7)' : undefined }}
          aria-live="polite"
        >
          {isFormValid
            ? `✓ ${ui.allFieldsComplete}`
            : ui.fieldsRemaining(totalFields - filledCount)}
        </p>
      </div>
    </div>
  )
}

export default FertilizerRecommender
