import React, { useEffect, useRef, useState } from "react";
import { cropData } from "../Data";
import {
  CROP_IDEAL_RANGES,
  FIELDS,
  DISPLAY_CROP_CALENDAR,
  MONTHS,
} from "../../config/cropRecommenderConfig";
import { normalizeLocalizedCopy } from "../../utils/localization";
import { useLanguage } from "../../context/LanguageContext";

import { getAdvisorUi, getCropUi, getLocalizedFieldMeta, getLocalizedSeasons, getZoneLabel } from "../../config/cropCopy";

function renderMessageContent(text) {
  const content = String(text || "");
  const lines = content.split(/\n{2,}/);

  return lines.map((line, lineIndex) => {
    const segments = [];
    const parts = line.split(/(\*\*.*?\*\*)/g).filter(Boolean);

    parts.forEach((part, partIndex) => {
      const key = `${lineIndex}-${partIndex}`;
      if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
        segments.push(<strong key={key}>{part.slice(2, -2)}</strong>);
      } else {
        segments.push(
          <React.Fragment key={key}>
            {part.split("\n").map((chunk, chunkIndex, arr) => (
              <React.Fragment key={`${key}-${chunkIndex}`}>
                {chunk}
                {chunkIndex < arr.length - 1 ? <br /> : null}
              </React.Fragment>
            ))}
          </React.Fragment>
        );
      }
    });

    return (
      <React.Fragment key={`line-${lineIndex}`}>
        {segments}
        {lineIndex < lines.length - 1 ? <><br /><br /></> : null}
      </React.Fragment>
    );
  });
}

// ─── #1 Live soil health score ────────────────────────────────────────────────
function computeSoilHealthScore(formData) {
  const { N, P, K, ph } = formData;
  if (!N && !P && !K && !ph) return null;
  let score = 0, count = 0;
  if (N  !== "") { score += Math.min(100, (parseFloat(N)  / 100) * 100); count++; }
  if (P  !== "") { score += Math.min(100, (parseFloat(P)  / 80)  * 100); count++; }
  if (K  !== "") { score += Math.min(100, (parseFloat(K)  / 120) * 100); count++; }
  if (ph !== "") {
    const v = parseFloat(ph);
    score += (v >= 6 && v <= 7.5) ? 100 : (v >= 5.5 && v <= 8) ? 70 : 30;
    count++;
  }
  return count > 0 ? Math.min(100, Math.round(score / count)) : null;
}

function SoilHealthGauge({ score }) {
  const { language } = useLanguage();
  const ui = normalizeLocalizedCopy(getCropUi(language));
  if (score === null) return null;
  const color = score >= 75 ? '#c8f55a' : score >= 50 ? '#f5c842' : '#f55a5a';
  const label = score >= 75 ? ui.soilGood : score >= 50 ? ui.soilFair : ui.soilPoor;
  const tip   = score >= 75 ? ui.soilGreatTip : score >= 50 ? ui.soilNeedsAttentionTip : ui.soilNeedsImprovementTip;
  const r = 22, circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div className="cr-soil-gauge" title={tip}>
      <svg width="56" height="56" viewBox="0 0 56 56" aria-label={`${ui.soilGaugeLabel}: ${score}%`}>
        <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
        <circle cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          transform="rotate(-90 28 28)"
          style={{ transition: 'stroke-dasharray 0.6s cubic-bezier(0.16,1,0.3,1), stroke 0.4s' }}
        />
        <text x="28" y="32" textAnchor="middle" fontSize="11" fontWeight="600" fill={color} fontFamily="DM Mono,monospace">{score}</text>
      </svg>
      <div className="cr-soil-gauge__text">
        <span className="cr-soil-gauge__label" style={{ color }}>{ui.soilGaugeLabel}</span>
        <span className="cr-soil-gauge__sub">{label}</span>
      </div>
    </div>
  );
}

