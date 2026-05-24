import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { getAICropRecommendation } from "../api/aiRecommender";
import { predictCrop } from "../api/predictions";
import { getWeatherData } from "../api/weather";
import { cropData } from "./Data";
import {
  ADVISOR_LANGUAGES,
  CROP_IDEAL_RANGES,
  CROP_IMAGE_MAP,
  DISPLAY_CROP_CALENDAR,
  DISPLAY_FIELDS,
  DISPLAY_SEASONS,
  FIELDS,
  INITIAL_FORM,
  MONTHS,
  weightedVote,
} from "../config/cropRecommenderConfig";
import { clearFarmerProfile, getFarmerProfile, saveFarmerProfile } from "../utils/farmerProfile";
import { normalizeLocalizedCopy } from "../utils/localization";
import { savePredictionHistory } from "../utils/predictionHistory";
import { useLanguage } from "../context/LanguageContext";
import "../styles/croprecommenderoutput.css";

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

// â”€â”€â”€ #1 Live soil health score â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ #2 Crop calendar strip â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ #3 Radar chart â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
        <span className="cr-radar__legend-item" style={{ color:'#c8f55a' }}>â€” {ui.yourInputs}</span>
        <span className="cr-radar__legend-item" style={{ color:'#5af5c8' }}>Â· Â· {ui.idealRange}</span>
      </div>
    </div>
  );
}

// â”€â”€â”€ #4 Vote triangle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ #5 & #6 Slider field with zone track + explainer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
            placeholder="â€”"
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

// â”€â”€â”€ #7 Soil test import â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
        <span>ðŸ“‹</span> {ui.pasteLabReport}
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
                      {ui.importApply} â†’
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

// â”€â”€â”€ #9 Share button â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
      return `${item.label} à¤ªà¤¸à¤‚à¤¦à¥€à¤¦à¤¾ à¤¸à¥€à¤®à¤¾ (${item.min}-${item.max}) à¤•à¥‡ à¤­à¥€à¤¤à¤° à¤¹à¥ˆ`;
    }

    if (english) return `${item.label} is the closest available match for this crop profile`;
    if (hinglish) return `${item.label} is crop profile ke sabse kareeb match karta hai`;
    return `${item.label} à¤‡à¤¸ à¤«à¤¸à¤² à¤ªà¥à¤°à¥‹à¤«à¤¼à¤¾à¤‡à¤² à¤•à¥‡ à¤¸à¤¬à¤¸à¥‡ à¤•à¤°à¥€à¤¬ à¤®à¥‡à¤² à¤–à¤¾à¤¤à¤¾ à¤¹à¥ˆ`;
  }));
}

function getSeasonWindowLabel(season, language = "english") {
  const match = normalizeLocalizedCopy(getLocalizedSeasons(language)).find((item) => item.value === season);
  return match ? match.desc : "";
}

const PROFILE_LANGUAGES = ["English", "Hindi", "Hinglish"];

function mapProfileLanguageToAdvisor(language) {
  const key = String(language || "").toLowerCase();
  if (key === "hindi") return "hindi";
  if (key === "hinglish") return "hinglish";
  return "english";
}

function getAdvisorUi(language) {
  if (language === "hindi") {
    return {
      introTitle: "AI à¤«à¤¸à¤² à¤¸à¤²à¤¾à¤¹à¤•à¤¾à¤°",
      introSub: "Gemini à¤†à¤§à¤¾à¤°à¤¿à¤¤ | à¤†à¤ªà¤•à¥‡ à¤•à¥à¤·à¥‡à¤¤à¥à¤° à¤”à¤° à¤®à¥Œà¤¸à¤® à¤•à¥‡ à¤…à¤¨à¥à¤¸à¤¾à¤° à¤¸à¥à¤à¤¾à¤µ",
      responseLanguage: "à¤œà¤µà¤¾à¤¬ à¤•à¥€ à¤­à¤¾à¤·à¤¾",
      responseLanguageAria: "à¤¸à¤²à¤¾à¤¹à¤•à¤¾à¤° à¤•à¥€ à¤œà¤µà¤¾à¤¬ à¤­à¤¾à¤·à¤¾",
      locationLabel: "à¤†à¤ªà¤•à¤¾ à¤•à¥à¤·à¥‡à¤¤à¥à¤° / à¤œà¤¿à¤²à¤¾",
      locationPlaceholder: "à¤œà¥ˆà¤¸à¥‡ à¤ªà¤‚à¤œà¤¾à¤¬, à¤µà¤¿à¤¦à¤°à¥à¤­, à¤•à¤¾à¤µà¥‡à¤°à¥€ à¤¡à¥‡à¤²à¥à¤Ÿà¤¾...",
      locationAria: "à¤†à¤ªà¤•à¤¾ à¤•à¥à¤·à¥‡à¤¤à¥à¤° à¤¯à¤¾ à¤œà¤¿à¤²à¤¾",
      locationHint: "à¤œà¤¿à¤¤à¤¨à¤¾ à¤¸à¤‚à¤­à¤µ à¤¹à¥‹ à¤‰à¤¤à¤¨à¤¾ à¤¸à¥à¤ªà¤·à¥à¤Ÿ à¤²à¤¿à¤–à¥‡à¤‚à¥¤ à¤°à¤¾à¤œà¥à¤¯ à¤¸à¥‡ à¤¬à¥‡à¤¹à¤¤à¤° à¤œà¤¿à¤²à¤¾-à¤¸à¥à¤¤à¤° à¤•à¤¾ à¤¨à¤¾à¤® à¤•à¤¾à¤® à¤•à¤°à¤¤à¤¾ à¤¹à¥ˆà¥¤",
      seasonLabel: "à¤«à¤¸à¤² à¤•à¤¾ à¤®à¥Œà¤¸à¤®",
      submitLabel: "AI à¤¸à¥à¤à¤¾à¤µ à¤ªà¥à¤°à¤¾à¤ªà¥à¤¤ à¤•à¤°à¥‡à¤‚",
      invalidHint: "à¤†à¤—à¥‡ à¤¬à¤¢à¤¼à¤¨à¥‡ à¤•à¥‡ à¤²à¤¿à¤ à¤•à¥à¤·à¥‡à¤¤à¥à¤° à¤²à¤¿à¤–à¥‡à¤‚ à¤”à¤° à¤®à¥Œà¤¸à¤® à¤šà¥à¤¨à¥‡à¤‚",
      loadingText: (area, season) => <>AI à¤¸à¤²à¤¾à¤¹à¤•à¤¾à¤° <strong>{area}</strong> | <strong>{season}</strong> à¤•à¥‡ à¤²à¤¿à¤ à¤¸à¥à¤à¤¾à¤µ à¤¤à¥ˆà¤¯à¤¾à¤° à¤•à¤° à¤°à¤¹à¤¾ à¤¹à¥ˆ...</>,
      loadingSub: "à¤•à¥à¤·à¥‡à¤¤à¥à¤°à¥€à¤¯ à¤ªà¥ˆà¤Ÿà¤°à¥à¤¨, à¤®à¥Œà¤¸à¤® à¤”à¤° à¤•à¥ƒà¤·à¤¿ à¤‰à¤ªà¤¯à¥à¤•à¥à¤¤à¤¤à¤¾ à¤•à¤¾ à¤µà¤¿à¤¶à¥à¤²à¥‡à¤·à¤£ à¤•à¤¿à¤¯à¤¾ à¤œà¤¾ à¤°à¤¹à¤¾ à¤¹à¥ˆ",
      resultsLabel: (season) => `AI à¤¸à¤²à¤¾à¤¹à¤•à¤¾à¤° | ${season} à¤®à¥Œà¤¸à¤®`,
      resultsTitle: (area) => <> <em>{area}</em> à¤•à¥‡ à¤²à¤¿à¤ à¤‰à¤ªà¤¯à¥à¤•à¥à¤¤ à¤«à¤¸à¤²à¥‡à¤‚ </>,
      backToForm: "à¤«à¤¼à¥‰à¤°à¥à¤® à¤ªà¤° à¤µà¤¾à¤ªà¤¸ à¤œà¤¾à¤à¤",
      liveMode: "à¤²à¤¾à¤‡à¤µ AI à¤¸à¤²à¤¾à¤¹",
      offlineMode: "à¤¸à¥à¤¥à¤¾à¤¨à¥€à¤¯ à¤¸à¤²à¤¾à¤¹ à¤¬à¥ˆà¤•à¤…à¤ª",
      languageMeta: "à¤¹à¤¿à¤¨à¥à¤¦à¥€",
      seasonMeta: (season) => `${season} à¤®à¥Œà¤¸à¤®`,
      optionsMeta: (count) => `${count} à¤«à¤¸à¤² à¤µà¤¿à¤•à¤²à¥à¤ª`,
      fallbackDisclaimer: "à¤…à¤­à¥€ à¤²à¤¾à¤‡à¤µ Gemini à¤‰à¤ªà¤²à¤¬à¥à¤§ à¤¨à¤¹à¥€à¤‚ à¤¹à¥ˆ, à¤‡à¤¸à¤²à¤¿à¤ à¤¯à¥‡ à¤¸à¥à¤à¤¾à¤µ à¤¸à¥à¤¥à¤¾à¤¨à¥€à¤¯ à¤¸à¤²à¤¾à¤¹ à¤¬à¥ˆà¤•à¤…à¤ª à¤¸à¥‡ à¤†à¤ à¤¹à¥ˆà¤‚à¥¤ à¤…à¤‚à¤¤à¤¿à¤® à¤¨à¤¿à¤°à¥à¤£à¤¯ à¤¸à¥‡ à¤ªà¤¹à¤²à¥‡ à¤ªà¤¾à¤¸ à¤•à¥‡ à¤•à¥ƒà¤·à¤¿ à¤µà¤¿à¤¶à¥‡à¤·à¤œà¥à¤ž à¤¸à¥‡ à¤ªà¥à¤·à¥à¤Ÿà¤¿ à¤•à¤°à¥‡à¤‚à¥¤",
      liveDisclaimer: "AI à¤¦à¥à¤µà¤¾à¤°à¤¾ à¤¤à¥ˆà¤¯à¤¾à¤° à¤¸à¥à¤à¤¾à¤µà¥¤ à¤…à¤‚à¤¤à¤¿à¤® à¤¨à¤¿à¤°à¥à¤£à¤¯ à¤¸à¥‡ à¤ªà¤¹à¤²à¥‡ à¤¸à¥à¤¥à¤¾à¤¨à¥€à¤¯ à¤•à¥ƒà¤·à¤¿ à¤µà¤¿à¤¶à¥‡à¤·à¤œà¥à¤ž à¤¸à¥‡ à¤ªà¥à¤·à¥à¤Ÿà¤¿ à¤•à¤°à¥‡à¤‚à¥¤",
      retryLiveAi: "à¤²à¤¾à¤‡à¤µ AI à¤«à¤¿à¤° à¤†à¤œà¤¼à¤®à¤¾à¤à¤",
      followUpTitle: "à¤†à¤—à¥‡ à¤¸à¤µà¤¾à¤² à¤ªà¥‚à¤›à¥‡à¤‚",
      followUpPlaceholder: "à¤‡à¤¸ à¤«à¤¸à¤² à¤•à¥‡ à¤¬à¤¾à¤°à¥‡ à¤®à¥‡à¤‚ à¤•à¥à¤› à¤­à¥€ à¤ªà¥‚à¤›à¥‡à¤‚...",
      followUpSend: "à¤­à¥‡à¤œà¥‡à¤‚",
      followUpThinking: "à¤¸à¥‹à¤š à¤°à¤¹à¤¾ à¤¹à¥ˆ...",
      followUpError: "à¤…à¤­à¥€ à¤œà¤µà¤¾à¤¬ à¤¨à¤¹à¥€à¤‚ à¤®à¤¿à¤² à¤ªà¤¾à¤¯à¤¾à¥¤ à¤•à¥ƒà¤ªà¤¯à¤¾ à¤«à¤¿à¤° à¤¸à¥‡ à¤•à¥‹à¤¶à¤¿à¤¶ à¤•à¤°à¥‡à¤‚à¥¤",
      voiceUnsupported: "à¤‡à¤¸ à¤¬à¥à¤°à¤¾à¤‰à¤œà¤¼à¤° à¤®à¥‡à¤‚ à¤µà¥‰à¤‡à¤¸ à¤‡à¤¨à¤ªà¥à¤Ÿ à¤‰à¤ªà¤²à¤¬à¥à¤§ à¤¨à¤¹à¥€à¤‚ à¤¹à¥ˆà¥¤ Chrome à¤¯à¤¾ Edge à¤†à¤œà¤¼à¤®à¤¾à¤à¤, à¤¯à¤¾ à¤œà¤—à¤¹ à¤•à¤¾ à¤¨à¤¾à¤® à¤Ÿà¤¾à¤‡à¤ª à¤•à¤°à¥‡à¤‚à¥¤",
      voiceStopped: "à¤µà¥‰à¤‡à¤¸ à¤‡à¤¨à¤ªà¥à¤Ÿ à¤°à¥‹à¤• à¤¦à¤¿à¤¯à¤¾ à¤—à¤¯à¤¾à¥¤",
      voiceBlocked: "à¤®à¤¾à¤‡à¤•à¥à¤°à¥‹à¤«à¤¼à¥‹à¤¨ à¤…à¤¨à¥à¤®à¤¤à¤¿ à¤¬à¤‚à¤¦ à¤¹à¥ˆà¥¤ localhost à¤•à¥‡ à¤²à¤¿à¤ à¤®à¤¾à¤‡à¤• à¤…à¤¨à¥à¤®à¤¤à¤¿ à¤¦à¥‡à¤‚, à¤«à¤¿à¤° à¤¦à¥‹à¤¬à¤¾à¤°à¤¾ à¤•à¥‹à¤¶à¤¿à¤¶ à¤•à¤°à¥‡à¤‚à¥¤",
      voiceListening: "à¤¸à¥à¤¨ à¤°à¤¹à¤¾ à¤¹à¥‚à¤... à¤…à¤ªà¤¨à¤¾ à¤œà¤¿à¤²à¤¾ à¤¯à¤¾ à¤°à¤¾à¤œà¥à¤¯ à¤•à¤¾ à¤¨à¤¾à¤® à¤¬à¥‹à¤²à¥‡à¤‚à¥¤",
      voiceHeard: (transcript) => `"${transcript}" à¤¸à¥à¤¨à¤¾ à¤—à¤¯à¤¾à¥¤ à¤†à¤—à¥‡ à¤¬à¤¢à¤¼à¤¨à¥‡ à¤•à¥‡ à¤²à¤¿à¤ à¤®à¥Œà¤¸à¤® à¤šà¥à¤¨à¥‡à¤‚à¥¤`,
      voiceNoMatch: "à¤¬à¥‹à¤²à¥€ à¤—à¤ˆ à¤¬à¤¾à¤¤ à¤¸à¤®à¤ à¤®à¥‡à¤‚ à¤¨à¤¹à¥€à¤‚ à¤†à¤ˆà¥¤ à¤«à¤¿à¤° à¤¸à¥‡ à¤•à¥‹à¤¶à¤¿à¤¶ à¤•à¤°à¥‡à¤‚ à¤¯à¤¾ à¤œà¤—à¤¹ à¤Ÿà¤¾à¤‡à¤ª à¤•à¤°à¥‡à¤‚à¥¤",
      voiceStartFailed: "à¤µà¥‰à¤‡à¤¸ à¤‡à¤¨à¤ªà¥à¤Ÿ à¤¶à¥à¤°à¥‚ à¤¨à¤¹à¥€à¤‚ à¤¹à¥‹ à¤¸à¤•à¤¾à¥¤ à¤•à¥ƒà¤ªà¤¯à¤¾ à¤œà¤—à¤¹ à¤•à¤¾ à¤¨à¤¾à¤® à¤Ÿà¤¾à¤‡à¤ª à¤•à¤°à¥‡à¤‚à¥¤",
      voiceButtonIdle: "à¤¬à¥‹à¤²à¥‡à¤‚",
      voiceButtonActive: "à¤°à¥‹à¤•à¥‡à¤‚",
      voiceIdleAria: "à¤œà¤¿à¤²à¥‡ à¤•à¤¾ à¤¨à¤¾à¤® à¤¬à¥‹à¤²à¥‡à¤‚",
      voiceActiveAria: "à¤¸à¥à¤¨à¤¨à¤¾ à¤¬à¤‚à¤¦ à¤•à¤°à¥‡à¤‚",
      cardWater: "à¤ªà¤¾à¤¨à¥€",
      cardReason: "à¤¯à¤¹ à¤•à¥à¤¯à¥‹à¤‚ à¤‰à¤ªà¤¯à¥à¤•à¥à¤¤ à¤¹à¥ˆ",
      cardSoil: "à¤‰à¤ªà¤¯à¥à¤•à¥à¤¤ à¤®à¤¿à¤Ÿà¥à¤Ÿà¥€",
      genericAiError: "AI à¤¸à¥à¤à¤¾à¤µ à¤¨à¤¹à¥€à¤‚ à¤®à¤¿à¤² à¤¸à¤•à¥‡à¥¤ à¤•à¥ƒà¤ªà¤¯à¤¾ à¤«à¤¿à¤° à¤¸à¥‡ à¤•à¥‹à¤¶à¤¿à¤¶ à¤•à¤°à¥‡à¤‚à¥¤",
    };
  }

  if (language === "hinglish") {
    return {
      introTitle: "AI Crop Advisor",
      introSub: "Gemini powered | aapke region aur season ke hisaab se suggestions",
      responseLanguage: "Response Language",
      responseLanguageAria: "Advisor response language",
      locationLabel: "Aapka Region / District",
      locationPlaceholder: "jaise Punjab, Vidarbha, Cauvery Delta...",
      locationAria: "Aapka region ya district",
      locationHint: "Jitna specific input hoga utna better. State se zyada district-level input kaam karta hai.",
      seasonLabel: "Cropping Season",
      submitLabel: "AI Recommendation Lo",
      invalidHint: "Aage badhne ke liye location likho aur season chuno",
      loadingText: (area, season) => <>AI advisor <strong>{area}</strong> | <strong>{season}</strong> season ke liye analyse kar raha hai...</>,
      loadingSub: "Regional patterns, climate aur agronomic fit analyse ho raha hai",
      resultsLabel: (season) => `AI Advisor | ${season} Season`,
      resultsTitle: (area) => <> <em>{area}</em> ke liye top crops </>,
      backToForm: "Form par wapas",
      liveMode: "Live AI advisory",
      offlineMode: "Local advisory backup",
      languageMeta: "Hinglish",
      seasonMeta: (season) => `${season} season`,
      optionsMeta: (count) => `${count} crop options`,
      fallbackDisclaimer: "Abhi live Gemini available nahi hai, isliye ye recommendations local advisory backup se aaye hain. Final decision se pehle nazdeeki agriculture expert se verify kar lo.",
      liveDisclaimer: "AI-generated recommendations. Final decision se pehle local agricultural expert se verify kar lo.",
      retryLiveAi: "Live AI dobara try karo",
      followUpTitle: "Aage sawaal poochho",
      followUpPlaceholder: "Is crop ke baare mein kuch bhi poochho...",
      followUpSend: "Send",
      followUpThinking: "Soch raha hai...",
      followUpError: "Abhi answer nahi mil paya. Please dobara try karo.",
      voiceUnsupported: "Is browser mein voice input supported nahi hai. Chrome ya Edge try karo, ya location type karo.",
      voiceStopped: "Voice input rok diya gaya.",
      voiceBlocked: "Microphone permission block hai. localhost ke liye mic allow karo, phir dobara try karo.",
      voiceListening: "Sun raha hoon... apna district ya state naam bolo.",
      voiceHeard: (transcript) => `"${transcript}" suna. Continue karne ke liye season chuno.`,
      voiceNoMatch: "Bola gaya input samajh nahi aaya. Dobara try karo ya location type karo.",
      voiceStartFailed: "Voice input start nahi ho saka. Location type kar do.",
      voiceButtonIdle: "Speak",
      voiceButtonActive: "Stop",
      voiceIdleAria: "District name bolo",
      voiceActiveAria: "Listening band karo",
      cardWater: "Pani",
      cardReason: "Yeh kyun fit hai",
      cardSoil: "Best mitti",
      genericAiError: "AI recommendation nahi mil payi. Please dobara try karo.",
    };
  }

  return {
    introTitle: "AI Crop Advisor",
    introSub: "Powered by Gemini | Contextual recommendations based on your region and season",
    responseLanguage: "Response Language",
    responseLanguageAria: "Advisor response language",
    locationLabel: "Your Location / District",
    locationPlaceholder: "e.g. Punjab, Vidarbha, Cauvery Delta...",
    locationAria: "Your location or district",
    locationHint: "Be specific. District-level input usually works better than a state name.",
    seasonLabel: "Cropping Season",
    submitLabel: "Get AI Recommendation",
    invalidHint: "Enter a location and pick a season to continue",
    loadingText: (area, season) => <>Consulting AI advisor for <strong>{area}</strong> | <strong>{season}</strong> season...</>,
    loadingSub: "Analysing regional patterns, climate data and agronomic fit",
    resultsLabel: (season) => `AI Advisor | ${season} Season`,
    resultsTitle: (area) => <>Top crops for <em>{area}</em></>,
    backToForm: "Back to form",
    liveMode: "Live AI advisory",
    offlineMode: "Local advisory backup",
    languageMeta: "English",
    seasonMeta: (season) => `${season} season`,
    optionsMeta: (count) => `${count} crop options`,
    fallbackDisclaimer: "Live Gemini advice is temporarily unavailable, so these recommendations are coming from the local advisory backup. Validate with nearby agricultural experts.",
    liveDisclaimer: "AI-generated recommendations. Always validate with local agricultural experts.",
    retryLiveAi: "Try Live AI Again",
    followUpTitle: "Ask a follow-up",
    followUpPlaceholder: "Ask anything about this crop...",
    followUpSend: "Go",
    followUpThinking: "Thinking...",
    followUpError: "Sorry, I could not get an answer right now. Please try again.",
    voiceUnsupported: "Voice input is not supported in this browser. Try Chrome or Edge, or type the location.",
    voiceStopped: "Voice input stopped.",
    voiceBlocked: "Microphone permission was blocked. Allow microphone access for localhost, then try again.",
    voiceListening: "Listening... speak your district or state name.",
    voiceHeard: (transcript) => `Heard "${transcript}". Choose a season to continue.`,
    voiceNoMatch: "I could not match that speech. Try again or type the location.",
    voiceStartFailed: "Voice input could not start. Please type the location instead.",
    voiceButtonIdle: "Mic",
    voiceButtonActive: "Stop",
    voiceIdleAria: "Speak district name",
    voiceActiveAria: "Stop listening",
    cardWater: "Water",
    cardReason: "Why this fits",
    cardSoil: "Best soil",
    genericAiError: "Failed to get AI recommendation. Please try again.",
  };
}

