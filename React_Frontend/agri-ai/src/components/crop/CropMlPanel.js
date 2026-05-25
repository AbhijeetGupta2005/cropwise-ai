import React, { useCallback, useEffect, useState } from "react";
import { predictCrop } from "../../api/predictions";
import { getWeatherData } from "../../api/weather";
import { cropData } from "../Data";
import { DISPLAY_FIELDS, FIELDS, INITIAL_FORM, weightedVote } from "../../config/cropRecommenderConfig";
import { getCropUi, getLocalizedFieldMeta, getLocalizedSeasons, getProfileLanguageOptions } from "../../config/cropCopy";
import { clearFarmerProfile, getFarmerProfile, saveFarmerProfile } from "../../utils/farmerProfile";
import { normalizeLocalizedCopy } from "../../utils/localization";
import { savePredictionHistory } from "../../utils/predictionHistory";
import { useLanguage } from "../../context/LanguageContext";
import { clampToFieldRange, computeSoilHealthScore, LoadingSkeleton } from "./CropShared";
import CropFormSection from "./CropFormSection";
import CropMlResultPanel from "./CropMlResultPanel";

function MLPanel() {
  const { language } = useLanguage();
  const ui = normalizeLocalizedCopy(getCropUi(language));
  const localizedSeasons = normalizeLocalizedCopy(getLocalizedSeasons(language));
  const profileLanguageOptions = normalizeLocalizedCopy(getProfileLanguageOptions(language));
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [city, setCity] = useState("");
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [predictionData, setPredictionData] = useState({});
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [touched, setTouched] = useState({});
  const [rangeErrors, setRangeErrors] = useState({});
  const [profileForm, setProfileForm] = useState(() => getFarmerProfile());
  const [activeExplainerId, setActiveExplainerId] = useState(null);

  useEffect(() => {
    try {
      const s = sessionStorage.getItem("cr-ml-form");
      if (s) setFormData(JSON.parse(s));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem("cr-ml-form", JSON.stringify(formData));
    } catch {}
  }, [formData]);

  const filledCount = FIELDS.filter((field) => formData[field.id] !== "").length;
  const hasRangeErrors = Object.values(rangeErrors).some(Boolean);
  const isFormValid = filledCount === FIELDS.length && !hasRangeErrors;
  const progressPct = (filledCount / FIELDS.length) * 100;
  const soilScore = computeSoilHealthScore(formData);
  const localizedFieldMeta = normalizeLocalizedCopy(getLocalizedFieldMeta(language));
  const localizedFields = DISPLAY_FIELDS.map((field) => ({
    ...field,
    ...(localizedFieldMeta[field.id] || {}),
  }));

  const handleChange = useCallback(
    (idOrEvent, directValue) => {
      let id;
      let value;
      if (typeof idOrEvent === "string") {
        id = idOrEvent;
        value = directValue;
      } else {
        id = idOrEvent.target.id;
        value = idOrEvent.target.value;
      }
      const nextValue = clampToFieldRange(id, value);
      setFormData((prev) => ({ ...prev, [id]: nextValue }));
      setTouched((prev) => ({ ...prev, [id]: true }));
      if (rangeErrors[id]) setRangeErrors((prev) => ({ ...prev, [id]: null }));
    },
    [rangeErrors]
  );

  const handleBlur = useCallback(
    (id) => {
      const field = FIELDS.find((item) => item.id === id);
      if (!field) return;

      const rawValue = formData[id];
      if (rawValue === "") {
        setTouched((prev) => ({ ...prev, [id]: true }));
        return;
      }

      const numeric = parseFloat(rawValue);
      if (Number.isNaN(numeric)) {
        setRangeErrors((prev) => ({ ...prev, [id]: "Enter a valid number" }));
        return;
      }

      const clamped = Math.min(field.max, Math.max(field.min, numeric));
      if (clamped !== numeric) {
        setFormData((prev) => ({ ...prev, [id]: String(clamped) }));
        setRangeErrors((prev) => ({ ...prev, [id]: `Adjusted to ${field.min}-${field.max}` }));
        return;
      }

      setRangeErrors((prev) => ({ ...prev, [id]: null }));
    },
    [formData]
  );

  const handleAutoFill = async () => {
    if (!city.trim()) {
      alert(ui.enterCity);
      return;
    }
    try {
      setLoadingWeather(true);
      const data = await getWeatherData(city.trim());
      if (!data) {
        alert(ui.loadError);
        return;
      }
      setFormData((prev) => ({
        ...prev,
        temperature: String(Math.round(data.temperature)),
        humidity: String(Math.round(data.humidity)),
        rainfall: String(Math.round(data.rainfall)),
        ph: prev.ph || "6.5",
      }));
      setTouched((prev) => ({
        ...prev,
        temperature: true,
        humidity: true,
        rainfall: true,
        ph: prev.ph ? prev.ph : true,
      }));
    } catch {
      alert(ui.weatherFetchFailed);
    } finally {
      setLoadingWeather(false);
    }
  };

  const handleProfileChange = useCallback((event) => {
    const { id, value } = event.target;
    const keyMap = {
      farmerName: "farmerName",
      farmName: "farmName",
      profileRegion: "region",
      profileLanguage: "language",
    };
    setProfileForm((prev) => ({ ...prev, [keyMap[id] || id]: value }));
  }, []);

  const handleSaveProfile = () => {
    saveFarmerProfile(profileForm);
  };

  const handleApplyProfile = () => {
    setFormData((prev) => ({
      ...prev,
      region: prev.region || profileForm.region || "",
      season: prev.season || profileForm.defaultSeason || "",
    }));
  };

  const handleClearProfile = () => {
    clearFarmerProfile();
    setProfileForm(getFarmerProfile());
  };

  const handleSubmit = async () => {
    const allTouched = FIELDS.reduce((acc, field) => ({ ...acc, [field.id]: true }), {});
    setTouched(allTouched);
    if (!isFormValid) return;
    try {
      setLoadingStatus(true);
      const result = await predictCrop(formData);
      const finalPrediction =
        result.final_prediction ||
        weightedVote(
          result.xgb_model_prediction,
          result.rf_model_prediction,
          result.knn_model_prediction,
          parseFloat(result.xgb_model_probability),
          parseFloat(result.rf_model_probability),
          parseFloat(result.knn_model_probability)
        );

      const matchingConfidence =
        [
          { label: result.xgb_model_prediction, value: parseFloat(result.xgb_model_probability) },
          { label: result.rf_model_prediction, value: parseFloat(result.rf_model_probability) },
          { label: result.knn_model_prediction, value: parseFloat(result.knn_model_probability) },
        ]
          .filter((item) => item.label === finalPrediction)
          .sort((a, b) => b.value - a.value)[0]?.value ?? 0;

      savePredictionHistory({
        type: "crop",
        result: cropData[finalPrediction]?.title || finalPrediction,
        confidence: matchingConfidence,
        inputs: { ...formData },
      });
      setPredictionData(result);
      try {
        sessionStorage.removeItem("cr-ml-form");
      } catch {}
    } catch (error) {
      setPredictionData({
        error: error.code === "ECONNABORTED" ? ui.requestTimedOut : ui.unableToReach,
      });
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleSoilImport = (parsed) => {
    setFormData((prev) => ({ ...prev, ...parsed }));
  };

  if (loadingStatus) return <LoadingSkeleton />;
  if (predictionData.final_prediction) {
    return <CropMlResultPanel predictionData={predictionData} formData={formData} onBack={() => setPredictionData({})} />;
  }

  return (
    <>
      {predictionData.error && (
        <div className="cr-alert" role="alert">
          <span className="cr-alert__icon" aria-hidden="true">
            ⚠
          </span>
          <span>{predictionData.error}</span>
          <button className="cr-alert__retry" onClick={() => setPredictionData({})}>
            {ui.retry} ›
          </button>
        </div>
      )}

      <CropFormSection
        ui={ui}
        city={city}
        setCity={setCity}
        handleAutoFill={handleAutoFill}
        loadingWeather={loadingWeather}
        formData={formData}
        handleChange={handleChange}
        setFormData={setFormData}
        localizedSeasons={localizedSeasons}
        profileForm={profileForm}
        handleProfileChange={handleProfileChange}
        profileLanguageOptions={profileLanguageOptions}
        setProfileForm={setProfileForm}
        handleSaveProfile={handleSaveProfile}
        handleApplyProfile={handleApplyProfile}
        handleClearProfile={handleClearProfile}
        handleSoilImport={handleSoilImport}
        soilScore={soilScore}
        localizedFields={localizedFields}
        handleBlur={handleBlur}
        rangeErrors={rangeErrors}
        touched={touched}
        activeExplainerId={activeExplainerId}
        setActiveExplainerId={setActiveExplainerId}
        progressPct={progressPct}
        isFormValid={isFormValid}
        handleSubmit={handleSubmit}
        hasRangeErrors={hasRangeErrors}
        filledCount={filledCount}
      />
    </>
  );
}

export default MLPanel;