// ─── #2 Crop calendar strip ───────────────────────────────────────────────────
function CropCalendar({ cropKey }) {
  const { language } = useLanguage();
  const ui = normalizeLocalizedCopy(getCropUi(language));
  const cal = DISPLAY_CROP_CALENDAR[cropKey?.toLowerCase()];
  if (!cal) return null;
  return (
    <div className="cr-calendar">
      <div className="cr-section-label" style={{ marginBottom:'0.6rem' }}>{ui.cropCalendar}</div>
      <div className="cr-calendar__strip">
        {MONTHS.map((m, i) => {
          const isSow     = i >= cal.sow[0]     && i <= cal.sow[1];
          const isHarvest = i >= cal.harvest[0]  && i <= cal.harvest[1];
          const isGrow    = !isSow && !isHarvest && (
            cal.grow[0] <= cal.grow[1]
              ? i >= cal.grow[0] && i <= cal.grow[1]
              : i >= cal.grow[0] || i <= cal.grow[1]
          );
          const cls = isSow ? 'sow' : isHarvest ? 'harvest' : isGrow ? 'grow' : '';
          return (
            <div key={i} className={`cr-calendar__month${cls ? ` cr-calendar__month--${cls}` : ''}`}>
              <span>{m}</span>
            </div>
          );
        })}
      </div>
      <div className="cr-calendar__legend">
        <span className="cr-calendar__legend-item cr-calendar__legend-item--sow">{ui.sow}</span>
        <span className="cr-calendar__legend-item cr-calendar__legend-item--grow">{ui.growing}</span>
        <span className="cr-calendar__legend-item cr-calendar__legend-item--harvest">{ui.harvest}</span>
        <span className="cr-calendar__legend-item cr-calendar__legend-item--window">{cal.label}</span>
      </div>
    </div>
  );
}