function localizeAdvisorScale(value, language, kind) {
  const normalized = String(value || "").toLowerCase();
  if (language === "hindi") {
    if (kind === "confidence") {
      if (normalized === "high") return "à¤‰à¤šà¥à¤š";
      if (normalized === "medium") return "à¤®à¤§à¥à¤¯à¤®";
      if (normalized === "low") return "à¤•à¤®";
    }
    if (kind === "fit") {
      if (normalized === "perfect") return "à¤¬à¥‡à¤¹à¤¤à¤°à¥€à¤¨";
      if (normalized === "good") return "à¤…à¤šà¥à¤›à¤¾";
      if (normalized === "poor") return "à¤•à¤®à¤œà¤¼à¥‹à¤°";
    }
  }
  if (language === "hinglish") {
    if (kind === "confidence") {
      if (normalized === "high") return "High";
      if (normalized === "medium") return "Medium";
      if (normalized === "low") return "Low";
    }
    if (kind === "fit") {
      if (normalized === "perfect") return "Best";
      if (normalized === "good") return "Good";
      if (normalized === "poor") return "Weak";
    }
  }
  return value;
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
    if (score >= 85) return { title: "à¤µà¤¿à¤¶à¥à¤µà¤¾à¤¸ à¤¸à¥à¤¤à¤°", detail: "à¤¯à¤¹ à¤¸à¥à¤à¤¾à¤µ à¤®à¤œà¤¬à¥‚à¤¤ à¤¹à¥ˆ à¤”à¤° à¤®à¥‰à¤¡à¤² à¤†à¤‰à¤Ÿà¤ªà¥à¤Ÿ à¤‡à¤¸ à¤ªà¤°à¤¿à¤£à¤¾à¤® à¤•à¤¾ à¤…à¤šà¥à¤›à¤¾ à¤¸à¤®à¤°à¥à¤¥à¤¨ à¤•à¤°à¤¤à¥‡ à¤¹à¥ˆà¤‚à¥¤" };
    if (score >= 65) return { title: "à¤µà¤¿à¤¶à¥à¤µà¤¾à¤¸ à¤¸à¥à¤¤à¤°", detail: "à¤¯à¤¹ à¤¸à¥à¤à¤¾à¤µ à¤‰à¤ªà¤¯à¥‹à¤—à¥€ à¤¹à¥ˆ, à¤²à¥‡à¤•à¤¿à¤¨ à¤–à¥‡à¤¤ à¤•à¥€ à¤µà¤¾à¤¸à¥à¤¤à¤µà¤¿à¤• à¤¸à¥à¤¥à¤¿à¤¤à¤¿ à¤•à¥‡ à¤¸à¤¾à¤¥ à¤®à¤¿à¤²à¤¾à¤¨ à¤•à¤°à¤¨à¤¾ à¤¬à¥‡à¤¹à¤¤à¤° à¤°à¤¹à¥‡à¤—à¤¾à¥¤" };
    return { title: "à¤µà¤¿à¤¶à¥à¤µà¤¾à¤¸ à¤¸à¥à¤¤à¤°", detail: "à¤¯à¤¹ à¤•à¤®-à¤µà¤¿à¤¶à¥à¤µà¤¾à¤¸ à¤µà¤¾à¤²à¤¾ à¤ªà¤°à¤¿à¤£à¤¾à¤® à¤¹à¥ˆ; à¤²à¤¾à¤—à¥‚ à¤•à¤°à¤¨à¥‡ à¤¸à¥‡ à¤ªà¤¹à¤²à¥‡ à¤…à¤¤à¤¿à¤°à¤¿à¤•à¥à¤¤ à¤œà¤¾à¤‚à¤š à¤•à¤°à¤¨à¤¾ à¤‰à¤šà¤¿à¤¤ à¤°à¤¹à¥‡à¤—à¤¾à¥¤" };
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
    if (agreeingCount === totalModels) return { title: "à¤®à¥‰à¤¡à¤² à¤¸à¤¹à¤®à¤¤à¤¿", detail: "à¤¸à¤­à¥€ à¤®à¥‰à¤¡à¤² à¤‡à¤¸à¥€ à¤«à¤¸à¤² à¤•à¥€ à¤“à¤° à¤‡à¤¶à¤¾à¤°à¤¾ à¤•à¤° à¤°à¤¹à¥‡ à¤¹à¥ˆà¤‚, à¤‡à¤¸à¤²à¤¿à¤ à¤¨à¤¿à¤°à¥à¤£à¤¯ à¤…à¤ªà¥‡à¤•à¥à¤·à¤¾à¤•à¥ƒà¤¤ à¤¸à¥à¤¥à¤¿à¤° à¤¹à¥ˆà¥¤" };
    if (agreeingCount >= 2) return { title: "à¤®à¥‰à¤¡à¤² à¤¸à¤¹à¤®à¤¤à¤¿", detail: "à¤…à¤§à¤¿à¤•à¤¾à¤‚à¤¶ à¤®à¥‰à¤¡à¤² à¤‡à¤¸ à¤ªà¤°à¤¿à¤£à¤¾à¤® à¤¸à¥‡ à¤¸à¤¹à¤®à¤¤ à¤¹à¥ˆà¤‚, à¤‡à¤¸à¤²à¤¿à¤ à¤¯à¤¹ à¤¸à¤‚à¤¤à¥à¤²à¤¿à¤¤ à¤¸à¥à¤à¤¾à¤µ à¤®à¤¾à¤¨à¤¾ à¤œà¤¾ à¤¸à¤•à¤¤à¤¾ à¤¹à¥ˆà¥¤" };
    return { title: "à¤®à¥‰à¤¡à¤² à¤¸à¤¹à¤®à¤¤à¤¿", detail: "à¤®à¥‰à¤¡à¤² à¤…à¤²à¤—-à¤…à¤²à¤— à¤¸à¥à¤à¤¾à¤µ à¤¦à¥‡ à¤°à¤¹à¥‡ à¤¹à¥ˆà¤‚, à¤‡à¤¸à¤²à¤¿à¤ à¤ªà¤°à¤¿à¤£à¤¾à¤® à¤•à¥‹ à¤¸à¤¾à¤µà¤§à¤¾à¤¨à¥€ à¤¸à¥‡ à¤ªà¤¢à¤¼à¤¨à¤¾ à¤šà¤¾à¤¹à¤¿à¤à¥¤" };
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
    if (!bestAlt) return { title: "à¤¨à¤¿à¤°à¥à¤£à¤¯ à¤¬à¤¢à¤¼à¤¤", detail: "à¤•à¥‹à¤ˆ à¤®à¤œà¤¬à¥‚à¤¤ à¤µà¥ˆà¤•à¤²à¥à¤ªà¤¿à¤• à¤ªà¥à¤°à¤¤à¤¿à¤¸à¥à¤ªà¤°à¥à¤§à¥€ à¤¸à¤¾à¤®à¤¨à¥‡ à¤¨à¤¹à¥€à¤‚ à¤†à¤¯à¤¾, à¤‡à¤¸à¤²à¤¿à¤ à¤¯à¤¹à¥€ à¤ªà¤°à¤¿à¤£à¤¾à¤® à¤¸à¤¬à¤¸à¥‡ à¤¸à¥à¤ªà¤·à¥à¤Ÿ à¤µà¤¿à¤•à¤²à¥à¤ª à¤¹à¥ˆà¥¤" };
    if (margin >= 20) return { title: "à¤¨à¤¿à¤°à¥à¤£à¤¯ à¤¬à¤¢à¤¼à¤¤", detail: `à¤®à¥à¤–à¥à¤¯ à¤ªà¤°à¤¿à¤£à¤¾à¤® à¤”à¤° à¤…à¤—à¤²à¥‡ à¤µà¤¿à¤•à¤²à¥à¤ª à¤®à¥‡à¤‚ à¤²à¤—à¤­à¤— ${margin.toFixed(1)}% à¤•à¤¾ à¤…à¤‚à¤¤à¤° à¤¹à¥ˆ, à¤‡à¤¸à¤²à¤¿à¤ à¤¯à¤¹ à¤šà¤¯à¤¨ à¤¸à¥à¤ªà¤·à¥à¤Ÿ à¤¬à¤¢à¤¼à¤¤ à¤¦à¤¿à¤–à¤¾à¤¤à¤¾ à¤¹à¥ˆà¥¤` };
    if (margin >= 8) return { title: "à¤¨à¤¿à¤°à¥à¤£à¤¯ à¤¬à¤¢à¤¼à¤¤", detail: `à¤®à¥à¤–à¥à¤¯ à¤ªà¤°à¤¿à¤£à¤¾à¤® à¤•à¥€ à¤¬à¤¢à¤¼à¤¤ à¤²à¤—à¤­à¤— ${margin.toFixed(1)}% à¤¹à¥ˆ, à¤‡à¤¸à¤²à¤¿à¤ à¤¯à¤¹ à¤¬à¥‡à¤¹à¤¤à¤° à¤¹à¥ˆ à¤²à¥‡à¤•à¤¿à¤¨ à¤¬à¤¹à¥à¤¤ à¤¦à¥‚à¤° à¤¨à¤¹à¥€à¤‚ à¤¹à¥ˆà¥¤` };
    return { title: "à¤¨à¤¿à¤°à¥à¤£à¤¯ à¤¬à¤¢à¤¼à¤¤", detail: `à¤®à¥à¤–à¥à¤¯ à¤”à¤° à¤µà¥ˆà¤•à¤²à¥à¤ªà¤¿à¤• à¤ªà¤°à¤¿à¤£à¤¾à¤® à¤•à¤¾à¤«à¥€ à¤•à¤°à¥€à¤¬ à¤¹à¥ˆà¤‚ (à¤²à¤—à¤­à¤— ${margin.toFixed(1)}% à¤…à¤‚à¤¤à¤°), à¤‡à¤¸à¤²à¤¿à¤ à¤¸à¥à¤¥à¤¾à¤¨à¥€à¤¯ à¤œà¤¾à¤‚à¤š à¤‰à¤ªà¤¯à¥‹à¤—à¥€ à¤°à¤¹à¥‡à¤—à¥€à¥¤` };
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

function getLocalizedSeasons(language = "english") {
  if (language === "hindi") {
    return [
      { value:"Kharif", label:"à¤–à¤°à¥€à¤«", desc:"à¤œà¥‚à¤¨ - à¤…à¤•à¥à¤¤à¥‚à¤¬à¤° Â· à¤®à¤¾à¤¨à¤¸à¥‚à¤¨", icon:"ðŸŒ§" },
      { value:"Rabi",   label:"à¤°à¤¬à¥€",   desc:"à¤¨à¤µà¤‚à¤¬à¤° - à¤…à¤ªà¥à¤°à¥ˆà¤² Â· à¤¸à¤°à¥à¤¦à¥€", icon:"â„"  },
      { value:"Zaid",   label:"à¤œà¤¼à¤¾à¤¯à¤¦", desc:"à¤®à¤¾à¤°à¥à¤š - à¤œà¥‚à¤¨ Â· à¤—à¤°à¥à¤®à¥€", icon:"â˜€"  },
    ];
  }

  if (language === "hinglish") {
    return [
      { value:"Kharif", label:"Kharif", desc:"Jun - Oct Â· Monsoon", icon:"ðŸŒ§" },
      { value:"Rabi",   label:"Rabi",   desc:"Nov - Apr Â· Winter", icon:"â„"  },
      { value:"Zaid",   label:"Zaid",   desc:"Mar - Jun Â· Summer", icon:"â˜€"  },
    ];
  }

  return DISPLAY_SEASONS;
}

function getCropUi(language = "english") {
  if (language === "hindi") {
    return {
      retry: "à¤«à¤¿à¤° à¤•à¥‹à¤¶à¤¿à¤¶ à¤•à¤°à¥‡à¤‚",
      autoFillWeather: "à¤®à¥Œà¤¸à¤® à¤¸à¥‡ à¤‘à¤Ÿà¥‹-à¤«à¤¿à¤²",
      autoFillPlaceholder: "à¤¶à¤¹à¤° à¤²à¤¿à¤–à¥‡à¤‚ (à¤œà¥ˆà¤¸à¥‡ à¤¦à¤¿à¤²à¥à¤²à¥€, à¤®à¥à¤‚à¤¬à¤ˆ...)",
      autoFillLoading: "à¤²à¤¾à¤¯à¤¾ à¤œà¤¾ à¤°à¤¹à¤¾ à¤¹à¥ˆ...",
      autoFillAction: "à¤‘à¤Ÿà¥‹-à¤«à¤¿à¤²",
      optionalContext: "à¤…à¤¤à¤¿à¤°à¤¿à¤•à¥à¤¤ à¤¸à¤‚à¤¦à¤°à¥à¤­",
      regionLabel: "à¤•à¥à¤·à¥‡à¤¤à¥à¤° à¤¯à¤¾ à¤°à¤¾à¤œà¥à¤¯",
      regionHint: "à¤¸à¥à¤¥à¤¾à¤¨à¥€à¤¯ à¤¸à¤‚à¤¦à¤°à¥à¤­ à¤µà¥ˆà¤•à¤²à¥à¤ªà¤¿à¤• à¤¹à¥ˆ",
      farmerProfile: "à¤•à¤¿à¤¸à¤¾à¤¨ à¤ªà¥à¤°à¥‹à¤«à¤¼à¤¾à¤‡à¤²",
      farmerName: "à¤•à¤¿à¤¸à¤¾à¤¨ à¤•à¤¾ à¤¨à¤¾à¤®",
      farmName: "à¤–à¥‡à¤¤ à¤•à¤¾ à¤¨à¤¾à¤®",
      defaultRegion: "à¤¡à¤¿à¤«à¤¼à¥‰à¤²à¥à¤Ÿ à¤•à¥à¤·à¥‡à¤¤à¥à¤°",
      preferredLanguage: "à¤ªà¤¸à¤‚à¤¦à¥€à¤¦à¤¾ à¤­à¤¾à¤·à¤¾",
      saveProfile: "à¤ªà¥à¤°à¥‹à¤«à¤¼à¤¾à¤‡à¤² à¤¸à¤¹à¥‡à¤œà¥‡à¤‚",
      applyProfile: "à¤«à¤¼à¥‰à¤°à¥à¤® à¤®à¥‡à¤‚ à¤­à¤°à¥‡à¤‚",
      clearProfile: "à¤¸à¤¾à¤«à¤¼ à¤•à¤°à¥‡à¤‚",
      soilClimate: "à¤®à¤¿à¤Ÿà¥à¤Ÿà¥€ à¤”à¤° à¤œà¤²à¤µà¤¾à¤¯à¥ à¤®à¤¾à¤¨à¤•",
      analysePredict: "à¤µà¤¿à¤¶à¥à¤²à¥‡à¤·à¤£ à¤•à¤°à¥‡à¤‚ à¤”à¤° à¤¸à¥à¤à¤¾à¤µ à¤ªà¤¾à¤à¤",
      readyToPredict: "à¤¸à¥à¤à¤¾à¤µ à¤•à¥‡ à¤²à¤¿à¤ à¤¤à¥ˆà¤¯à¤¾à¤°",
      reviewValues: "à¤†à¤—à¥‡ à¤¬à¤¢à¤¼à¤¨à¥‡ à¤¸à¥‡ à¤ªà¤¹à¤²à¥‡ à¤¹à¤¾à¤‡à¤²à¤¾à¤‡à¤Ÿ à¤•à¤¿à¤ à¤—à¤ à¤®à¤¾à¤¨ à¤œà¤¾à¤à¤šà¥‡à¤‚",
      fieldsRemaining: (count) => `${count} à¤«à¤¼à¥€à¤²à¥à¤¡ à¤¬à¤¾à¤•à¥€`,
      requestTimedOut: "à¤°à¤¿à¤•à¥à¤µà¥‡à¤¸à¥à¤Ÿ à¤®à¥‡à¤‚ à¤¸à¤®à¤¯ à¤²à¤— à¤—à¤¯à¤¾à¥¤ à¤•à¥ƒà¤ªà¤¯à¤¾ à¤«à¤¿à¤° à¤¸à¥‡ à¤•à¥‹à¤¶à¤¿à¤¶ à¤•à¤°à¥‡à¤‚à¥¤",
      unableToReach: "à¤¸à¤°à¥à¤µà¤° à¤¸à¥‡ à¤œà¥à¤¡à¤¼ à¤¨à¤¹à¥€à¤‚ à¤ªà¤¾à¤¯à¤¾à¥¤ à¤•à¥ƒà¤ªà¤¯à¤¾ à¤«à¤¿à¤° à¤¸à¥‡ à¤•à¥‹à¤¶à¤¿à¤¶ à¤•à¤°à¥‡à¤‚à¥¤",
      mlRecommendedCrop: "ML à¤¦à¥à¤µà¤¾à¤°à¤¾ à¤¸à¥à¤à¤¾à¤ˆ à¤—à¤ˆ à¤«à¤¸à¤²",
      confidence: "à¤µà¤¿à¤¶à¥à¤µà¤¾à¤¸",
      share: "à¤¶à¥‡à¤¯à¤°",
      supportedBy: "à¤¸à¤®à¤°à¥à¤¥à¤¿à¤¤ à¤®à¥‰à¤¡à¤²",
      lowConfidence: "à¤•à¤® à¤µà¤¿à¤¶à¥à¤µà¤¾à¤¸ - à¤®à¥‰à¤¡à¤² à¤¸à¤¹à¤®à¤¤ à¤¨à¤¹à¥€à¤‚ à¤¹à¥ˆà¤‚à¥¤ à¤•à¥ƒà¤ªà¤¯à¤¾ à¤®à¥ˆà¤¨à¥à¤¯à¥à¤…à¤²à¥€ à¤œà¤¾à¤à¤šà¥‡à¤‚à¥¤",
      alternative: "à¤µà¤¿à¤•à¤²à¥à¤ª",
      topSuggestions: "à¤¶à¥€à¤°à¥à¤· à¤¸à¥à¤à¤¾à¤µ",
      whyThisCrop: "à¤¯à¤¹ à¤«à¤¸à¤² à¤•à¥à¤¯à¥‹à¤‚",
      regionSeasonContext: "à¤•à¥à¤·à¥‡à¤¤à¥à¤° à¤”à¤° à¤®à¥Œà¤¸à¤® à¤¸à¤‚à¤¦à¤°à¥à¤­",
      region: "à¤•à¥à¤·à¥‡à¤¤à¥à¤°",
      season: "à¤®à¥Œà¤¸à¤®",
      cropCalendar: "à¤«à¤¸à¤² à¤•à¥ˆà¤²à¥‡à¤‚à¤¡à¤°",
      modelBreakdown: "à¤®à¥‰à¤¡à¤² à¤µà¤¿à¤µà¤°à¤£",
      winner: "à¤µà¤¿à¤œà¥‡à¤¤à¤¾",
      downloadResult: "à¤°à¤¿à¤œà¤¼à¤²à¥à¤Ÿ à¤¡à¤¾à¤‰à¤¨à¤²à¥‹à¤¡ à¤•à¤°à¥‡à¤‚",
      goToFertilizer: "à¤‰à¤°à¥à¤µà¤°à¤• à¤¸à¥à¤à¤¾à¤µ à¤ªà¤° à¤œà¤¾à¤à¤",
      backToPrediction: "à¤¸à¥à¤à¤¾à¤µ à¤ªà¤° à¤µà¤¾à¤ªà¤¸ à¤œà¤¾à¤à¤",
      soilGaugeLabel: "à¤®à¤¿à¤Ÿà¥à¤Ÿà¥€ à¤•à¥€ à¤¸à¥‡à¤¹à¤¤",
      supportedByPrefix: "à¤¸à¤®à¤°à¥à¤¥à¤¨ à¤®à¤¿à¤²à¤¾",
      yourInputsIdeal: "à¤†à¤ªà¤•à¥€ à¤®à¤¿à¤Ÿà¥à¤Ÿà¥€ à¤¬à¤¨à¤¾à¤® à¤†à¤¦à¤°à¥à¤¶ à¤®à¤¾à¤¨",
      modelConsensus: "à¤®à¥‰à¤¡à¤² à¤¸à¤¹à¤®à¤¤à¤¿",
      allAgree: "à¤¸à¤­à¥€ à¤®à¥‰à¤¡à¤² à¤¸à¤¹à¤®à¤¤ à¤¹à¥ˆà¤‚",
      dotCloser: "à¤¬à¤¿à¤‚à¤¦à¥ à¤¸à¤¹à¤®à¤¤ à¤®à¥‰à¤¡à¤² à¤•à¥€ à¤“à¤° à¤¹à¥ˆ",
      sow: "à¤¬à¥à¤µà¤¾à¤ˆ",
      growing: "à¤¬à¤¢à¤¼à¤µà¤¾à¤°",
      harvest: "à¤•à¤Ÿà¤¾à¤ˆ",
      yourInputs: "à¤†à¤ªà¤•à¥‡ à¤‡à¤¨à¤ªà¥à¤Ÿ",
      idealRange: "à¤†à¤¦à¤°à¥à¤¶ à¤¸à¥€à¤®à¤¾",
      soilGood: "à¤…à¤šà¥à¤›à¤¾",
      soilFair: "à¤¸à¤¾à¤®à¤¾à¤¨à¥à¤¯",
      soilPoor: "à¤•à¤®à¤œà¤¼à¥‹à¤°",
      soilGreatTip: "à¤®à¤¿à¤Ÿà¥à¤Ÿà¥€ à¤•à¤¾ à¤¸à¤‚à¤¤à¥à¤²à¤¨ à¤…à¤šà¥à¤›à¤¾ à¤¹à¥ˆ",
      soilNeedsAttentionTip: "à¤•à¥à¤› à¤ªà¥‹à¤·à¤• à¤¤à¤¤à¥à¤µà¥‹à¤‚ à¤ªà¤° à¤§à¥à¤¯à¤¾à¤¨ à¤¦à¥‡à¤¨à¥‡ à¤•à¥€ à¤œà¤¼à¤°à¥‚à¤°à¤¤ à¤¹à¥ˆ",
      soilNeedsImprovementTip: "à¤®à¤¿à¤Ÿà¥à¤Ÿà¥€ à¤®à¥‡à¤‚ à¤¸à¥à¤§à¤¾à¤° à¤•à¥€ à¤œà¤¼à¤°à¥‚à¤°à¤¤ à¤¹à¥ˆ",
      suitabilityHigh: "à¤¬à¤¹à¥à¤¤ à¤‰à¤ªà¤¯à¥à¤•à¥à¤¤",
      suitabilityMid: "à¤®à¤§à¥à¤¯à¤® à¤°à¥‚à¤ª à¤¸à¥‡ à¤‰à¤ªà¤¯à¥à¤•à¥à¤¤",
      suitabilityLow: "à¤¸à¤¾à¤µà¤§à¤¾à¤¨à¥€ à¤¬à¤°à¤¤à¥‡à¤‚",
      suitabilityHighNote: "à¤¯à¤¹ à¤¸à¥à¤à¤¾à¤µ à¤†à¤ªà¤•à¥€ à¤®à¥Œà¤œà¥‚à¤¦à¤¾ à¤ªà¤°à¤¿à¤¸à¥à¤¥à¤¿à¤¤à¤¿à¤¯à¥‹à¤‚ à¤¸à¥‡ à¤…à¤šà¥à¤›à¥€ à¤¤à¤°à¤¹ à¤®à¥‡à¤² à¤–à¤¾à¤¤à¤¾ à¤¹à¥ˆà¥¤",
      suitabilityMidNote: "à¤¸à¥à¤à¤¾à¤µ à¤ à¥€à¤• à¤¹à¥ˆ, à¤²à¥‡à¤•à¤¿à¤¨ à¤•à¥à¤› à¤¸à¥à¤¥à¤¿à¤¤à¤¿à¤¯à¥‹à¤‚ à¤ªà¤° à¤¨à¤œà¤¼à¤° à¤°à¤–à¤¨à¤¾ à¤¬à¥‡à¤¹à¤¤à¤° à¤°à¤¹à¥‡à¤—à¤¾à¥¤",
      suitabilityLowNote: "à¤‡à¤¸ à¤¨à¤¤à¥€à¤œà¥‡ à¤•à¥‹ à¤¸à¤¾à¤µà¤§à¤¾à¤¨à¥€ à¤¸à¥‡ à¤²à¥‡à¤‚ à¤”à¤° à¤–à¥‡à¤¤ à¤•à¥€ à¤¸à¥à¤¥à¤¿à¤¤à¤¿ à¤œà¤¾à¤à¤šà¤•à¤° à¤¹à¥€ à¤†à¤—à¥‡ à¤¬à¤¢à¤¼à¥‡à¤‚à¥¤",
      required: "à¤œà¤¼à¤°à¥‚à¤°à¥€",
      enterCity: "à¤•à¥ƒà¤ªà¤¯à¤¾ à¤¶à¤¹à¤° à¤²à¤¿à¤–à¥‡à¤‚",
      importPlaceholder: "à¤…à¤ªà¤¨à¥€ à¤®à¤¿à¤Ÿà¥à¤Ÿà¥€ à¤•à¥€ à¤²à¥ˆà¤¬ à¤°à¤¿à¤ªà¥‹à¤°à¥à¤Ÿ à¤¯à¤¹à¤¾à¤ à¤ªà¥‡à¤¸à¥à¤Ÿ à¤•à¤°à¥‡à¤‚...\nà¤‰à¤¦à¤¾à¤¹à¤°à¤£:\nNitrogen: 90\nPhosphorous: 42\nPotassium: 43\npH: 6.5",
      importDetect: "à¤®à¤¾à¤¨ à¤ªà¤¹à¤šà¤¾à¤¨à¥‡à¤‚",
      importFound: "à¤®à¤¿à¤²à¥‡ à¤¹à¥à¤ à¤®à¤¾à¤¨",
      importApply: "à¤«à¤¼à¥‰à¤°à¥à¤® à¤®à¥‡à¤‚ à¤­à¤°à¥‡à¤‚",
      importNotFound: "à¤®à¤¾à¤¨ à¤ªà¤¹à¤šà¤¾à¤¨ à¤¨à¤¹à¥€à¤‚ à¤ªà¤¾à¤à¥¤ à¤•à¥‹à¤ˆ à¤¦à¥‚à¤¸à¤°à¤¾ à¤«à¤¼à¥‰à¤°à¥à¤®à¥‡à¤Ÿ à¤†à¤œà¤¼à¤®à¤¾à¤à¤à¥¤",
      noDescription: "à¤µà¤¿à¤µà¤°à¤£ à¤‰à¤ªà¤²à¤¬à¥à¤§ à¤¨à¤¹à¥€à¤‚ à¤¹à¥ˆà¥¤",
      pasteLabReport: "à¤²à¥ˆà¤¬ à¤°à¤¿à¤ªà¥‹à¤°à¥à¤Ÿ à¤ªà¥‡à¤¸à¥à¤Ÿ à¤•à¤°à¥‡à¤‚",
      loadError: "à¤¶à¤¹à¤° à¤¸à¥‡ à¤®à¥Œà¤¸à¤® à¤¡à¥‡à¤Ÿà¤¾ à¤¨à¤¹à¥€à¤‚ à¤®à¤¿à¤²à¤¾à¥¤",
      weatherFetchFailed: "à¤®à¥Œà¤¸à¤® à¤¡à¥‡à¤Ÿà¤¾ à¤¨à¤¹à¥€à¤‚ à¤®à¤¿à¤² à¤ªà¤¾à¤¯à¤¾à¥¤",
    };
  }

  if (language === "hinglish") {
    return {
      retry: "Retry",
      autoFillWeather: "Weather se auto-fill",
      autoFillPlaceholder: "City likho (jaise Delhi, Mumbai...)",
      autoFillLoading: "Fetch ho raha hai...",
      autoFillAction: "Auto-fill",
      optionalContext: "Optional context",
      regionLabel: "Region ya State",
      regionHint: "Local context optional hai",
      farmerProfile: "Farmer Profile",
      farmerName: "Farmer Name",
      farmName: "Farm Name",
      defaultRegion: "Default Region",
      preferredLanguage: "Preferred Language",
      saveProfile: "Profile save karo",
      applyProfile: "Form me bharo",
      clearProfile: "Clear karo",
      soilClimate: "Soil aur climate parameters",
      analysePredict: "Analyse aur predict karo",
      readyToPredict: "Predict karne ke liye ready",
      reviewValues: "Aage badhne se pehle highlighted values check karo",
      fieldsRemaining: (count) => `${count} field remaining`,
      requestTimedOut: "Request timeout ho gaya. Please dobara try karo.",
      unableToReach: "Server tak pahunch nahi hui. Please dobara try karo.",
      mlRecommendedCrop: "ML recommended crop",
      confidence: "confidence",
      share: "Share",
      supportedBy: "Supported by",
      lowConfidence: "Low confidence - models agree nahi kar rahe. Manual check karo.",
      alternative: "Alternative",
      topSuggestions: "Top Suggestions",
      whyThisCrop: "Yeh crop kyun",
      regionSeasonContext: "Region aur season context",
      region: "Region",
      season: "Season",
      cropCalendar: "Crop Calendar",
      modelBreakdown: "Model Breakdown",
      winner: "Winner",
      downloadResult: "Result download karo",
      goToFertilizer: "Fertilizer prediction par jao",
      backToPrediction: "Prediction par wapas",
      soilGaugeLabel: "Soil Health",
      supportedByPrefix: "Supported by",
      yourInputsIdeal: "Aapke inputs vs ideal",
      modelConsensus: "Model Consensus",
      allAgree: "Sabhi models agree karte hain",
      dotCloser: "Dot agreeing model ki taraf hai",
      sow: "Bowaai",
      growing: "Growing",
      harvest: "Harvest",
      yourInputs: "Aapke inputs",
      idealRange: "Ideal range",
      soilGood: "Good",
      soilFair: "Fair",
      soilPoor: "Poor",
      soilGreatTip: "Soil balance achha hai",
      soilNeedsAttentionTip: "Kuch nutrients par dhyan dena hoga",
      soilNeedsImprovementTip: "Soil ko improvement chahiye",
      suitabilityHigh: "Highly Suitable",
      suitabilityMid: "Moderately Suitable",
      suitabilityLow: "Use Caution",
      suitabilityHighNote: "Yeh recommendation current conditions se achhi tarah match karti hai.",
      suitabilityMidNote: "Recommendation theek hai, lekin kuch conditions ko monitor karna hoga.",
      suitabilityLowNote: "Is result ko dhyan se use karo aur field conditions verify karo.",
      required: "Required",
      enterCity: "Please city likho",
      importPlaceholder: "Apni soil lab report yahan paste karo...\nExample:\nNitrogen: 90\nPhosphorous: 42\nPotassium: 43\npH: 6.5",
      importDetect: "Values detect karo",
      importFound: "Found values",
      importApply: "Form me bharo",
      importNotFound: "Values detect nahi ho paye. Dusra format try karo.",
      noDescription: "Description available nahi hai.",
      pasteLabReport: "Lab report paste karo",
      loadError: "City se weather data nahi mil paya.",
      weatherFetchFailed: "Weather data fetch nahi ho paya.",
    };
  }

  return {
    retry: "Retry",
    autoFillWeather: "Auto-fill from Weather",
    autoFillPlaceholder: "Enter city (e.g. Delhi, Mumbai...)",
    autoFillLoading: "Fetching...",
    autoFillAction: "Auto-fill",
    optionalContext: "Optional Context",
    regionLabel: "Region or State",
    regionHint: "Optional local context",
    farmerProfile: "Farmer Profile",
    farmerName: "Farmer Name",
    farmName: "Farm Name",
    defaultRegion: "Default Region",
    preferredLanguage: "Preferred Language",
    saveProfile: "Save Profile",
    applyProfile: "Apply To Form",
    clearProfile: "Clear Profile",
    soilClimate: "Soil & Climate Parameters",
    analysePredict: "Analyse & Predict",
    readyToPredict: "Ready to predict",
    reviewValues: "Review the highlighted values to continue",
    fieldsRemaining: (count) => `${count} field${count !== 1 ? 's' : ''} remaining`,
    requestTimedOut: "Request timed out. Please try again.",
    unableToReach: "Unable to reach the server. Please try again.",
    mlRecommendedCrop: "ML Recommended Crop",
    confidence: "confidence",
    share: "Share",
    supportedBy: "Supported by",
    lowConfidence: "Low confidence - models disagree. Consider verifying manually.",
    alternative: "Alternative",
    topSuggestions: "Top Suggestions",
    whyThisCrop: "Why This Crop",
    regionSeasonContext: "Region And Season Context",
    region: "Region",
    season: "Season",
    cropCalendar: "Crop Calendar",
    modelBreakdown: "Model Breakdown",
    winner: "Winner",
    downloadResult: "Download Result",
    goToFertilizer: "Go to Fertilizer Prediction",
    backToPrediction: "Back to Prediction",
    soilGaugeLabel: "Soil Health",
    supportedByPrefix: "Supported by",
    yourInputsIdeal: "Your Soil vs Ideal",
    modelConsensus: "Model Consensus",
    allAgree: "All models agree",
    dotCloser: "Dot closer to agreeing model(s)",
    sow: "Sow",
    growing: "Growing",
    harvest: "Harvest",
    yourInputs: "Your inputs",
    idealRange: "Ideal range",
    soilGood: "Good",
    soilFair: "Fair",
    soilPoor: "Poor",
    soilGreatTip: "Great soil balance",
    soilNeedsAttentionTip: "Some nutrients need attention",
    soilNeedsImprovementTip: "Soil needs improvement",
    suitabilityHigh: "Highly Suitable",
    suitabilityMid: "Moderately Suitable",
    suitabilityLow: "Use Caution",
    suitabilityHighNote: "Conditions are strongly aligned with this recommendation.",
    suitabilityMidNote: "The recommendation is solid, but a few conditions may need monitoring.",
    suitabilityLowNote: "Treat this result carefully and verify field conditions before acting on it.",
    required: "Required",
    enterCity: "Please enter a city",
    importPlaceholder: "Paste your soil test report here...\nExample:\nNitrogen: 90\nPhosphorous: 42\nPotassium: 43\npH: 6.5",
    importDetect: "Auto-detect values",
    importFound: "Found",
    importApply: "Apply to form",
    importNotFound: "Could not detect values. Try a different format.",
    noDescription: "No description available.",
    pasteLabReport: "Paste lab report",
    loadError: "Failed to fetch weather data.",
    weatherFetchFailed: "Failed to fetch weather data.",
  };
}

function getProfileLanguageOptions(language = "english") {
  if (language === "hindi") {
    return [
      { value: "English", label: "English" },
      { value: "Hindi", label: "à¤¹à¤¿à¤¨à¥à¤¦à¥€" },
      { value: "Hinglish", label: "à¤¹à¤¿à¤‚à¤—à¥à¤²à¤¿à¤¶" },
    ];
  }

  if (language === "hinglish") {
    return [
      { value: "English", label: "English" },
      { value: "Hindi", label: "Hindi" },
      { value: "Hinglish", label: "Hinglish" },
    ];
  }

  return PROFILE_LANGUAGES.map((item) => ({ value: item, label: item }));
}

function getLocalizedFieldMeta(language = "english") {
  if (language === "hindi") {
    return {
      N: { label: "à¤¨à¤¾à¤‡à¤Ÿà¥à¤°à¥‹à¤œà¤¨", explainer: "à¤¨à¤¾à¤‡à¤Ÿà¥à¤°à¥‹à¤œà¤¨ à¤ªà¤¤à¥à¤¤à¤¿à¤¯à¥‹à¤‚ à¤•à¥€ à¤¬à¤¢à¤¼à¤µà¤¾à¤° à¤”à¤° à¤¹à¤°à¤¿à¤¯à¤¾à¤²à¥€ à¤•à¥‡ à¤²à¤¿à¤ à¤œà¤¼à¤°à¥‚à¤°à¥€ à¤¹à¥ˆà¥¤ à¤•à¤®à¥€ à¤¹à¥‹à¤¨à¥‡ à¤ªà¤° à¤ªà¤¤à¥à¤¤à¥‡ à¤ªà¥€à¤²à¥‡ à¤ªà¤¡à¤¼à¤¤à¥‡ à¤¹à¥ˆà¤‚à¥¤" },
      P: { label: "à¤«à¥‰à¤¸à¥à¤«à¥‹à¤°à¤¸", explainer: "à¤«à¥‰à¤¸à¥à¤«à¥‹à¤°à¤¸ à¤œà¤¡à¤¼à¥‹à¤‚ à¤”à¤° à¤¶à¥à¤°à¥à¤†à¤¤à¥€ à¤¬à¤¢à¤¼à¤µà¤¾à¤° à¤®à¥‡à¤‚ à¤®à¤¦à¤¦ à¤•à¤°à¤¤à¤¾ à¤¹à¥ˆà¥¤ à¤«à¤² à¤”à¤° à¤«à¥‚à¤² à¤•à¥‡ à¤²à¤¿à¤ à¤­à¥€ à¤…à¤¹à¤® à¤¹à¥ˆà¥¤" },
      K: { label: "à¤ªà¥‹à¤Ÿà¥ˆà¤¶à¤¿à¤¯à¤®", explainer: "à¤ªà¥‹à¤Ÿà¥ˆà¤¶à¤¿à¤¯à¤® à¤ªà¤¾à¤¨à¥€ à¤•à¥‡ à¤¸à¤‚à¤¤à¥à¤²à¤¨ à¤”à¤° à¤°à¥‹à¤—-à¤ªà¥à¤°à¤¤à¤¿à¤°à¥‹à¤§à¤• à¤•à¥à¤·à¤®à¤¤à¤¾ à¤•à¥‹ à¤¬à¥‡à¤¹à¤¤à¤° à¤¬à¤¨à¤¾à¤¤à¤¾ à¤¹à¥ˆà¥¤" },
      temperature: { label: "à¤¤à¤¾à¤ªà¤®à¤¾à¤¨", explainer: "à¤”à¤¸à¤¤ à¤¦à¤¿à¤¨ à¤•à¤¾ à¤¤à¤¾à¤ªà¤®à¤¾à¤¨à¥¤ à¤…à¤§à¤¿à¤•à¤¤à¤° à¤«à¤¸à¤²à¥‡à¤‚ 15 à¤¸à¥‡ 30 à¤¡à¤¿à¤—à¥à¤°à¥€ à¤¸à¥‡à¤²à¥à¤¸à¤¿à¤¯à¤¸ à¤®à¥‡à¤‚ à¤¬à¥‡à¤¹à¤¤à¤° à¤¬à¤¢à¤¼à¤¤à¥€ à¤¹à¥ˆà¤‚à¥¤" },
      humidity: { label: "à¤¨à¤®à¥€", explainer: "à¤¹à¤µà¤¾ à¤•à¥€ à¤†à¤°à¥à¤¦à¥à¤°à¤¤à¤¾à¥¤ à¤¬à¤¹à¥à¤¤ à¤…à¤§à¤¿à¤• à¤¨à¤®à¥€ à¤¸à¥‡ à¤«à¤«à¥‚à¤‚à¤¦à¥€ à¤¬à¤¢à¤¼ à¤¸à¤•à¤¤à¥€ à¤¹à¥ˆ à¤”à¤° à¤•à¤® à¤¨à¤®à¥€ à¤¸à¥‡ à¤ªà¥Œà¤§à¥‡ à¤®à¥à¤°à¤à¤¾ à¤¸à¤•à¤¤à¥‡ à¤¹à¥ˆà¤‚à¥¤" },
      ph: { label: "à¤®à¤¿à¤Ÿà¥à¤Ÿà¥€ à¤•à¤¾ pH", explainer: "à¤…à¤§à¤¿à¤•à¤¤à¤° à¤«à¤¸à¤²à¥‹à¤‚ à¤•à¥‡ à¤²à¤¿à¤ pH 6 à¤¸à¥‡ 7.5 à¤…à¤šà¥à¤›à¤¾ à¤®à¤¾à¤¨à¤¾ à¤œà¤¾à¤¤à¤¾ à¤¹à¥ˆà¥¤" },
      rainfall: { label: "à¤µà¤°à¥à¤·à¤¾", explainer: "à¤®à¥Œà¤¸à¤®à¥€ à¤¯à¤¾ à¤µà¤¾à¤°à¥à¤·à¤¿à¤• à¤µà¤°à¥à¤·à¤¾ à¤•à¥€ à¤®à¤¾à¤¤à¥à¤°à¤¾à¥¤ à¤‡à¤¸à¤¸à¥‡ à¤¸à¤¿à¤‚à¤šà¤¾à¤ˆ à¤•à¥€ à¤œà¤¼à¤°à¥‚à¤°à¤¤ à¤¸à¤®à¤à¤¨à¥‡ à¤®à¥‡à¤‚ à¤®à¤¦à¤¦ à¤®à¤¿à¤²à¤¤à¥€ à¤¹à¥ˆà¥¤" },
    };
  }

  if (language === "hinglish") {
    return {
      N: { label: "Nitrogen", explainer: "Nitrogen leafy growth aur greenery ke liye zaroori hota hai. Kami ho to patte peele pad sakte hain." },
      P: { label: "Phosphorous", explainer: "Phosphorous roots aur early growth ko support karta hai. Flowering aur fruiting me bhi useful hai." },
      K: { label: "Potassium", explainer: "Potassium water balance aur disease resistance ko strong banata hai." },
      temperature: { label: "Temperature", explainer: "Average daytime temperature. Zyada tar crops 15 se 30 degree ke beech achha perform karti hain." },
      humidity: { label: "Humidity", explainer: "Hawa ki nami. Zyada humidity fungus badha sakti hai aur kam humidity se wilting ho sakti hai." },
      ph: { label: "Soil pH", explainer: "Most crops ke liye pH 6 se 7.5 tak theek mana jata hai." },
      rainfall: { label: "Rainfall", explainer: "Seasonal ya annual rainfall amount. Isse irrigation planning me madad milti hai." },
    };
  }

  return {};
}

function getZoneLabel(zone, language = "english") {
  if (language === "hindi") {
    if (zone === "ok") return "à¤¸à¤‚à¤¤à¥à¤²à¤¿à¤¤";
    if (zone === "high") return "à¤Šà¤à¤šà¤¾";
    return "à¤•à¤®";
  }
  if (language === "hinglish") {
    if (zone === "ok") return "Balanced";
    if (zone === "high") return "High";
    return "Low";
  }
  if (zone === "ok") return "ok";
  return zone;
}

// â”€â”€â”€ #12 Voice input â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
        ? 'à¤®à¥à¤à¥‡ à¤•à¥à¤› à¤¸à¥à¤¨à¤¾à¤ˆ à¤¨à¤¹à¥€à¤‚ à¤¦à¤¿à¤¯à¤¾à¥¤ à¤«à¤¿à¤° à¤¸à¥‡ à¤•à¥‹à¤¶à¤¿à¤¶ à¤•à¤°à¥‡à¤‚ à¤”à¤° à¤œà¤¿à¤²à¥‡ à¤•à¤¾ à¤¨à¤¾à¤® à¤¸à¤¾à¤«à¤¼ à¤¬à¥‹à¤²à¥‡à¤‚à¥¤'
        : language === 'hinglish'
          ? 'Maine kuch nahi suna. Dobara try karo aur district name clearly bolo.'
          : 'I did not hear anything. Try again and speak the district name clearly.';
    case 'audio-capture':
      return language === 'hindi'
        ? 'à¤•à¥‹à¤ˆ à¤®à¤¾à¤‡à¤•à¥à¤°à¥‹à¤«à¤¼à¥‹à¤¨ à¤¨à¤¹à¥€à¤‚ à¤®à¤¿à¤²à¤¾à¥¤ à¤®à¤¾à¤‡à¤• à¤•à¤¨à¥‡à¤•à¥à¤¶à¤¨ à¤”à¤° à¤¬à¥à¤°à¤¾à¤‰à¤œà¤¼à¤° à¤…à¤¨à¥à¤®à¤¤à¤¿ à¤œà¤¾à¤à¤šà¥‡à¤‚à¥¤'
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

// â”€â”€â”€ Shared sub-components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    <div className="cr-skeleton" role="status" aria-label="Loadingâ€¦">
      <div className="cr-skeleton__img"/>
      <div className="cr-skeleton__line cr-skeleton__line--wide"/>
      <div className="cr-skeleton__line cr-skeleton__line--mid"/>
      <div className="cr-skeleton__line"/>
      <div className="cr-skeleton__line cr-skeleton__line--short"/>
      <div className="cr-skeleton__block"/>
    </div>
  );
}

