import React, { useEffect, useState } from "react";
import { getAICropRecommendation } from "../../api/aiRecommender";
import { ADVISOR_LANGUAGES } from "../../config/cropRecommenderConfig";
import { getAdvisorUi, getLocalizedSeasons, mapProfileLanguageToAdvisor } from "../../config/cropCopy";
import { getFarmerProfile } from "../../utils/farmerProfile";
import { normalizeLocalizedCopy } from "../../utils/localization";
import { useLanguage } from "../../context/LanguageContext";
import { VoiceInputButton } from "./CropShared";
import AIResultsPanel from "./AIResultsPanel";

function AIAdvisorPanel() {
  const profileDefaults = getFarmerProfile();
  const { language: globalLanguage } = useLanguage();
  const [area, setArea] = useState(profileDefaults.region || "");
  const [season, setSeason] = useState(profileDefaults.defaultSeason || "");
  const [aiResults, setAiResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [voiceStatus, setVoiceStatus] = useState(null);
  const [language, setLanguage] = useState(globalLanguage || mapProfileLanguageToAdvisor(profileDefaults.language));
  const ui = normalizeLocalizedCopy(getAdvisorUi(language));
  const localizedSeasons = normalizeLocalizedCopy(getLocalizedSeasons(language));

  useEffect(() => {
    if (!aiResults) {
      setLanguage(globalLanguage || mapProfileLanguageToAdvisor(profileDefaults.language));
    }
  }, [globalLanguage, profileDefaults.language, aiResults]);

  const isValid = area.trim().length >= 2 && season !== "";

  const handleRecommend = async () => {
    if (!isValid) return;
    try {
      setLoading(true);
      setError("");
      setVoiceStatus(null);
      setAiResults(null);
      const results = await getAICropRecommendation(area.trim(), season, language);
      setAiResults(results);
    } catch (err) {
      setError(err.message || ui.genericAiError);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setAiResults(null);
    setArea("");
    setSeason("");
    setError("");
  };

  if (loading) {
    return (
      <div className="ai-loading">
        <div className="ai-loading__spinner" aria-hidden="true" />
        <p className="ai-loading__text">{ui.loadingText(area, season)}</p>
        <p className="ai-loading__sub">{ui.loadingSub}</p>
      </div>
    );
  }

  if (aiResults) {
    return (
      <AIResultsPanel
        aiResults={aiResults}
        area={area}
        season={season}
        language={language}
        onRetry={handleRecommend}
        onBackToForm={handleReset}
      />
    );
  }

  return (
    <div className="ai-form">
      <div className="ai-form__intro">
        <div className="ai-form__intro-icon" aria-hidden="true">
          AI
        </div>
        <div>
          <div className="ai-form__intro-title">{ui.introTitle}</div>
          <div className="ai-form__intro-sub">{ui.introSub}</div>
        </div>
      </div>

      <div className="ai-form__group">
        <div className="cr-section-label">{ui.responseLanguage}</div>
        <div className="ai-language-toggle" role="group" aria-label={ui.responseLanguageAria}>
          {ADVISOR_LANGUAGES.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`ai-language-btn${language === option.value ? " ai-language-btn--active" : ""}`}
              onClick={() => {
                setLanguage(option.value);
                setVoiceStatus(null);
              }}
              aria-pressed={language === option.value}
            >
              <span className="ai-language-btn__label">{option.label}</span>
              <span className="ai-language-btn__hint">{option.hint}</span>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="cr-alert" role="alert">
          <span className="cr-alert__icon" aria-hidden="true">
            !
          </span>
          {error}
        </div>
      )}

      <div className="ai-form__group">
        <label className="cr-section-label" htmlFor="ai-area">
          {ui.locationLabel}
        </label>
        <div className="ai-area-field">
          <span className="ai-area-field__icon" aria-hidden="true">
            LOC
          </span>
          <input
            id="ai-area"
            className="ai-area-field__input"
            type="text"
            placeholder={ui.locationPlaceholder}
            value={area}
            onChange={(e) => {
              setArea(e.target.value);
              setVoiceStatus(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && isValid && handleRecommend()}
            maxLength={80}
            autoComplete="off"
            spellCheck="false"
            aria-label={ui.locationAria}
          />
          <VoiceInputButton
            onResult={(text) => setArea(text)}
            onStatus={setVoiceStatus}
            lang={language === "english" ? "en-IN" : "hi-IN"}
            language={language}
          />
        </div>
        {voiceStatus && (
          <p className={`cr-voice-status cr-voice-status--${voiceStatus.type}`} role={voiceStatus.type === "error" ? "alert" : "status"}>
            {voiceStatus.message}
          </p>
        )}
        <p className="cr-hint" style={{ textAlign: "left", marginTop: "0.4rem" }}>
          {ui.locationHint}
        </p>
      </div>

      <div className="ai-form__group">
        <div className="cr-section-label">{ui.seasonLabel}</div>
        <div className="ai-season-grid">
          {localizedSeasons.map((s) => (
            <button
              key={s.value}
              className={`ai-season-btn${season === s.value ? " ai-season-btn--active" : ""}`}
              onClick={() => setSeason(s.value)}
              aria-pressed={season === s.value}
            >
              <span className="ai-season-btn__icon" aria-hidden="true">
                {s.icon}
              </span>
              <span className="ai-season-btn__label">{s.label}</span>
              <span className="ai-season-btn__desc">{s.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <button className={`cr-btn cr-btn--ai${!isValid ? " cr-btn--disabled" : ""}`} onClick={handleRecommend} disabled={!isValid} aria-disabled={!isValid}>
        <span className="cr-btn__sparkle" aria-hidden="true">
          AI
        </span>
        <span>{ui.submitLabel}</span>
        <span className="cr-btn__arrow" aria-hidden="true">
          >
        </span>
      </button>

      {!isValid && <p className="cr-hint">{ui.invalidHint}</p>}
    </div>
  );
}

export default AIAdvisorPanel;
