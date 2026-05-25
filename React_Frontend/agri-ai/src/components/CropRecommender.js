import React, { useState } from "react";
import { useHistory } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import MLPanel from "./crop/CropMlPanel";
import AIAdvisorPanel from "./crop/CropAiAdvisorPanel";
import "../styles/croprecommenderoutput.css";

function CropRecommender() {
  const history = useHistory();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("ml");

  return (
    <div className="cr-page">
      <div className="cr-card" role="main">
        <div className="cr-card__header">
          <div className="cr-card__icon-wrap" aria-hidden="true">CR</div>
          <div>
            <h1 className="cr-card__title">{t("cropTitle")}</h1>
            <p className="cr-card__sub">
              <span className="cr-status-dot" aria-hidden="true" />
              {t("cropSubtitle")}
            </p>
          </div>
          <button
            type="button"
            className="cr-btn cr-btn--ghost cr-header-btn"
            onClick={() => history.push("/history")}
          >
            {t("cropHistory")}
          </button>
        </div>

        <div className="cr-tabs" role="tablist" aria-label="Recommendation engine">
          {[
            { id: "ml", icon: "ML", name: t("cropTabMl"), desc: t("cropTabMlDesc") },
            { id: "ai", icon: "AI", name: t("cropTabAi"), desc: t("cropTabAiDesc") },
          ].map((tab) => (
            <button
              key={tab.id}
              className={`cr-tab${activeTab === tab.id ? " cr-tab--active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`cr-panel-${tab.id}`}
            >
              <span className="cr-tab__icon" aria-hidden="true">{tab.icon}</span>
              <span>
                <span className="cr-tab__name">{tab.name}</span>
                <span className="cr-tab__desc">{tab.desc}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="cr-tab-panel" id={`cr-panel-${activeTab}`} role="tabpanel">
          {activeTab === "ml" ? <MLPanel /> : <AIAdvisorPanel />}
        </div>
      </div>
    </div>
  );
}

export default CropRecommender;
