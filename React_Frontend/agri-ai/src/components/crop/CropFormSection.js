import React from "react";
import { FIELDS } from "../../config/cropRecommenderConfig";
import { SoilHealthGauge, SoilTestImport, SliderField } from "./CropShared";

function CropFormSection({
  ui,
  city,
  setCity,
  handleAutoFill,
  loadingWeather,
  formData,
  handleChange,
  setFormData,
  localizedSeasons,
  profileForm,
  handleProfileChange,
  profileLanguageOptions,
  setProfileForm,
  handleSaveProfile,
  handleApplyProfile,
  handleClearProfile,
  handleSoilImport,
  soilScore,
  localizedFields,
  handleBlur,
  rangeErrors,
  touched,
  activeExplainerId,
  setActiveExplainerId,
  progressPct,
  isFormValid,
  handleSubmit,
  hasRangeErrors,
  filledCount,
}) {
  return (
    <>
      <div className="cr-section-label">{ui.autoFillWeather}</div>
      <div className="cr-autofill-box">
        <input
          type="text"
          placeholder={ui.autoFillPlaceholder}
          value={city}
          onChange={(e) => setCity(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAutoFill()}
          className="cr-autofill-input"
          aria-label={ui.autoFillPlaceholder}
        />
        <button onClick={handleAutoFill} disabled={loadingWeather} className="cr-autofill-btn">
          {loadingWeather ? ui.autoFillLoading : `📍 ${ui.autoFillAction}`}
        </button>
      </div>

      <div className="cr-section-label">{ui.optionalContext}</div>
      <div className="cr-context-grid">
        <div className="cr-field">
          <div className="cr-field__icon" aria-hidden="true">
            RG
          </div>
          <div className="cr-field__inner">
            <input
              className="cr-field__input"
              id="region"
              name="region"
              type="text"
              value={formData.region}
              onChange={handleChange}
              placeholder=" "
              autoComplete="off"
              aria-label={ui.regionLabel}
            />
            <label className="cr-floating-label" htmlFor="region">
              {ui.regionLabel}
            </label>
            <span className="cr-field__hint" aria-hidden="true">
              {ui.regionHint}
            </span>
          </div>
        </div>

        <div className="cr-season-chips">
          {localizedSeasons.map((season) => (
            <button
              key={season.value}
              type="button"
              className={`cr-season-chip${formData.season === season.value ? " cr-season-chip--active" : ""}`}
              onClick={() =>
                setFormData((prev) => ({
                  ...prev,
                  season: prev.season === season.value ? "" : season.value,
                }))
              }
              aria-pressed={formData.season === season.value}
            >
              <span className="cr-season-chip__title">{season.label}</span>
              <span className="cr-season-chip__desc">{season.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="cr-section-label">{ui.farmerProfile}</div>
      <div className="cr-profile-card">
        <div className="cr-profile-grid">
          <div className="cr-field">
            <div className="cr-field__icon" aria-hidden="true">
              FN
            </div>
            <div className="cr-field__inner">
              <input
                className="cr-field__input"
                id="farmerName"
                name="farmerName"
                type="text"
                value={profileForm.farmerName}
                onChange={handleProfileChange}
                placeholder=" "
                autoComplete="off"
              />
              <label className="cr-floating-label" htmlFor="farmerName">
                {ui.farmerName}
              </label>
            </div>
          </div>

          <div className="cr-field">
            <div className="cr-field__icon" aria-hidden="true">
              FM
            </div>
            <div className="cr-field__inner">
              <input
                className="cr-field__input"
                id="farmName"
                name="farmName"
                type="text"
                value={profileForm.farmName}
                onChange={handleProfileChange}
                placeholder=" "
                autoComplete="off"
              />
              <label className="cr-floating-label" htmlFor="farmName">
                {ui.farmName}
              </label>
            </div>
          </div>

          <div className="cr-field">
            <div className="cr-field__icon" aria-hidden="true">
              RG
            </div>
            <div className="cr-field__inner">
              <input
                className="cr-field__input"
                id="profileRegion"
                name="profileRegion"
                type="text"
                value={profileForm.region}
                onChange={handleProfileChange}
                placeholder=" "
                autoComplete="off"
              />
              <label className="cr-floating-label" htmlFor="profileRegion">
                {ui.defaultRegion}
              </label>
            </div>
          </div>

          <div className="cr-field cr-field--segmented">
            <div className="cr-field__icon" aria-hidden="true">
              LG
            </div>
            <div className="cr-field__inner cr-field__inner--segmented">
              <span className="cr-field__label-top">{ui.preferredLanguage}</span>
              <div className="cr-profile-language-group" role="group" aria-label={ui.preferredLanguage}>
                {profileLanguageOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`cr-profile-language-btn${profileForm.language === option.value ? " cr-profile-language-btn--active" : ""}`}
                    onClick={() => setProfileForm((prev) => ({ ...prev, language: option.value }))}
                    aria-pressed={profileForm.language === option.value}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="cr-season-chips cr-season-chips--profile">
          {localizedSeasons.map((season) => (
            <button
              key={season.value}
              type="button"
              className={`cr-season-chip${profileForm.defaultSeason === season.value ? " cr-season-chip--active" : ""}`}
              onClick={() =>
                setProfileForm((prev) => ({
                  ...prev,
                  defaultSeason: prev.defaultSeason === season.value ? "" : season.value,
                }))
              }
              aria-pressed={profileForm.defaultSeason === season.value}
            >
              <span className="cr-season-chip__title">{season.label}</span>
              <span className="cr-season-chip__desc">{season.desc}</span>
            </button>
          ))}
        </div>

        <div className="cr-profile-actions">
          <button type="button" className="cr-btn cr-btn--ghost" onClick={handleSaveProfile}>
            {ui.saveProfile}
          </button>
          <button type="button" className="cr-btn cr-btn--ghost" onClick={handleApplyProfile}>
            {ui.applyProfile}
          </button>
          <button type="button" className="cr-btn cr-btn--ghost" onClick={handleClearProfile}>
            {ui.clearProfile}
          </button>
        </div>
      </div>

      <SoilTestImport onImport={handleSoilImport} />

      <div className="cr-fields-header">
        <div className="cr-section-label" style={{ margin: 0 }}>
          {ui.soilClimate}
        </div>
        <SoilHealthGauge score={soilScore} />
      </div>

      <div className="cr-inputs-grid cr-inputs-grid--sliders">
        {localizedFields.map((field) => (
          <SliderField
            key={field.id}
            {...field}
            value={formData[field.id]}
            onChange={handleChange}
            onBlur={handleBlur}
            error={rangeErrors[field.id] || (touched[field.id] && formData[field.id] === "" ? ui.required : "")}
            isExplainerOpen={activeExplainerId === field.id}
            onToggleExplainer={setActiveExplainerId}
          />
        ))}
      </div>

      <div className="cr-progress" role="progressbar" aria-valuenow={Math.round(progressPct)} aria-valuemin={0} aria-valuemax={100}>
        <div className="cr-progress__fill" style={{ width: `${progressPct}%` }} />
      </div>

      <button
        className={`cr-btn cr-btn--primary${!isFormValid ? " cr-btn--disabled" : ""}`}
        onClick={handleSubmit}
        disabled={!isFormValid}
        aria-disabled={!isFormValid}
      >
        <span>{ui.analysePredict}</span>
        <span className="cr-btn__arrow" aria-hidden="true">
          >
        </span>
      </button>

      <p className="cr-hint" style={{ color: isFormValid ? "rgba(200,245,90,0.7)" : undefined }} aria-live="polite">
        {isFormValid ? ui.readyToPredict : hasRangeErrors ? ui.reviewValues : ui.fieldsRemaining(FIELDS.length - filledCount)}
      </p>
    </>
  );
}

export default CropFormSection;