// â”€â”€â”€ ML result view â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function MLResult({ predictionData, formData, onBack }) {
  const history = useHistory();
  const { language } = useLanguage();
  const ui = normalizeLocalizedCopy(getCropUi(language));
  const [selectedCrop, setSelectedCrop] = useState(null);
  const [imgError,     setImgError]     = useState(false);

  const xgbConf  = Math.min(100, Math.max(0, parseFloat(predictionData.xgb_model_probability)));
  const rfConf   = Math.min(100, Math.max(0, parseFloat(predictionData.rf_model_probability)));
  const knnConf  = Math.min(100, Math.max(0, parseFloat(predictionData.knn_model_probability)));
  const xgbLabel = predictionData.xgb_model_prediction;
  const rfLabel  = predictionData.rf_model_prediction;
  const knnLabel = predictionData.knn_model_prediction;

  const modelResults = [
    { model:"XGBoost",       label:xgbLabel, conf:xgbConf, delay:"0ms"   },
    { model:"Random Forest", label:rfLabel,  conf:rfConf,  delay:"70ms"  },
    { model:"KNN",           label:knnLabel, conf:knnConf, delay:"140ms" },
  ];

  const finalLabel = predictionData.final_prediction || weightedVote(xgbLabel, rfLabel, knnLabel, xgbConf, rfConf, knnConf);
  const predictedCrop = cropData[finalLabel];

  const finalModel = modelResults
    .filter(m => m.label === finalLabel)
    .sort((a,b) => b.conf - a.conf)[0] || { model:"Model", conf:0 };

  const finalConf = finalModel.conf;
  const modelUsed = finalModel.model;

  const agreeingModels = [
    xgbLabel === finalLabel && "XGBoost",
    rfLabel  === finalLabel && "Random Forest",
    knnLabel === finalLabel && "KNN",
  ].filter(Boolean);

  const bestAlt = modelResults
    .filter(m => m.label !== finalLabel)
    .sort((a,b) => b.conf - a.conf)[0];
  const topSuggestions = getTopCropSuggestions(modelResults);
  const reasonHighlights = normalizeLocalizedCopy(getCropReasonHighlights(formData, finalLabel, language));

  const confClass = finalConf >= 80 ? 'high' : finalConf >= 60 ? 'mid' : 'low';
  const suitability = normalizeLocalizedCopy(getSuitabilityMeta(finalConf, language));
  const explanationCards = normalizeLocalizedCopy([
    getConfidenceExplanation(finalConf, language),
    getConsensusExplanation(agreeingModels.length, modelResults.length, language),
    getDecisionEdgeExplanation(finalConf, bestAlt, language),
  ]);
  const localizedSeasons = normalizeLocalizedCopy(getLocalizedSeasons(language));
  const selectedSeason = localizedSeasons.find((item) => item.value === formData.season);

  const handleShare = () => shareResult(
      `Grow ${predictedCrop?.title}`,
      `Crop Recommendation: ${predictedCrop?.title}\nConfidence: ${finalConf.toFixed(2)}% (${modelUsed})\nSupported by: ${agreeingModels.join(', ')}\n\nGenerated by Crop Recommender AI`
    );

  const handleDownload = () => {
    const lines = [
      "Crop Recommendation Report",
      "==========================",
      `Recommended Crop: ${predictedCrop?.title || finalLabel}`,
      `Confidence: ${finalConf.toFixed(2)}%`,
      `Model Used: ${modelUsed}`,
      `Supported By: ${agreeingModels.join(", ") || "No consensus"}`,
      "",
      "Input Summary",
      "-------------",
      `Nitrogen: ${formData.N || "--"}`,
      `Phosphorous: ${formData.P || "--"}`,
      `Potassium: ${formData.K || "--"}`,
      `Temperature: ${formData.temperature || "--"} C`,
      `Humidity: ${formData.humidity || "--"}%`,
      `Soil pH: ${formData.ph || "--"}`,
      `Rainfall: ${formData.rainfall || "--"} mm`,
      `Region: ${formData.region || "--"}`,
      `Season: ${formData.season || "--"}`,
      "",
      "Notes",
      "-----",
      predictedCrop?.description || "No description available.",
    ];

    downloadTextReport(
      `${String(finalLabel || "crop").toLowerCase().replace(/\s+/g, "-")}-recommendation.txt`,
      lines.join("\n")
    );
  };

  const handleOpenFertilizer = () => {
      history.push('/fertilizer', {
        prefillForm: {
          Nitrogen: formData.N || "",
          Potassium: formData.K || "",
          Phosphorous: formData.P || "",
          Temperature: formData.temperature || "",
          Humidity: formData.humidity || "",
          Moisture: "",
          soil_type: "",
          crop_type: mapCropToFertilizerType(finalLabel, predictedCrop?.title),
        },
        sourceCrop: predictedCrop?.title || finalLabel,
        sourceContext: {
          confidence: finalConf,
          model: modelUsed,
          region: formData.region || "",
          season: formData.season || "",
        },
      });
    };

  return (
    <div className="cr-result">
      <div className="cr-result__hero" style={imgError ? { background:'linear-gradient(135deg,#1a2512,#0a120a)' } : undefined}>
        {!imgError && (
          <img src={predictedCrop?.imageUrl} alt={predictedCrop?.title} className="cr-result__hero-img" onError={() => setImgError(true)}/>
        )}
        <div className="cr-result__hero-overlay"/>
        <div className="cr-result__hero-text">
          <div className="cr-result__eyebrow">{ui.mlRecommendedCrop}</div>
          <h1 className="cr-result__crop-name">{predictedCrop?.title}</h1>
          <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', flexWrap:'wrap' }}>
            <div className={`cr-conf-pill cr-conf-pill--${confClass}`}>
              {finalConf.toFixed(2)}% {ui.confidence} Â· {modelUsed}
            </div>
            <button className="cr-share-btn" onClick={handleShare} aria-label={ui.share}>{ui.share} â†—</button>
          </div>
        </div>
      </div>

      <div className="cr-result__body">
        <div className={`cr-suitability-banner cr-suitability-banner--${suitability.tone}`}>
          <strong>{suitability.label}</strong>
          <span>{suitability.note}</span>
        </div>
        <div className="cr-explain-grid">
          {explanationCards.map((card) => (
            <div key={`${card.title}-${card.detail}`} className="cr-explain-card">
              <div className="cr-explain-card__label">{card.title}</div>
              <div className="cr-explain-card__text">{card.detail}</div>
            </div>
          ))}
        </div>
        {agreeingModels.length > 0 && (
          <div className="cr-agree-row">
            <span className="cr-agree-row__icon" aria-hidden="true">âœ“</span>
            <span>{ui.supportedByPrefix} <strong>{agreeingModels.join(', ')}</strong></span>
          </div>
        )}
        {finalConf < 60 && <div className="cr-warning" role="alert">âš  {ui.lowConfidence}</div>}
        {bestAlt && (
          <div className="cr-alt-row">
            <span className="cr-alt-row__label">{ui.alternative}</span>
            <button className="cr-alt-row__crop" onClick={() => setSelectedCrop(bestAlt.label)}>{bestAlt.label}</button>
            <span className="cr-alt-row__meta">{bestAlt.conf.toFixed(2)}% via {bestAlt.model}</span>
          </div>
        )}

        <p className="cr-result__desc">{predictedCrop?.description || ui.noDescription}</p>

        {topSuggestions.length > 0 && (
          <>
            <div className="cr-section-label">{ui.topSuggestions}</div>
            <div className="cr-top-suggestions">
              {topSuggestions.map((item, index) => (
                <button
                  key={`${item.label}-${index}`}
                  type="button"
                  className={`cr-top-suggestion${item.label === finalLabel ? ' cr-top-suggestion--active' : ''}`}
                  onClick={() => setSelectedCrop(item.label)}
                >
                  <span className="cr-top-suggestion__rank">#{index + 1}</span>
                  <span className="cr-top-suggestion__body">
                    <span className="cr-top-suggestion__name">{cropData[item.label]?.title || item.label}</span>
                    <span className="cr-top-suggestion__meta">
                      {item.confidence.toFixed(2)}% via {item.models.join(', ')}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        {reasonHighlights.length > 0 && (
          <>
            <div className="cr-section-label">{ui.whyThisCrop}</div>
            <div className="cr-why-box">
              {reasonHighlights.map((reason, index) => (
                <div key={index} className="cr-why-box__item">
                  <span className="cr-why-box__dot" aria-hidden="true" />
                  <span>{reason}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {(formData.region || formData.season) && (
          <>
            <div className="cr-section-label">{ui.regionSeasonContext}</div>
            <div className="cr-context-box">
              {formData.region && (
                <div className="cr-context-box__item">
                  <span className="cr-context-box__label">{ui.region}</span>
                  <span className="cr-context-box__value">{formData.region}</span>
                </div>
              )}
              {formData.season && (
                <div className="cr-context-box__item">
                  <span className="cr-context-box__label">{ui.season}</span>
                  <span className="cr-context-box__value">
                    {selectedSeason?.label || formData.season}
                    {getSeasonWindowLabel(formData.season, language) ? ` | ${getSeasonWindowLabel(formData.season, language)}` : ""}
                  </span>
                </div>
              )}
            </div>
          </>
        )}

        {/* #2 Calendar */}
        <CropCalendar cropKey={finalLabel}/>

        {/* #3 + #4 Radar + Vote triangle */}
        <div className="cr-analysis-row">
          <RadarChart formData={formData} cropKey={finalLabel}/>
          <VoteTriangle
            xgbLabel={xgbLabel} rfLabel={rfLabel} knnLabel={knnLabel}
            xgbConf={xgbConf}   rfConf={rfConf}   knnConf={knnConf}
            winner={finalLabel}
          />
        </div>

        <div className="cr-section-label">{ui.modelBreakdown}</div>
        <div className="cr-models-grid">
          {modelResults.map(m => (
            <div key={m.model} className={`cr-model-badge${m.label===finalLabel ? ' cr-model-badge--final':''}`} style={{ animationDelay:m.delay }}>
              <div className="cr-model-badge__header">
                <span className="cr-model-badge__name">{m.model}</span>
                {m.label === finalLabel && <span className="cr-model-badge__crown">â˜… {ui.winner}</span>}
              </div>
              <button className="cr-model-badge__crop" onClick={() => setSelectedCrop(m.label)}>{m.label}</button>
              <ConfidenceBar value={m.conf}/>
            </div>
          ))}
        </div>

        {selectedCrop && selectedCrop !== finalLabel && (
          <CropDetailPanel cropKey={selectedCrop} onClose={() => setSelectedCrop(null)}/>
        )}

        <div className="cr-result__actions">
          <button className="cr-btn cr-btn--ghost" onClick={handleDownload}>{ui.downloadResult}</button>
          <button className="cr-btn cr-btn--ghost" onClick={handleOpenFertilizer}>{ui.goToFertilizer}</button>
          <button className="cr-btn cr-btn--ghost" onClick={onBack}>{ui.backToPrediction}</button>
        </div>
      </div>
    </div>
  );
}

// â”€â”€â”€ ML panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function MLPanel() {
  const { language } = useLanguage();
  const ui = normalizeLocalizedCopy(getCropUi(language));
  const localizedSeasons = normalizeLocalizedCopy(getLocalizedSeasons(language));
  const profileLanguageOptions = normalizeLocalizedCopy(getProfileLanguageOptions(language));
  const [formData,       setFormData]       = useState(INITIAL_FORM);
  const [city,           setCity]           = useState("");
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [predictionData, setPredictionData] = useState({});
  const [loadingStatus,  setLoadingStatus]  = useState(false);
  const [touched,        setTouched]        = useState({});
  const [rangeErrors,    setRangeErrors]    = useState({});
  const [profileForm,    setProfileForm]    = useState(() => getFarmerProfile());
  const [activeExplainerId, setActiveExplainerId] = useState(null);

  // Persist form between tab switches
  useEffect(() => {
    try { const s = sessionStorage.getItem('cr-ml-form'); if (s) setFormData(JSON.parse(s)); } catch {}
  }, []);
  useEffect(() => {
    try { sessionStorage.setItem('cr-ml-form', JSON.stringify(formData)); } catch {}
  }, [formData]);

  const filledCount = FIELDS.filter(field => formData[field.id] !== "").length;
  const hasRangeErrors = Object.values(rangeErrors).some(Boolean);
  const isFormValid = filledCount === FIELDS.length && !hasRangeErrors;
  const progressPct = (filledCount / FIELDS.length) * 100;
  const soilScore   = computeSoilHealthScore(formData);
  const localizedFieldMeta = normalizeLocalizedCopy(getLocalizedFieldMeta(language));
  const localizedFields = DISPLAY_FIELDS.map((field) => ({
    ...field,
    ...(localizedFieldMeta[field.id] || {}),
  }));

  const handleChange = useCallback((idOrEvent, directValue) => {
    let id, value;
    if (typeof idOrEvent === 'string') { id = idOrEvent; value = directValue; }
    else { id = idOrEvent.target.id; value = idOrEvent.target.value; }
    const nextValue = clampToFieldRange(id, value);
    setFormData(prev => ({ ...prev, [id]: nextValue }));
    setTouched(prev => ({ ...prev, [id]: true }));
    if (rangeErrors[id]) setRangeErrors(prev => ({ ...prev, [id]: null }));
  }, [rangeErrors]);

  const handleBlur = useCallback((id) => {
    const field = FIELDS.find((item) => item.id === id);
    if (!field) return;

    const rawValue = formData[id];
    if (rawValue === "") {
      setTouched(prev => ({ ...prev, [id]: true }));
      return;
    }

    const numeric = parseFloat(rawValue);
    if (Number.isNaN(numeric)) {
      setRangeErrors(prev => ({ ...prev, [id]: "Enter a valid number" }));
      return;
    }

    const clamped = Math.min(field.max, Math.max(field.min, numeric));
    if (clamped !== numeric) {
      setFormData(prev => ({ ...prev, [id]: String(clamped) }));
      setRangeErrors(prev => ({ ...prev, [id]: `Adjusted to ${field.min}-${field.max}` }));
      return;
    }

    setRangeErrors(prev => ({ ...prev, [id]: null }));
  }, [formData]);

  const handleAutoFill = async () => {
    if (!city.trim()) { alert(ui.enterCity); return; }
    try {
      setLoadingWeather(true);
      const data = await getWeatherData(city.trim());
      if (!data) { alert(ui.loadError); return; }
      setFormData(prev => ({
        ...prev,
        temperature: String(Math.round(data.temperature)),
        humidity:    String(Math.round(data.humidity)),
        rainfall:    String(Math.round(data.rainfall)),
        ph:          prev.ph || "6.5",
      }));
      setTouched(prev => ({
        ...prev,
        temperature: true,
        humidity: true,
        rainfall: true,
        ph: prev.ph ? prev.ph : true,
      }));
    } catch { alert(ui.weatherFetchFailed); }
    finally  { setLoadingWeather(false); }
  };

  const handleProfileChange = useCallback((event) => {
    const { id, value } = event.target;
    const keyMap = {
      farmerName: "farmerName",
      farmName: "farmName",
      profileRegion: "region",
      profileLanguage: "language",
    };
    setProfileForm(prev => ({ ...prev, [keyMap[id] || id]: value }));
  }, []);

  const handleSaveProfile = () => {
    saveFarmerProfile(profileForm);
  };

  const handleApplyProfile = () => {
    setFormData(prev => ({
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
      const finalPrediction = result.final_prediction || weightedVote(
        result.xgb_model_prediction,
        result.rf_model_prediction,
        result.knn_model_prediction,
        parseFloat(result.xgb_model_probability),
        parseFloat(result.rf_model_probability),
        parseFloat(result.knn_model_probability)
      );
      const matchingConfidence = [
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
      try { sessionStorage.removeItem('cr-ml-form'); } catch {}
    } catch (error) {
      setPredictionData({
        error: error.code === "ECONNABORTED"
          ? ui.requestTimedOut
          : ui.unableToReach,
      });
    } finally { setLoadingStatus(false); }
  };

  if (loadingStatus) return <LoadingSkeleton/>;
  if (predictionData.final_prediction) {
    return <MLResult predictionData={predictionData} formData={formData} onBack={() => setPredictionData({})}/>;
  }

  return (
    <>
      {predictionData.error && (
        <div className="cr-alert" role="alert">
          <span className="cr-alert__icon" aria-hidden="true">âš </span>
          <span>{predictionData.error}</span>
          <button className="cr-alert__retry" onClick={() => setPredictionData({})}>{ui.retry} â†º</button>
        </div>
      )}

      {/* Weather auto-fill */}
      <div className="cr-section-label">{ui.autoFillWeather}</div>
      <div className="cr-autofill-box">
        <input
          type="text"
          placeholder={ui.autoFillPlaceholder}
          value={city}
          onChange={e => setCity(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAutoFill()}
          className="cr-autofill-input"
          aria-label={ui.autoFillPlaceholder}
        />
        <button onClick={handleAutoFill} disabled={loadingWeather} className="cr-autofill-btn">
          {loadingWeather ? ui.autoFillLoading : `ðŸ“ ${ui.autoFillAction}`}
        </button>
      </div>

      <div className="cr-section-label">{ui.optionalContext}</div>
      <div className="cr-context-grid">
        <div className="cr-field">
          <div className="cr-field__icon" aria-hidden="true">RG</div>
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
            <label className="cr-floating-label" htmlFor="region">{ui.regionLabel}</label>
            <span className="cr-field__hint" aria-hidden="true">{ui.regionHint}</span>
          </div>
        </div>

        <div className="cr-season-chips">
          {localizedSeasons.map((season) => (
            <button
              key={season.value}
              type="button"
              className={`cr-season-chip${formData.season === season.value ? ' cr-season-chip--active' : ''}`}
              onClick={() => setFormData(prev => ({
                ...prev,
                season: prev.season === season.value ? "" : season.value,
              }))}
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
            <div className="cr-field__icon" aria-hidden="true">FN</div>
            <div className="cr-field__inner">
              <input className="cr-field__input" id="farmerName" name="farmerName" type="text" value={profileForm.farmerName} onChange={handleProfileChange} placeholder=" " autoComplete="off" />
              <label className="cr-floating-label" htmlFor="farmerName">{ui.farmerName}</label>
            </div>
          </div>

          <div className="cr-field">
            <div className="cr-field__icon" aria-hidden="true">FM</div>
            <div className="cr-field__inner">
              <input className="cr-field__input" id="farmName" name="farmName" type="text" value={profileForm.farmName} onChange={handleProfileChange} placeholder=" " autoComplete="off" />
              <label className="cr-floating-label" htmlFor="farmName">{ui.farmName}</label>
            </div>
          </div>

          <div className="cr-field">
            <div className="cr-field__icon" aria-hidden="true">RG</div>
            <div className="cr-field__inner">
              <input className="cr-field__input" id="profileRegion" name="profileRegion" type="text" value={profileForm.region} onChange={handleProfileChange} placeholder=" " autoComplete="off" />
              <label className="cr-floating-label" htmlFor="profileRegion">{ui.defaultRegion}</label>
            </div>
          </div>

          <div className="cr-field cr-field--segmented">
            <div className="cr-field__icon" aria-hidden="true">LG</div>
            <div className="cr-field__inner cr-field__inner--segmented">
              <span className="cr-field__label-top">{ui.preferredLanguage}</span>
              <div className="cr-profile-language-group" role="group" aria-label={ui.preferredLanguage}>
                {profileLanguageOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`cr-profile-language-btn${profileForm.language === option.value ? ' cr-profile-language-btn--active' : ''}`}
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
              className={`cr-season-chip${profileForm.defaultSeason === season.value ? ' cr-season-chip--active' : ''}`}
              onClick={() => setProfileForm(prev => ({
                ...prev,
                defaultSeason: prev.defaultSeason === season.value ? "" : season.value,
              }))}
              aria-pressed={profileForm.defaultSeason === season.value}
            >
              <span className="cr-season-chip__title">{season.label}</span>
              <span className="cr-season-chip__desc">{season.desc}</span>
            </button>
          ))}
        </div>

        <div className="cr-profile-actions">
          <button type="button" className="cr-btn cr-btn--ghost" onClick={handleSaveProfile}>{ui.saveProfile}</button>
          <button type="button" className="cr-btn cr-btn--ghost" onClick={handleApplyProfile}>{ui.applyProfile}</button>
          <button type="button" className="cr-btn cr-btn--ghost" onClick={handleClearProfile}>{ui.clearProfile}</button>
        </div>
      </div>

      {/* #7 Soil test import */}
      <SoilTestImport onImport={parsed => setFormData(prev => ({ ...prev, ...parsed }))}/>

      {/* Fields header with #1 gauge */}
      <div className="cr-fields-header">
        <div className="cr-section-label" style={{ margin:0 }}>{ui.soilClimate}</div>
        <SoilHealthGauge score={soilScore}/>
      </div>

      {/* #5 + #6 Slider fields */}
      <div className="cr-inputs-grid cr-inputs-grid--sliders">
        {localizedFields.map(field => (
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

      {/* Progress bar */}
      <div className="cr-progress" role="progressbar" aria-valuenow={Math.round(progressPct)} aria-valuemin={0} aria-valuemax={100}>
        <div className="cr-progress__fill" style={{ width:`${progressPct}%` }}/>
      </div>

      <button
        className={`cr-btn cr-btn--primary${!isFormValid ? ' cr-btn--disabled' : ''}`}
        onClick={handleSubmit}
        disabled={!isFormValid}
        aria-disabled={!isFormValid}
      >
        <span>{ui.analysePredict}</span>
        <span className="cr-btn__arrow" aria-hidden="true">></span>
      </button>

      <p className="cr-hint" style={{ color: isFormValid ? 'rgba(200,245,90,0.7)' : undefined }} aria-live="polite">
        {isFormValid
          ? ui.readyToPredict
          : hasRangeErrors
            ? ui.reviewValues
            : ui.fieldsRemaining(FIELDS.length - filledCount)}
      </p>
    </>
  );
}

// â”€â”€â”€ AI advisor â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function isFallbackCrop(crop) {
  return crop.source === 'fallback' || /rule-based fallback/i.test(crop.reason || '');
}

function isFallbackAdvisorMeta(meta) {
  return meta?.mode === 'fallback' || meta?.source === 'local-fallback';
}

function cleanAdviceReason(reason) {
  return (reason || '').replace(/^Rule-based fallback(?:\s+for\s+[^:]+)?:\s*/i, '');
}

function getAICropPlaceholderMeta(cropKey, cropName) {
  const fallbackName = cropName || "Crop";
  const placeholderMap = {
    wheat: { icon: "ðŸŒ¾", accent: "grain", label: "Wheat Field" },
    mustard: { icon: "ðŸŒ¼", accent: "flower", label: "Mustard Field" },
    chickpea: { icon: "ðŸŒ¿", accent: "pulse", label: "Chickpea Field" },
    lentil: { icon: "ðŸŒ±", accent: "pulse", label: "Lentil Field" },
    rice: { icon: "ðŸŒ¾", accent: "grain", label: "Rice Field" },
    maize: { icon: "ðŸŒ½", accent: "grain", label: "Maize Field" },
    cotton: { icon: "â˜", accent: "fiber", label: "Cotton Field" },
    pigeonpeas: { icon: "ðŸŒ¿", accent: "pulse", label: "Pigeon Pea Field" },
  };

  return placeholderMap[cropKey] || {
    icon: "ðŸŒ±",
    accent: "default",
    label: `${fallbackName} Crop`,
  };
}

function AICropCard({ crop, index, language }) {
  const ui = normalizeLocalizedCopy(getAdvisorUi(language));
  const cropKey = crop.crop?.toLowerCase().replace(/\(.*?\)/g,"").replace(/\s+/g,"").replace(/[^a-z]/g,"").trim();
  const imgSrc  = CROP_IMAGE_MAP[cropKey] || null;
  const placeholderMeta = normalizeLocalizedCopy(getAICropPlaceholderMeta(cropKey, crop.crop));
  const confColor = crop.confidence === 'High' ? 'high' : crop.confidence === 'Medium' ? 'mid' : 'low';
  const fitColor  = crop.season_fit  === 'Perfect' ? 'high' : crop.season_fit === 'Good' ? 'mid' : 'low';
  const fallback = isFallbackCrop(crop);
  const reason = cleanAdviceReason(crop.reason);
  const confidenceLabel = normalizeLocalizedCopy(localizeAdvisorScale(crop.confidence, language, "confidence"));
  const fitLabel = normalizeLocalizedCopy(localizeAdvisorScale(crop.season_fit, language, "fit"));
  const sourceLabel = normalizeLocalizedCopy(fallback
    ? language === "hindi"
      ? "à¤¸à¥à¤¥à¤¾à¤¨à¥€à¤¯"
      : "Local"
    : "Gemini");
  const confidenceWord = normalizeLocalizedCopy(language === "hindi" ? "à¤µà¤¿à¤¶à¥à¤µà¤¾à¤¸" : "confidence");
  const fitWord = normalizeLocalizedCopy(language === "hindi" ? "à¤®à¥‡à¤²" : "fit");

  return (
  <div className={`ai-card${fallback ? ' ai-card--fallback' : ''}`} style={{ animationDelay: `${index * 120}ms` }}>
    
    <div className="ai-card__rank">#{index + 1}</div>
    <div className="ai-card__source">{sourceLabel}</div>

    <div className="ai-card__img-wrap">
      {imgSrc ? (
        <img src={imgSrc} alt={crop.crop} className="ai-card__img" />
      ) : (
        <div className={`ai-card__img-placeholder ai-card__img-placeholder--${placeholderMeta.accent}`}>
          <span className="ai-card__img-placeholder-icon" aria-hidden="true">{placeholderMeta.icon}</span>
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
        <span className="ai-pill ai-pill--neutral">{ui.cardWater}: {crop.water_need}</span>
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

// â”€â”€â”€ #11 AI follow-up chat â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function getFollowUpSuggestions(cropContext, language) {
  const primaryCrop = cropContext.crops?.[0] || 'this crop';
  if (language === 'hindi') {
    return [
      `${primaryCrop} à¤•à¥€ à¤¸à¤¿à¤‚à¤šà¤¾à¤ˆ à¤•à¥ˆà¤¸à¥‡ à¤•à¤°à¥‚à¤‚?`,
      `${cropContext.area} à¤®à¥‡à¤‚ à¤•à¤¿à¤¸ à¤«à¤¸à¤² à¤•à¥€ à¤®à¤¾à¤‚à¤— à¤¬à¥‡à¤¹à¤¤à¤° à¤¹à¥ˆ?`,
      'à¤•à¥Œà¤¨ à¤¸à¥‡ à¤•à¥€à¤Ÿà¥‹à¤‚ à¤¸à¥‡ à¤¸à¤¾à¤µà¤§à¤¾à¤¨ à¤°à¤¹à¤¨à¤¾ à¤šà¤¾à¤¹à¤¿à¤?',
      `${primaryCrop} à¤•à¥‡ à¤¸à¤¾à¤¥ à¤•à¥Œà¤¨ à¤¸à¥€ à¤«à¤¸à¤² à¤²à¤—à¤¾ à¤¸à¤•à¤¤à¥‡ à¤¹à¥ˆà¤‚?`,
    ];
  }
  if (language === 'hinglish') {
    return [
      `${primaryCrop} ki irrigation kaise karun?`,
      `${cropContext.area} me kis crop ki demand better hai?`,
      'Kaun se pests se bachna chahiye?',
      `${primaryCrop} ke saath intercropping kar sakte hain?`,
    ];
  }
  return [
    `How should I irrigate ${primaryCrop}?`,
    `Which option has better market demand in ${cropContext.area}?`,
    'What pests should I watch for?',
    `Can I intercrop with ${primaryCrop}?`,
  ];
}

function AIFollowUpChat({ cropContext, language }) {
  const [messages, setMessages] = useState([]);
  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const endRef = useRef(null);
  const ui = normalizeLocalizedCopy(getAdvisorUi(language));

  const suggestions = normalizeLocalizedCopy(getFollowUpSuggestions(cropContext, language));

  const send = async (text) => {
    if (!text.trim() || loading) return;
    setMessages(prev => [...prev, { role:'user', content:text }]);
    setInput('');
    setLoading(true);
    try {
      const { getAICropFollowUp } = await import('../api/aiRecommender');
      const updatedHistory = [
        ...messages,
        { role: "user", content: text }
      ];
      
      const reply = await getAICropFollowUp(
        cropContext,
        updatedHistory,
        language
      );
      
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: reply.reply,
          mode: reply.meta?.mode || "live",
          source: reply.meta?.source || "gemini"
        }
      ]);
    } catch {
      setMessages(prev => [...prev, { role:'assistant', content: ui.followUpError }]);
    } finally {
      setLoading(false);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior:'smooth' }), 100);
    }
  };

  return (
    <div className="cr-followup">
      <div className="cr-section-label" style={{ marginBottom:'0.6rem' }}>{ui.followUpTitle}</div>
      {messages.length === 0 && (
        <div className="cr-followup__suggestions">
          {suggestions.map((s,i) => <button key={i} className="cr-followup__suggestion" onClick={() => send(s)}>{s}</button>)}
        </div>
      )}
      {messages.length > 0 && (
        <div className="cr-followup__messages">
          {messages.map((m,i) => (
            <div key={i} className={`cr-followup__msg cr-followup__msg--${m.role}`}>
              {m.role === 'assistant' && m.source && (
                <div className="cr-followup__meta">
                  {m.source === 'local-fallback' ? ui.offlineMode : ui.liveMode}
                </div>
              )}
              {renderMessageContent(m.content)}
            </div>
          ))}
          {loading && <div className="cr-followup__msg cr-followup__msg--assistant cr-followup__msg--loading">{ui.followUpThinking}</div>}
          <div ref={endRef}/>
        </div>
      )}
      <div className="cr-followup__input-row">
        <input
          className="cr-followup__input"
          name="followup-question"
          type="text"
          placeholder={ui.followUpPlaceholder}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send(input)}
          aria-label={ui.followUpTitle}
        />
        <button className="cr-followup__send" onClick={() => send(input)} disabled={!input.trim()||loading} aria-label={ui.followUpSend}>{ui.followUpSend}</button>
      </div>
    </div>
  );
}

// â”€â”€â”€ AI advisor panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function AIAdvisorPanel() {
  const profileDefaults = getFarmerProfile();
  const { language: globalLanguage } = useLanguage();
  const [area,      setArea]      = useState(profileDefaults.region || '');
  const [season,    setSeason]    = useState(profileDefaults.defaultSeason || '');
  const [aiResults, setAiResults] = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [voiceStatus, setVoiceStatus] = useState(null);
  const [language, setLanguage] = useState(globalLanguage || mapProfileLanguageToAdvisor(profileDefaults.language));
  const ui = normalizeLocalizedCopy(getAdvisorUi(language));
  const localizedSeasons = normalizeLocalizedCopy(getLocalizedSeasons(language));

  useEffect(() => {
    if (!aiResults) {
      setLanguage(globalLanguage || mapProfileLanguageToAdvisor(profileDefaults.language));
    }
  }, [globalLanguage, profileDefaults.language, aiResults]);

  const isValid = area.trim().length >= 2 && season !== '';

  const handleRecommend = async () => {
    if (!isValid) return;
    try {
      setLoading(true); setError(''); setVoiceStatus(null); setAiResults(null);
      const results = await getAICropRecommendation(area.trim(), season, language);
      setAiResults(results);
    } catch (err) {
      setError(err.message || ui.genericAiError);
    } finally { setLoading(false); }
  };

  if (loading) {
    return (
      <div className="ai-loading">
        <div className="ai-loading__spinner" aria-hidden="true"/>
        <p className="ai-loading__text">{ui.loadingText(area, season)}</p>
        <p className="ai-loading__sub">{ui.loadingSub}</p>
      </div>
    );
  }

  if (aiResults) {
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
              <button className="cr-btn cr-btn--ghost ai-results__retry" onClick={handleRecommend}>
                {ui.retryLiveAi}
              </button>
            )}
            <button className="cr-btn cr-btn--ghost ai-results__back" onClick={() => { setAiResults(null); setArea(''); setSeason(''); setError(''); }}>
              {ui.backToForm}
            </button>
          </div>
        </div>
        <div className="ai-results__meta" aria-label="Recommendation summary">
          <span className={`ai-results__meta-pill${fallbackMode ? ' ai-results__meta-pill--fallback' : ' ai-results__meta-pill--live'}`}>{modeLabel}</span>
          <span className="ai-results__meta-pill">{ui.languageMeta}</span>
          <span className="ai-results__meta-pill">{ui.seasonMeta(season)}</span>
          <span className="ai-results__meta-pill">{ui.optionsMeta(resultItems.length)}</span>
        </div>
        <div className={`ai-results__disclaimer${fallbackMode ? ' ai-results__disclaimer--fallback' : ' ai-results__disclaimer--live'}`}>
          <span className="ai-results__disclaimer-icon" aria-hidden="true">AI</span>
          {fallbackMode
            ? ui.fallbackDisclaimer
            : ui.liveDisclaimer}
        </div>
        <div className="ai-cards-grid">
          {resultItems.map((crop,i) => <AICropCard key={i} crop={crop} index={i} language={language}/>)}
        </div>
        {/* #11 Follow-up chat */}
        <AIFollowUpChat cropContext={cropContext} language={language}/>
      </div>
    );
  }

  return (
    <div className="ai-form">
      <div className="ai-form__intro">
        <div className="ai-form__intro-icon" aria-hidden="true">AI</div>
        <div>
          <div className="ai-form__intro-title">{ui.introTitle}</div>
          <div className="ai-form__intro-sub">{ui.introSub}</div>
        </div>
      </div>

      <div className="ai-form__group">
        <div className="cr-section-label">{ui.responseLanguage}</div>
        <div className="ai-language-toggle" role="group" aria-label={ui.responseLanguageAria}>
          {ADVISOR_LANGUAGES.map(option => (
            <button
              key={option.value}
              type="button"
              className={`ai-language-btn${language === option.value ? ' ai-language-btn--active' : ''}`}
              onClick={() => { setLanguage(option.value); setVoiceStatus(null); }}
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
          <span className="cr-alert__icon" aria-hidden="true">!</span>
          {error}
        </div>
      )}

      <div className="ai-form__group">
        <label className="cr-section-label" htmlFor="ai-area">{ui.locationLabel}</label>
        <div className="ai-area-field">
          <span className="ai-area-field__icon" aria-hidden="true">LOC</span>
          <input
            id="ai-area"
            className="ai-area-field__input"
            type="text"
            placeholder={ui.locationPlaceholder}
            value={area}
            onChange={e => { setArea(e.target.value); setVoiceStatus(null); }}
            onKeyDown={e => e.key === 'Enter' && isValid && handleRecommend()}
            maxLength={80}
            autoComplete="off"
            spellCheck="false"
            aria-label={ui.locationAria}
          />
          {/* #12 Voice input */}
          <VoiceInputButton onResult={text => setArea(text)} onStatus={setVoiceStatus} lang={language === 'english' ? 'en-IN' : 'hi-IN'} language={language}/>
        </div>
        {voiceStatus && (
          <p className={`cr-voice-status cr-voice-status--${voiceStatus.type}`} role={voiceStatus.type === 'error' ? 'alert' : 'status'}>
            {voiceStatus.message}
          </p>
        )}
        <p className="cr-hint" style={{ textAlign:'left', marginTop:'0.4rem' }}>
          {ui.locationHint}
        </p>
      </div>

      <div className="ai-form__group">
        <div className="cr-section-label">{ui.seasonLabel}</div>
        <div className="ai-season-grid">
          {localizedSeasons.map(s => (
            <button key={s.value}
              className={`ai-season-btn${season === s.value ? ' ai-season-btn--active' : ''}`}
              onClick={() => setSeason(s.value)}
              aria-pressed={season === s.value}
            >
              <span className="ai-season-btn__icon" aria-hidden="true">{s.icon}</span>
              <span className="ai-season-btn__label">{s.label}</span>
              <span className="ai-season-btn__desc">{s.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <button
        className={`cr-btn cr-btn--ai${!isValid ? ' cr-btn--disabled' : ''}`}
        onClick={handleRecommend}
        disabled={!isValid}
        aria-disabled={!isValid}
      >
        <span className="cr-btn__sparkle" aria-hidden="true">AI</span>
        <span>{ui.submitLabel}</span>
        <span className="cr-btn__arrow" aria-hidden="true">></span>
      </button>

      {!isValid && <p className="cr-hint">{ui.invalidHint}</p>}
    </div>
  );
}

// â”€â”€â”€ Root component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function CropRecommender() {
  const history = useHistory();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('ml');

  return (
    <div className="cr-page">
        <div className="cr-card" role="main">
          <div className="cr-card__header">
            <div className="cr-card__icon-wrap" aria-hidden="true">CR</div>
            <div>
              <h1 className="cr-card__title">{t('cropTitle')}</h1>
            <p className="cr-card__sub">
              <span className="cr-status-dot" aria-hidden="true"/>
                {t('cropSubtitle')}
              </p>
            </div>
            <button
              type="button"
              className="cr-btn cr-btn--ghost cr-header-btn"
              onClick={() => history.push('/history')}
            >
              {t('cropHistory')}
            </button>
          </div>

        <div className="cr-tabs" role="tablist" aria-label="Recommendation engine">
          {[
            { id:'ml', icon:'ML', name:t('cropTabMl'),  desc:t('cropTabMlDesc') },
            { id:'ai', icon:'AI', name:t('cropTabAi'), desc:t('cropTabAiDesc')  },
          ].map(t => (
            <button key={t.id}
              className={`cr-tab${activeTab === t.id ? ' cr-tab--active' : ''}`}
              onClick={() => setActiveTab(t.id)}
              role="tab"
              aria-selected={activeTab === t.id}
              aria-controls={`cr-panel-${t.id}`}
            >
              <span className="cr-tab__icon" aria-hidden="true">{t.icon}</span>
              <span>
                <span className="cr-tab__name">{t.name}</span>
                <span className="cr-tab__desc">{t.desc}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="cr-tab-panel" id={`cr-panel-${activeTab}`} role="tabpanel">
          {activeTab === 'ml' ? <MLPanel/> : <AIAdvisorPanel/>}
        </div>
      </div>
    </div>
  );
}

export default CropRecommender;










