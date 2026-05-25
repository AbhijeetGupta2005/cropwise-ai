import React from "react";
import { CROP_IMAGE_MAP } from "../../config/cropRecommenderConfig";
import { getAdvisorUi, localizeAdvisorScale } from "../../config/cropCopy";
import { normalizeLocalizedCopy } from "../../utils/localization";
import AIFollowUpChat from "./AIFollowUpChat";

function isFallbackCrop(crop) {
  return crop.source === "fallback" || /rule-based fallback/i.test(crop.reason || "");
}

function isFallbackAdvisorMeta(meta) {
  return meta?.mode === "fallback" || meta?.source === "local-fallback";
}

function cleanAdviceReason(reason) {
  return (reason || "").replace(/^Rule-based fallback(?:\s+for\s+[^:]+)?:\s*/i, "");
}

function getAICropPlaceholderMeta(cropKey, cropName) {
  const fallbackName = cropName || "Crop";
  const placeholderMap = {
    wheat: { icon: "🌾", accent: "grain", label: "Wheat Field" },
    mustard: { icon: "🌼", accent: "flower", label: "Mustard Field" },
    chickpea: { icon: "🌿", accent: "pulse", label: "Chickpea Field" },
    lentil: { icon: "🌱", accent: "pulse", label: "Lentil Field" },
    rice: { icon: "🌾", accent: "grain", label: "Rice Field" },
    maize: { icon: "🌽", accent: "grain", label: "Maize Field" },
    cotton: { icon: "☁", accent: "fiber", label: "Cotton Field" },
    pigeonpeas: { icon: "🌿", accent: "pulse", label: "Pigeon Pea Field" },
  };

  return placeholderMap[cropKey] || {
    icon: "🌱",
    accent: "default",
    label: `${fallbackName} Crop`,
  };
}

function AICropCard({ crop, index, language }) {
  const ui = normalizeLocalizedCopy(getAdvisorUi(language));
  const cropKey = crop.crop?.toLowerCase().replace(/\(.*?\)/g, "").replace(/\s+/g, "").replace(/[^a-z]/g, "").trim();
  const imgSrc = CROP_IMAGE_MAP[cropKey] || null;
  const placeholderMeta = normalizeLocalizedCopy(getAICropPlaceholderMeta(cropKey, crop.crop));
  const confColor = crop.confidence === "High" ? "high" : crop.confidence === "Medium" ? "mid" : "low";
  const fitColor = crop.season_fit === "Perfect" ? "high" : crop.season_fit === "Good" ? "mid" : "low";
  const fallback = isFallbackCrop(crop);
  const reason = cleanAdviceReason(crop.reason);
  const confidenceLabel = normalizeLocalizedCopy(localizeAdvisorScale(crop.confidence, language, "confidence"));
  const fitLabel = normalizeLocalizedCopy(localizeAdvisorScale(crop.season_fit, language, "fit"));
  const sourceLabel = normalizeLocalizedCopy(fallback ? (language === "hindi" ? "स्थानीय" : "Local") : "Gemini");
  const confidenceWord = normalizeLocalizedCopy(language === "hindi" ? "विश्वास" : "confidence");
  const fitWord = normalizeLocalizedCopy(language === "hindi" ? "मेल" : "fit");

  return (
    <div className={`ai-card${fallback ? " ai-card--fallback" : ""}`} style={{ animationDelay: `${index * 120}ms` }}>
      <div className="ai-card__rank">#{index + 1}</div>
      <div className="ai-card__source">{sourceLabel}</div>

      <div className="ai-card__img-wrap">
        {imgSrc ? (
          <img src={imgSrc} alt={crop.crop} className="ai-card__img" />
        ) : (
          <div className={`ai-card__img-placeholder ai-card__img-placeholder--${placeholderMeta.accent}`}>
            <span className="ai-card__img-placeholder-icon" aria-hidden="true">
              {placeholderMeta.icon}
            </span>
            <span className="ai-card__img-placeholder-title">{placeholderMeta.label}</span>
          </div>
        )}
        <div className="ai-card__img-overlay" />
        <div className="ai-card__img-label">{crop.crop}</div>
      </div>

      <div className="ai-card__body">
        <div className="ai-card__pills">
          <span className={`ai-pill ai-pill--${confColor}`}>
            {confidenceLabel} {confidenceWord}
          </span>
          <span className={`ai-pill ai-pill--${fitColor}`}>
            {fitLabel} {fitWord}
          </span>
          <span className="ai-pill ai-pill--neutral">
            {ui.cardWater}: {crop.water_need}
          </span>
        </div>

        <div className="ai-card__reason-block">
          <span className="ai-card__reason-label">{ui.cardReason}</span>
          <p className="ai-card__reason">{reason}</p>
        </div>

        <div className="ai-card__soil">
          <span className="ai-card__soil-label">{ui.cardSoil}</span>
          <span className="ai-card__soil-value">{crop.soil_type}</span>
        </div>
      </div>
    </div>
  );
}

function AIResultsPanel({ aiResults, area, season, language, onRetry, onBackToForm }) {
  const ui = normalizeLocalizedCopy(getAdvisorUi(language));
  const resultItems = Array.isArray(aiResults.items) ? aiResults.items : [];
  const cropContext = { area, season, crops: resultItems.map((c) => c.crop) };
  const fallbackMode = isFallbackAdvisorMeta(aiResults.meta) || resultItems.some(isFallbackCrop);
  const modeLabel = fallbackMode ? ui.offlineMode : ui.liveMode;

  return (
    <div className="ai-results">
      <div className="ai-results__header">
        <div>
          <div className="cr-section-label">{ui.resultsLabel(season)}</div>
          <h2 className="ai-results__title">{ui.resultsTitle(area)}</h2>
        </div>
        <div className="ai-results__header-actions">
          {fallbackMode && (
            <button className="cr-btn cr-btn--ghost ai-results__retry" onClick={onRetry}>
              {ui.retryLiveAi}
            </button>
          )}
          <button className="cr-btn cr-btn--ghost ai-results__back" onClick={onBackToForm}>
            {ui.backToForm}
          </button>
        </div>
      </div>
      <div className="ai-results__meta" aria-label="Recommendation summary">
        <span className={`ai-results__meta-pill${fallbackMode ? " ai-results__meta-pill--fallback" : " ai-results__meta-pill--live"}`}>
          {modeLabel}
        </span>
        <span className="ai-results__meta-pill">{ui.languageMeta}</span>
        <span className="ai-results__meta-pill">{ui.seasonMeta(season)}</span>
        <span className="ai-results__meta-pill">{ui.optionsMeta(resultItems.length)}</span>
      </div>
      <div className={`ai-results__disclaimer${fallbackMode ? " ai-results__disclaimer--fallback" : " ai-results__disclaimer--live"}`}>
        <span className="ai-results__disclaimer-icon" aria-hidden="true">
          AI
        </span>
        {fallbackMode ? ui.fallbackDisclaimer : ui.liveDisclaimer}
      </div>
      <div className="ai-cards-grid">
        {resultItems.map((crop, i) => (
          <AICropCard key={i} crop={crop} index={i} language={language} />
        ))}
      </div>
      <AIFollowUpChat cropContext={cropContext} language={language} />
    </div>
  );
}

export default AIResultsPanel;
