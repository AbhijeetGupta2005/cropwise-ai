import React, { useState } from "react";
import { useHistory } from "react-router-dom";
import { clearPredictionHistory, getPredictionHistory } from "../utils/predictionHistory";
import { useLanguage } from "../context/LanguageContext";
import "../styles/PredictionHistory.css";

function formatTimestamp(value) {
  if (!value) return "Unknown time";

  try {
    return new Date(value).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return value;
  }
}

function SummaryRow({ label, value }) {
  return (
    <div className="ph-card__summary-row">
      <span className="ph-card__summary-label">{label}</span>
      <span className="ph-card__summary-value">{value || "--"}</span>
    </div>
  );
}

function countByResult(entries, type) {
  return entries
    .filter((item) => item.type === type)
    .reduce((acc, item) => {
      const key = item.result || "Unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
}

function getTopPairs(countMap, limit = 3) {
  return Object.entries(countMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

function HistoryCard({ item }) {
  const isCrop = item.type === "crop";
  const inputs = item.inputs || {};

  return (
    <article className="ph-card">
      <div className="ph-card__top">
        <div>
          <div className={`ph-card__pill${isCrop ? "" : " ph-card__pill--fertilizer"}`}>
            {isCrop ? "Crop Prediction" : "Fertilizer Prediction"}
          </div>
          <h2 className="ph-card__title">{item.result || "Prediction saved"}</h2>
        </div>
        <div className="ph-card__time">{formatTimestamp(item.createdAt)}</div>
      </div>

      {item.confidence !== undefined && item.confidence !== null && (
        <div className="ph-card__confidence">
          <span>Confidence</span>
          <strong>{Number(item.confidence).toFixed(2)}%</strong>
        </div>
      )}

      <div className="ph-card__summary">
        {isCrop ? (
          <>
            <SummaryRow label="N" value={inputs.N} />
            <SummaryRow label="P" value={inputs.P} />
            <SummaryRow label="K" value={inputs.K} />
            <SummaryRow label="Temp" value={inputs.temperature ? `${inputs.temperature} C` : ""} />
            <SummaryRow label="Humidity" value={inputs.humidity ? `${inputs.humidity}%` : ""} />
            <SummaryRow label="pH" value={inputs.ph} />
            <SummaryRow label="Rainfall" value={inputs.rainfall ? `${inputs.rainfall} mm` : ""} />
          </>
        ) : (
          <>
            <SummaryRow label="Crop Type" value={inputs.crop_type} />
            <SummaryRow label="Soil Type" value={inputs.soil_type} />
            <SummaryRow label="Nitrogen" value={inputs.Nitrogen} />
            <SummaryRow label="Phosphorous" value={inputs.Phosphorous} />
            <SummaryRow label="Potassium" value={inputs.Potassium} />
            <SummaryRow label="Moisture" value={inputs.Moisture ? `${inputs.Moisture}%` : ""} />
          </>
        )}
      </div>
    </article>
  );
}

function PredictionHistory() {
  const history = useHistory();
  const { t } = useLanguage();
  const [filter, setFilter] = useState("all");
  const [entries, setEntries] = useState(() => getPredictionHistory());

  const filtered = entries.filter((item) => filter === "all" || item.type === filter);
  const cropEntries = entries.filter((item) => item.type === "crop");
  const fertilizerEntries = entries.filter((item) => item.type === "fertilizer");
  const avgConfidence = entries.length
    ? entries.reduce((sum, item) => sum + (Number(item.confidence) || 0), 0) / entries.length
    : 0;
  const topCrops = getTopPairs(countByResult(entries, "crop"));
  const topFertilizers = getTopPairs(countByResult(entries, "fertilizer"));
  const latestEntry = entries[0];

  const handleClear = () => {
    clearPredictionHistory();
    setEntries([]);
  };

  return (
    <div className="ph-page">
      <div className="ph-shell">
        <div className="ph-header">
          <div>
            <div className="ph-eyebrow">{t('historyEyebrow')}</div>
            <h1 className="ph-title">{t('historyTitle')}</h1>
            <p className="ph-subtitle">{t('historySubtitle')}</p>
          </div>

          <div className="ph-header__actions">
            <button type="button" className="ph-btn ph-btn--ghost" onClick={() => history.push("/")}>
              {t('historyHome')}
            </button>
            <button type="button" className="ph-btn ph-btn--ghost" onClick={() => history.goBack()}>
              {t('historyBack')}
            </button>
          </div>
        </div>

        <div className="ph-toolbar">
          <div className="ph-filter">
            {[
              { id: "all", label: t('historyAll') },
              { id: "crop", label: t('historyCrop') },
              { id: "fertilizer", label: t('historyFertilizer') },
            ].map((option) => (
              <button
                key={option.id}
                type="button"
                className={`ph-filter__chip${filter === option.id ? " ph-filter__chip--active" : ""}`}
                onClick={() => setFilter(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="ph-btn ph-btn--danger"
            onClick={handleClear}
            disabled={entries.length === 0}
          >
            {t('historyClear')}
          </button>
        </div>

        <div className="ph-stats">
          <div className="ph-stat-card">
            <span className="ph-stat-card__label">Total Saved</span>
            <strong className="ph-stat-card__value">{entries.length}</strong>
          </div>
          <div className="ph-stat-card">
            <span className="ph-stat-card__label">Crop Predictions</span>
            <strong className="ph-stat-card__value">{cropEntries.length}</strong>
          </div>
          <div className="ph-stat-card">
            <span className="ph-stat-card__label">Fertilizer Predictions</span>
            <strong className="ph-stat-card__value">{fertilizerEntries.length}</strong>
          </div>
          <div className="ph-stat-card">
            <span className="ph-stat-card__label">Average Confidence</span>
            <strong className="ph-stat-card__value">{avgConfidence.toFixed(1)}%</strong>
          </div>
        </div>

        <div className="ph-insights">
          <div className="ph-insight-card">
            <div className="ph-insight-card__title">Most Predicted Crops</div>
            {topCrops.length === 0 ? (
              <div className="ph-insight-card__empty">No crop predictions yet</div>
            ) : (
              topCrops.map(([label, count]) => (
                <div key={label} className="ph-insight-row">
                  <span>{label}</span>
                  <strong>{count}</strong>
                </div>
              ))
            )}
          </div>

          <div className="ph-insight-card">
            <div className="ph-insight-card__title">Most Recommended Fertilizers</div>
            {topFertilizers.length === 0 ? (
              <div className="ph-insight-card__empty">No fertilizer predictions yet</div>
            ) : (
              topFertilizers.map(([label, count]) => (
                <div key={label} className="ph-insight-row">
                  <span>{label}</span>
                  <strong>{count}</strong>
                </div>
              ))
            )}
          </div>

          <div className="ph-insight-card">
            <div className="ph-insight-card__title">Latest Activity</div>
            {latestEntry ? (
              <>
                <div className="ph-insight-row">
                  <span>Type</span>
                  <strong>{latestEntry.type === "crop" ? "Crop" : "Fertilizer"}</strong>
                </div>
                <div className="ph-insight-row">
                  <span>Result</span>
                  <strong>{latestEntry.result}</strong>
                </div>
                <div className="ph-insight-row">
                  <span>Saved</span>
                  <strong>{formatTimestamp(latestEntry.createdAt)}</strong>
                </div>
              </>
            ) : (
              <div className="ph-insight-card__empty">No activity yet</div>
            )}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="ph-empty">
            <div className="ph-empty__title">No saved predictions yet</div>
            <p className="ph-empty__copy">Run a crop or fertilizer prediction and it will show up here automatically.</p>
          </div>
        ) : (
          <div className="ph-grid">
            {filtered.map((item) => (
              <HistoryCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default PredictionHistory;