// ─── #3 Radar chart ───────────────────────────────────────────────────────────
function RadarChart({ formData, cropKey }) {
  const { language } = useLanguage();
  const ui = normalizeLocalizedCopy(getCropUi(language));
  const ideal = CROP_IDEAL_RANGES[cropKey?.toLowerCase()];
  if (!ideal) return null;
  const axes = [
    { key:'N',           label:'N',    max:140  },
    { key:'P',           label:'P',    max:140  },
    { key:'K',           label:'K',    max:205  },
    { key:'temperature', label:'Temp', max:44   },
    { key:'humidity',    label:'Hum',  max:100  },
    { key:'ph',          label:'pH',   max:14   },
    { key:'rainfall',    label:'Rain', max:300  },
  ];
  const cx=110, cy=110, r=85, n=axes.length;
  const angle  = (i) => (Math.PI * 2 * i / n) - Math.PI / 2;
  const toXY   = (i, val, maxR) => ({ x: cx + maxR * Math.cos(angle(i)) * val, y: cy + maxR * Math.sin(angle(i)) * val });
  const toPath = (pts) => pts.map((p,i)=>`${i===0?'M':'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + ' Z';

  const userPts  = axes.map((a,i) => toXY(i, Math.min(1, (parseFloat(formData[a.key])||0) / a.max), r));
  const idealPts = axes.map((a,i) => toXY(i, Math.min(1, ((ideal[a.key][0]+ideal[a.key][1])/2) / a.max), r));
  const gridLevels = [0.25, 0.5, 0.75, 1];

  return (
    <div className="cr-radar">
      <div className="cr-section-label" style={{ marginBottom:'0.6rem' }}>{ui.yourInputsIdeal}</div>
      <svg viewBox="0 0 220 220" className="cr-radar__svg" aria-label={ui.yourInputsIdeal}>
        {gridLevels.map(lvl => (
          <polygon key={lvl}
            points={axes.map((_,i)=>{ const p=toXY(i,lvl,r); return `${p.x},${p.y}`; }).join(' ')}
            fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1"
          />
        ))}
        {axes.map((_,i)=>{ const p=toXY(i,1,r); return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>; })}
        <path d={toPath(idealPts)} fill="rgba(90,245,200,0.1)"  stroke="#5af5c8" strokeWidth="1.5" strokeDasharray="4 2"/>
        <path d={toPath(userPts)}  fill="rgba(200,245,90,0.15)" stroke="#c8f55a" strokeWidth="2"/>
        {axes.map((a,i)=>{ const p=toXY(i,1.18,r); return <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fontSize="8.5" fill="rgba(255,255,255,0.5)" fontFamily="DM Mono,monospace">{a.label}</text>; })}
      </svg>
      <div className="cr-radar__legend">
        <span className="cr-radar__legend-item" style={{ color:'#c8f55a' }}>— {ui.yourInputs}</span>
        <span className="cr-radar__legend-item" style={{ color:'#5af5c8' }}>· · {ui.idealRange}</span>
      </div>
    </div>
  );
}

// ─── #4 Vote triangle ─────────────────────────────────────────────────────────
function VoteTriangle({ xgbLabel, rfLabel, knnLabel, xgbConf, rfConf, knnConf, winner }) {
  const { language } = useLanguage();
  const ui = normalizeLocalizedCopy(getCropUi(language));
  const total = xgbConf + rfConf + knnConf || 1;
  const W = 200, H = 176;
  const verts = [[W / 2, 18], [22, H - 28], [W - 22, H - 28]];
  const dot = {
    x: verts[0][0] * xgbConf / total + verts[1][0] * rfConf / total + verts[2][0] * knnConf / total,
    y: verts[0][1] * xgbConf / total + verts[1][1] * rfConf / total + verts[2][1] * knnConf / total,
  };
  const labels = [
    { x: verts[0][0], y: verts[0][1] - 16, valY: verts[0][1] - 6, name:'XGB', val:xgbConf, label:xgbLabel, anchor:'middle' },
    { x: verts[1][0] + 4, y: verts[1][1] + 18, valY: verts[1][1] + 30, name:'RF', val:rfConf, label:rfLabel, anchor:'start' },
    { x: verts[2][0] - 4, y: verts[2][1] + 18, valY: verts[2][1] + 30, name:'KNN', val:knnConf, label:knnLabel, anchor:'end' },
  ];
  const allAgree = xgbLabel===rfLabel && rfLabel===knnLabel;
  return (
    <div className="cr-vote-triangle">
      <div className="cr-section-label" style={{ marginBottom:'0.6rem' }}>{ui.modelConsensus}</div>
      <svg viewBox={`0 0 ${W} ${H + 40}`} className="cr-vote-triangle__svg" aria-label={ui.modelConsensus}>
        <polygon points={verts.map(v=>v.join(',')).join(' ')} fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
        {labels.map((l,i)=>(
          <g key={i}>
            <circle cx={verts[i][0]} cy={verts[i][1]} r="4" fill={l.label===winner ? '#c8f55a' : 'rgba(255,255,255,0.2)'}/>
            <text x={l.x} y={l.y} textAnchor={l.anchor} fontSize="7.5" fill="rgba(255,255,255,0.4)" fontFamily="DM Mono,monospace">{l.name}</text>
            <text x={l.x} y={l.valY} textAnchor={l.anchor} fontSize="7" fill="rgba(255,255,255,0.25)" fontFamily="DM Mono,monospace">{l.val.toFixed(0)}%</text>
          </g>
        ))}
        <circle cx={dot.x} cy={dot.y} r="6" fill="#c8f55a" opacity="0.9">
          <animate attributeName="r" values="6;8;6" dur="2s" repeatCount="indefinite"/>
        </circle>
        <text x={W/2} y={H + 26} textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.3)" fontFamily="DM Mono,monospace">
          {allAgree ? ui.allAgree : ui.dotCloser}
        </text>
      </svg>
    </div>
  );
}

// ─── #5 & #6 Slider field with zone track + explainer ────────────────────────
function SliderField({
  id, label, hint, unit, icon, min, max, step, value, onChange, onBlur, error, explainer,
  isExplainerOpen, onToggleExplainer
}) {
  const { language } = useLanguage();
  const fieldRef = useRef(null);
  const pct = value !== "" ? ((parseFloat(value) - min) / (max - min)) * 100 : 0;
  const errorId = `${id}-error`;
  const zone      = pct < 25 ? 'low' : pct > 75 ? 'high' : 'ok';
  const zoneColor = zone === 'ok' ? '#c8f55a' : zone === 'high' ? '#f5c842' : '#f55a5a';

  useEffect(() => {
    if (!isExplainerOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!fieldRef.current?.contains(event.target)) {
        onToggleExplainer(null);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onToggleExplainer(null);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isExplainerOpen, onToggleExplainer]);

  return (
    <div ref={fieldRef} className={`cr-field cr-field--slider${error ? ' cr-field--error' : ''}`}>
      <div className="cr-field__icon" aria-hidden="true">{icon}</div>
      <div className="cr-field__inner">
        <div className="cr-field__top-row">
          <label className="cr-field__label-top" htmlFor={id}>{label}</label>
          <div style={{ display:'flex', alignItems:'center', gap:'0.4rem' }}>
            {value !== "" && (
              <span className="cr-field__zone-pill" style={{ background:`${zoneColor}18`, color:zoneColor, border:`1px solid ${zoneColor}30` }}>
                {getZoneLabel(zone, language)}
              </span>
            )}
            <button
              type="button"
              className="cr-field__info-btn"
              onClick={(event) => {
                event.stopPropagation();
                onToggleExplainer(isExplainerOpen ? null : id);
              }}
              aria-label={`Info about ${label}`}
              aria-expanded={isExplainerOpen}
              aria-controls={`${id}-explainer`}
            >?</button>
          </div>
        </div>
        {isExplainerOpen && <div id={`${id}-explainer`} className="cr-field__explainer" role="tooltip">{explainer}</div>}
        <div className="cr-field__slider-row">
          <input
            type="range"
            id={`${id}-slider`}
            min={min} max={max} step={step}
            value={value !== "" ? value : min}
            onChange={e => onChange(id, e.target.value)}
            onBlur={() => onBlur(id)}
            className="cr-field__slider"
            style={{ '--pct':`${pct}%`, '--zone-color':zoneColor }}
            aria-label={`${label} slider`}
          />
          <input
            type="number"
            id={id}
            name={id}
            value={value}
            onChange={e => onChange(id, e.target.value)}
            min={min} max={max} step={step}
            placeholder="—"
            className="cr-field__number"
            aria-label={`${label} value`}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
          />
          <span className="cr-field__unit">{unit}</span>
        </div>
        {error && <div id={errorId} className="cr-field__error" role="alert">{error}</div>}
      </div>
    </div>
  );
}

// ─── #7 Soil test import ──────────────────────────────────────────────────────
function SoilTestImport({ onImport }) {
  const { language } = useLanguage();
  const ui = normalizeLocalizedCopy(getCropUi(language));
  const [open,   setOpen]   = useState(false);
  const [text,   setText]   = useState('');
  const [parsed, setParsed] = useState(null);

  const parseLabReport = (raw) => {
    const result = {};
    const patterns = {
      N:  [/nitrogen[:\s]+(\d+\.?\d*)/i,  /\bN[:\s]+(\d+\.?\d*)/i],
      P:  [/phospho[a-z]*[:\s]+(\d+\.?\d*)/i, /\bP[:\s]+(\d+\.?\d*)/i],
      K:  [/potassium[:\s]+(\d+\.?\d*)/i, /\bK[:\s]+(\d+\.?\d*)/i],
      ph: [/ph[:\s]+(\d+\.?\d*)/i,        /soil\s+ph[:\s]+(\d+\.?\d*)/i],
    };
    for (const [key, pats] of Object.entries(patterns)) {
      for (const pat of pats) {
        const m = raw.match(pat);
        if (m) { result[key] = m[1]; break; }
      }
    }
    return Object.keys(result).length > 0 ? result : null;
  };

  return (
    <div className="cr-import">
      <button className="cr-import__trigger" onClick={() => setOpen(o=>!o)} aria-expanded={open}>
        <span>📋</span> {ui.pasteLabReport}
      </button>
      {open && (
        <div className="cr-import__panel">
          <textarea
            className="cr-import__textarea"
            placeholder={ui.importPlaceholder}
            value={text}
            onChange={e => { setText(e.target.value); setParsed(null); }}
            rows={5}
            aria-label="Soil test report text"
          />
          <div className="cr-import__actions">
            <button className="cr-import__parse-btn" onClick={() => setParsed(parseLabReport(text) || {})} disabled={!text.trim()}>
              {ui.importDetect}
            </button>
            {parsed !== null && (
              <div className="cr-import__result">
                {Object.keys(parsed).length > 0 ? (
                  <>
                    <span className="cr-import__found">
                      {ui.importFound}: {Object.entries(parsed).map(([k,v]) => `${k.toUpperCase()}=${v}`).join(', ')}
                    </span>
                    <button className="cr-import__apply-btn" onClick={() => { onImport(parsed); setOpen(false); setText(''); setParsed(null); }}>
                      {ui.importApply} →
                    </button>
                  </>
                ) : (
                  <span className="cr-import__notfound">{ui.importNotFound}</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── #9 Share button ──────────────────────────────────────────────────────────
async function shareResult(title, text) {
  if (navigator.share) {
    try { await navigator.share({ title, text }); } catch {}
  } else {
    navigator.clipboard?.writeText(text).then(() => alert('Result copied to clipboard!'));
  }
}

function downloadTextReport(filename, content) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function mapCropToFertilizerType(finalLabel, predictedCropTitle) {
  const key = String(finalLabel || predictedCropTitle || "").toLowerCase();

  if (key.includes("rice") || key.includes("paddy")) return "Paddy";
  if (key.includes("maize")) return "Maize";
  if (key.includes("wheat")) return "Wheat";
  if (key.includes("cotton")) return "Cotton";
  if (key.includes("tobacco")) return "Tobacco";
  if (key.includes("barley")) return "Barley";
  if (
    key.includes("blackgram") ||
    key.includes("chickpea") ||
    key.includes("kidneybeans") ||
    key.includes("lentil") ||
    key.includes("mungbean") ||
    key.includes("mothbean") ||
    key.includes("pigeonpeas")
  ) {
    return "Pulses";
  }

  return "";
}

function getTopCropSuggestions(modelResults) {
  const merged = modelResults.reduce((acc, item) => {
    if (!item.label) return acc;
    if (!acc[item.label]) {
      acc[item.label] = { label: item.label, confidence: item.conf, models: [item.model] };
    } else {
      acc[item.label].confidence = Math.max(acc[item.label].confidence, item.conf);
      acc[item.label].models.push(item.model);
    }
    return acc;
  }, {});

  return Object.values(merged)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);
}

function getCropReasonHighlights(formData, cropKey, language = "english") {
  const ideal = CROP_IDEAL_RANGES[cropKey?.toLowerCase()];
  if (!ideal) return [];
  const fieldMeta = normalizeLocalizedCopy(getLocalizedFieldMeta(language));
  const english = language === "english";
  const hinglish = language === "hinglish";

  const checks = [
    { key: "N", label: fieldMeta.N?.label || "nitrogen", value: parseFloat(formData.N) },
    { key: "P", label: fieldMeta.P?.label || "phosphorous", value: parseFloat(formData.P) },
    { key: "K", label: fieldMeta.K?.label || "potassium", value: parseFloat(formData.K) },
    { key: "temperature", label: fieldMeta.temperature?.label || "temperature", value: parseFloat(formData.temperature) },
    { key: "humidity", label: fieldMeta.humidity?.label || "humidity", value: parseFloat(formData.humidity) },
    { key: "ph", label: fieldMeta.ph?.label || "soil pH", value: parseFloat(formData.ph) },
    { key: "rainfall", label: fieldMeta.rainfall?.label || "rainfall", value: parseFloat(formData.rainfall) },
  ];

  const matched = checks
    .filter((item) => !Number.isNaN(item.value) && ideal[item.key])
    .map((item) => {
      const [min, max] = ideal[item.key];
      const within = item.value >= min && item.value <= max;
      const midpoint = (min + max) / 2;
      const distance = Math.abs(item.value - midpoint);
      return { ...item, within, min, max, distance };
    })
    .sort((a, b) => {
      if (a.within !== b.within) return a.within ? -1 : 1;
      return a.distance - b.distance;
    })
    .slice(0, 3);

  return normalizeLocalizedCopy(matched.map((item) => {
    if (item.within) {
      if (english) return `${item.label} is within the preferred range (${item.min}-${item.max})`;
      if (hinglish) return `${item.label} preferred range (${item.min}-${item.max}) ke andar hai`;
      return `${item.label} पसंदीदा सीमा (${item.min}-${item.max}) के भीतर है`;
    }

    if (english) return `${item.label} is the closest available match for this crop profile`;
    if (hinglish) return `${item.label} is crop profile ke sabse kareeb match karta hai`;
    return `${item.label} इस फसल प्रोफ़ाइल के सबसे करीब मेल खाता है`;
  }));
}

function getSeasonWindowLabel(season, language = "english") {
  const match = normalizeLocalizedCopy(getLocalizedSeasons(language)).find((item) => item.value === season);
  return match ? match.desc : "";
}


function clampToFieldRange(id, rawValue) {
  const field = FIELDS.find((item) => item.id === id);
  if (!field) return rawValue;
  if (rawValue === "") return "";

  const numeric = parseFloat(rawValue);
  if (Number.isNaN(numeric)) return rawValue;

  return String(Math.min(field.max, Math.max(field.min, numeric)));
}

function getSuitabilityMeta(score, language = "english") {
  const ui = normalizeLocalizedCopy(getCropUi(language));
  if (score >= 85) return { label: ui.suitabilityHigh, tone: "high", note: ui.suitabilityHighNote };
  if (score >= 65) return { label: ui.suitabilityMid, tone: "mid", note: ui.suitabilityMidNote };
  return { label: ui.suitabilityLow, tone: "low", note: ui.suitabilityLowNote };
}

function getConfidenceExplanation(score, language = "english") {
  if (language === "hindi") {
    if (score >= 85) return { title: "विश्वास स्तर", detail: "यह सुझाव मजबूत है और मॉडल आउटपुट इस परिणाम का अच्छा समर्थन करते हैं।" };
    if (score >= 65) return { title: "विश्वास स्तर", detail: "यह सुझाव उपयोगी है, लेकिन खेत की वास्तविक स्थिति के साथ मिलान करना बेहतर रहेगा।" };
    return { title: "विश्वास स्तर", detail: "यह कम-विश्वास वाला परिणाम है; लागू करने से पहले अतिरिक्त जांच करना उचित रहेगा।" };
  }

  if (language === "hinglish") {
    if (score >= 85) return { title: "Confidence level", detail: "Yeh result strong hai aur model output is recommendation ko achha support deta hai." };
    if (score >= 65) return { title: "Confidence level", detail: "Yeh recommendation useful lagti hai, lekin field conditions ke saath verify karna better rahega." };
    return { title: "Confidence level", detail: "Yeh low-confidence result hai, isliye final decision se pehle extra verification karni chahiye." };
  }

  if (score >= 85) return { title: "Confidence level", detail: "This is a strong recommendation and the model outputs support the result well." };
  if (score >= 65) return { title: "Confidence level", detail: "This recommendation is usable, but it should still be checked against real field conditions." };
  return { title: "Confidence level", detail: "This is a low-confidence result, so it should be verified before acting on it." };
}

function getConsensusExplanation(agreeingCount, totalModels, language = "english") {
  if (language === "hindi") {
    if (agreeingCount === totalModels) return { title: "मॉडल सहमति", detail: "सभी मॉडल इसी फसल की ओर इशारा कर रहे हैं, इसलिए निर्णय अपेक्षाकृत स्थिर है।" };
    if (agreeingCount >= 2) return { title: "मॉडल सहमति", detail: "अधिकांश मॉडल इस परिणाम से सहमत हैं, इसलिए यह संतुलित सुझाव माना जा सकता है।" };
    return { title: "मॉडल सहमति", detail: "मॉडल अलग-अलग सुझाव दे रहे हैं, इसलिए परिणाम को सावधानी से पढ़ना चाहिए।" };
  }

  if (language === "hinglish") {
    if (agreeingCount === totalModels) return { title: "Model consensus", detail: "Saare models isi crop par agree kar rahe hain, isliye decision ka signal kaafi stable hai." };
    if (agreeingCount >= 2) return { title: "Model consensus", detail: "Most models is result se agree karte hain, so this looks like a balanced recommendation." };
    return { title: "Model consensus", detail: "Models alag-alag outputs de rahe hain, so result ko thoda caution ke saath dekhna chahiye." };
  }

  if (agreeingCount === totalModels) return { title: "Model consensus", detail: "All models point to the same crop, so the decision signal is relatively stable." };
  if (agreeingCount >= 2) return { title: "Model consensus", detail: "Most models agree with this result, so it looks like a balanced recommendation." };
  return { title: "Model consensus", detail: "The models disagree with each other, so the result should be read with extra caution." };
}

function getDecisionEdgeExplanation(finalConf, bestAlt, language = "english") {
  const margin = bestAlt ? Math.max(0, finalConf - bestAlt.conf) : finalConf;

  if (language === "hindi") {
    if (!bestAlt) return { title: "निर्णय बढ़त", detail: "कोई मजबूत वैकल्पिक प्रतिस्पर्धी सामने नहीं आया, इसलिए यही परिणाम सबसे स्पष्ट विकल्प है।" };
    if (margin >= 20) return { title: "निर्णय बढ़त", detail: `मुख्य परिणाम और अगले विकल्प में लगभग ${margin.toFixed(1)}% का अंतर है, इसलिए यह चयन स्पष्ट बढ़त दिखाता है।` };
    if (margin >= 8) return { title: "निर्णय बढ़त", detail: `मुख्य परिणाम की बढ़त लगभग ${margin.toFixed(1)}% है, इसलिए यह बेहतर है लेकिन बहुत दूर नहीं है।` };
    return { title: "निर्णय बढ़त", detail: `मुख्य और वैकल्पिक परिणाम काफी करीब हैं (लगभग ${margin.toFixed(1)}% अंतर), इसलिए स्थानीय जांच उपयोगी रहेगी।` };
  }

  if (language === "hinglish") {
    if (!bestAlt) return { title: "Decision edge", detail: "Koi strong alternative saamne nahi aaya, so this looks like the clearest result." };
    if (margin >= 20) return { title: "Decision edge", detail: `Final result next option se lagbhag ${margin.toFixed(1)}% aage hai, so iski lead kaafi clear hai.` };
    if (margin >= 8) return { title: "Decision edge", detail: `Final result ki lead around ${margin.toFixed(1)}% hai, so yeh better lagta hai but gap bahut huge nahi hai.` };
    return { title: "Decision edge", detail: `Final aur alternative result ka gap sirf ${margin.toFixed(1)}% ke around hai, so local validation helpful rahegi.` };
  }

  if (!bestAlt) return { title: "Decision edge", detail: "No strong competing alternative appeared, so this is the clearest result." };
  if (margin >= 20) return { title: "Decision edge", detail: `The final result leads the next option by about ${margin.toFixed(1)}%, so the selection has a clear edge.` };
  if (margin >= 8) return { title: "Decision edge", detail: `The final result leads by around ${margin.toFixed(1)}%, so it looks better but not overwhelmingly so.` };
  return { title: "Decision edge", detail: `The final and alternative results are close (about ${margin.toFixed(1)}% apart), so local validation would be helpful.` };
}

// ─── #12 Voice input ──────────────────────────────────────────────────────────
function getSpeechRecognition() {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function speechErrorMessage(error, ui, language = 'english') {
  switch (error) {
    case 'not-allowed':
    case 'service-not-allowed':
      return ui.voiceBlocked;
    case 'no-speech':
      return language === 'hindi'
        ? 'मुझे कुछ सुनाई नहीं दिया। फिर से कोशिश करें और जिले का नाम साफ़ बोलें।'
        : language === 'hinglish'
          ? 'Maine kuch nahi suna. Dobara try karo aur district name clearly bolo.'
          : 'I did not hear anything. Try again and speak the district name clearly.';
    case 'audio-capture':
      return language === 'hindi'
        ? 'कोई माइक्रोफ़ोन नहीं मिला। माइक कनेक्शन और ब्राउज़र अनुमति जाँचें।'
        : language === 'hinglish'
          ? 'Koi microphone nahi mila. Mic connection aur browser permission check karo.'
          : 'No microphone was found. Check your mic connection and browser permission.';
    case 'network':
      return ui.voiceUnsupported;
    case 'aborted':
      return ui.voiceStopped;
    default:
      return ui.voiceStartFailed;
  }
}

function VoiceInputButton({ onResult, onStatus, lang = 'en-IN', language = 'english' }) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const recRef = useRef(null);
  const ui = normalizeLocalizedCopy(getAdvisorUi(language));

  useEffect(() => {
    setSupported(Boolean(getSpeechRecognition()));
    return () => {
      try { recRef.current?.abort(); } catch {}
    };
  }, []);

  const updateStatus = (type, message) => {
    if (onStatus) onStatus({ type, message });
  };

  const toggle = async () => {
    const SR = getSpeechRecognition();
    if (!SR) {
      setSupported(false);
      updateStatus('error', ui.voiceUnsupported);
      return;
    }
    if (listening) {
      recRef.current?.stop();
      setListening(false);
      updateStatus('info', ui.voiceStopped);
      return;
    }

    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
      }
    } catch {
      updateStatus('error', ui.voiceBlocked);
      return;
    }

    const rec = new SR();
    rec.lang            = lang;
    rec.interimResults  = false;
    rec.continuous      = false;
    rec.maxAlternatives = 1;
    rec.onstart         = () => {
      setListening(true);
      updateStatus('info', ui.voiceListening);
    };
    rec.onresult        = (e) => {
      const transcript = e.results?.[0]?.[0]?.transcript?.trim();
      if (transcript) {
        onResult(transcript);
        updateStatus('success', ui.voiceHeard(transcript));
      } else {
        updateStatus('error', ui.voiceNoMatch);
      }
      setListening(false);
    };
    rec.onerror         = (e) => {
      setListening(false);
      updateStatus(e.error === 'aborted' ? 'info' : 'error', speechErrorMessage(e.error, ui, language));
    };
    rec.onnomatch       = () => {
      setListening(false);
      updateStatus('error', ui.voiceNoMatch);
    };
    rec.onend           = () => setListening(false);
    recRef.current = rec;
    try {
      rec.start();
    } catch {
      setListening(false);
      updateStatus('error', ui.voiceStartFailed);
    }
  };

  return (
    <button
      type="button"
      className={`cr-voice-btn${listening ? ' cr-voice-btn--active' : ''}${!supported ? ' cr-voice-btn--unsupported' : ''}`}
      onClick={toggle}
      title={!supported ? ui.voiceUnsupported : undefined}
      aria-label={listening ? ui.voiceActiveAria : ui.voiceIdleAria}
    >
      <span className="cr-voice-btn__glyph" aria-hidden="true">{listening ? ui.voiceButtonActive : ui.voiceButtonIdle}</span>
    </button>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────
function ConfidenceBar({ value }) {
  const color = value >= 80 ? '#c8f55a' : value >= 60 ? '#f5c842' : '#f55a5a';
  return (
    <div className="cr-conf-bar">
      <div className="cr-conf-bar__track" role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
        <div className="cr-conf-bar__fill" style={{ width:`${value}%`, background:color }}/>
      </div>
      <span className="cr-conf-bar__label" style={{ color }}>{value.toFixed(1)}%</span>
    </div>
  );
}

function CropDetailPanel({ cropKey, onClose }) {
  const crop = cropData[cropKey];
  if (!crop) return null;
  return (
    <div className="cr-detail-panel">
      <div className="cr-detail-panel__img-wrap">
        <img src={crop.imageUrl} alt={crop.title} className="cr-detail-panel__img"/>
        <div className="cr-detail-panel__img-overlay"/>
      </div>
      <div className="cr-detail-panel__body">
        <div className="cr-detail-panel__top">
          <span className="cr-detail-panel__title">{crop.title}</span>
          <button className="cr-detail-panel__close" onClick={onClose} aria-label="Close">x</button>
        </div>
        <p className="cr-detail-panel__desc">{crop.description}</p>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="cr-skeleton" role="status" aria-label="Loading…">
      <div className="cr-skeleton__img"/>
      <div className="cr-skeleton__line cr-skeleton__line--wide"/>
      <div className="cr-skeleton__line cr-skeleton__line--mid"/>
      <div className="cr-skeleton__line"/>
      <div className="cr-skeleton__line cr-skeleton__line--short"/>
      <div className="cr-skeleton__block"/>
    </div>
  );
}

export {
  clampToFieldRange,
  computeSoilHealthScore,
  ConfidenceBar,
  CropCalendar,
  CropDetailPanel,
  downloadTextReport,
  getConfidenceExplanation,
  getConsensusExplanation,
  getCropReasonHighlights,
  getDecisionEdgeExplanation,
  getSeasonWindowLabel,
  getSpeechRecognition,
  getSuitabilityMeta,
  getTopCropSuggestions,
  LoadingSkeleton,
  mapCropToFertilizerType,
  RadarChart,
  renderMessageContent,
  shareResult,
  SliderField,
  SoilHealthGauge,
  SoilTestImport,
  speechErrorMessage,
  VoiceInputButton,
  VoteTriangle,
};



