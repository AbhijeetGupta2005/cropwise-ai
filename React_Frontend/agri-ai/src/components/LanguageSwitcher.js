import React from "react";
import { useLanguage } from "../context/LanguageContext";
import "../styles/LanguageSwitcher.css";

function LanguageSwitcher() {
  const { language, setLanguage, options, t } = useLanguage();

  return (
    <div className="lang-switcher" role="group" aria-label={t("switcherLabel")}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`lang-switcher__btn${language === option.value ? " lang-switcher__btn--active" : ""}`}
          onClick={() => setLanguage(option.value)}
          aria-pressed={language === option.value}
          title={option.label}
        >
          {option.short}
        </button>
      ))}
    </div>
  );
}

export default LanguageSwitcher;
