import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import api from "../api/recommenderapi";
import { getAICropRecommendation } from "../api/aiRecommender";
import { getWeatherData } from "../api/weather";
import { cropData } from "./Data";
import { clearFarmerProfile, getFarmerProfile, saveFarmerProfile } from "../utils/farmerProfile";
import { savePredictionHistory } from "../utils/predictionHistory";
import { useLanguage } from "../context/LanguageContext";
import "../styles/croprecommenderoutput.css";

import apple        from "../images/crop/apple.jpg";
import banana       from "../images/crop/banana.jpg";
import blackgram    from "../images/crop/blackgram.jpg";
import chickpea     from "../images/crop/chickpea.jpg";
import coconut      from "../images/crop/coconut.jpg";
import coffee       from "../images/crop/coffee.png";
import cotton       from "../images/crop/cotton.png";
import grape        from "../images/crop/grape.png";
import jute         from "../images/crop/jute.jpg";
import kidneybeans  from "../images/crop/kidneybeans.jpg";
import lentil       from "../images/crop/lentil.jpg";
import maize        from "../images/crop/maize.jpg";
import mango        from "../images/crop/mango.jpg";
import mothbean     from "../images/crop/mothbean.jpg";
import mungbean     from "../images/crop/mungbean.jpg";
import muskmelon    from "../images/crop/muskmelon.jpg";
import orange       from "../images/crop/orange.jpg";
import papaya       from "../images/crop/papaya.jpg";
import pigeonpeas   from "../images/crop/pigeonpeas.jpg";
import pomegranate  from "../images/crop/pomegranate.jpg";
import rice         from "../images/crop/rice.jpg";
import watermelon   from "../images/crop/watermelon.jpg";

// ─── Field config ─────────────────────────────────────────────────────────────
const FIELDS = [
  { id: "N",           label: "Nitrogen",     hint: "0 – 140",     unit: "ratio", icon: "N",  min: 0,  max: 140, step: 1,   explainer: "Nitrogen fuels leafy growth & chlorophyll. Low N = yellow leaves, stunted plants." },
  { id: "P",           label: "Phosphorous",  hint: "0 – 140",     unit: "ratio", icon: "P",  min: 0,  max: 140, step: 1,   explainer: "Phosphorous drives root development & fruiting. Critical during early growth stages." },
  { id: "K",           label: "Potassium",    hint: "0 – 205",     unit: "ratio", icon: "K",  min: 0,  max: 205, step: 1,   explainer: "Potassium regulates water uptake & disease resistance. Essential for strong stems." },
  { id: "temperature", label: "Temperature",  hint: "8 – 44 °C",   unit: "°C",   icon: "T",  min: 8,  max: 44,  step: 0.1, explainer: "Average daytime temperature. Most crops grow best between 15–30°C." },
  { id: "humidity",    label: "Humidity",     hint: "14 – 100 %",  unit: "%",    icon: "H",  min: 14, max: 100, step: 0.1, explainer: "Relative air humidity. High humidity favours fungi; low humidity causes wilting." },
  { id: "ph",          label: "Soil pH",      hint: "0 – 14",      unit: "pH",   icon: "pH", min: 0,  max: 14,  step: 0.1, explainer: "pH 6–7.5 suits most crops. Acidic soil locks out nutrients; alkaline soil hinders iron uptake." },
  { id: "rainfall",    label: "Rainfall",     hint: "20 – 300 mm", unit: "mm",   icon: "R",  min: 20, max: 300, step: 0.1, explainer: "Annual or seasonal rainfall. Determines irrigation need and crop water budget." },
];

const INITIAL_FORM = {
  ...FIELDS.reduce((acc, f) => ({ ...acc, [f.id]: "" }), {}),
  season: "",
  region: "",
};

// ─── Static data ──────────────────────────────────────────────────────────────
const CROP_IDEAL_RANGES = {
  rice:       { N:[80,120], P:[40,60],  K:[40,60],  temperature:[22,28], humidity:[80,95],  ph:[5.5,7],   rainfall:[150,300] },
  maize:      { N:[80,110], P:[40,70],  K:[35,55],  temperature:[18,27], humidity:[55,80],  ph:[5.8,7.5], rainfall:[60,110]  },
  wheat:      { N:[60,120], P:[30,60],  K:[30,50],  temperature:[12,25], humidity:[50,70],  ph:[6,7.5],   rainfall:[50,100]  },
  cotton:     { N:[80,120], P:[40,70],  K:[40,70],  temperature:[21,37], humidity:[50,70],  ph:[5.8,8],   rainfall:[50,100]  },
  mango:      { N:[40,80],  P:[20,40],  K:[40,60],  temperature:[24,30], humidity:[50,60],  ph:[5.5,7.5], rainfall:[75,125]  },
  banana:     { N:[100,140],P:[50,80],  K:[100,150],temperature:[26,30], humidity:[75,85],  ph:[5.5,6.5], rainfall:[100,200] },
  apple:      { N:[20,60],  P:[10,30],  K:[20,60],  temperature:[5,20],  humidity:[70,90],  ph:[5.5,6.5], rainfall:[100,125] },
  chickpea:   { N:[20,40],  P:[40,60],  K:[20,40],  temperature:[15,25], humidity:[40,60],  ph:[6,7.5],   rainfall:[40,75]   },
  lentil:     { N:[20,40],  P:[30,50],  K:[15,30],  temperature:[15,25], humidity:[40,60],  ph:[6,7],     rainfall:[30,60]   },
  watermelon: { N:[50,80],  P:[30,50],  K:[50,80],  temperature:[25,35], humidity:[50,70],  ph:[6,7],     rainfall:[40,80]   },
};

const CROP_CALENDAR = {
  rice:       { sow:[5,6],  grow:[6,9],  harvest:[9,10],  label:"Jun–Oct"   },
  maize:      { sow:[5,6],  grow:[6,8],  harvest:[8,9],   label:"Jun–Sep"   },
  wheat:      { sow:[10,11],grow:[11,2], harvest:[3,4],   label:"Nov–Apr"   },
  cotton:     { sow:[4,5],  grow:[5,9],  harvest:[9,11],  label:"May–Nov"   },
  mango:      { sow:[6,7],  grow:[7,11], harvest:[3,5],   label:"Mar–May"   },
  banana:     { sow:[5,7],  grow:[7,4],  harvest:[4,5],   label:"Year-round"},
  apple:      { sow:[1,2],  grow:[2,9],  harvest:[9,10],  label:"Sep–Oct"   },
  chickpea:   { sow:[10,11],grow:[11,2], harvest:[2,3],   label:"Feb–Mar"   },
  lentil:     { sow:[10,11],grow:[11,2], harvest:[3,4],   label:"Mar–Apr"   },
  watermelon: { sow:[2,3],  grow:[3,5],  harvest:[5,6],   label:"May–Jun"   },
  muskmelon:  { sow:[2,3],  grow:[3,5],  harvest:[5,6],   label:"May–Jun"   },
};

const SEASONS = [
  { value:"Kharif", label:"Kharif", desc:"Jun – Oct · Monsoon", icon:"🌧" },
  { value:"Rabi",   label:"Rabi",   desc:"Nov – Apr · Winter",  icon:"❄"  },
  { value:"Zaid",   label:"Zaid",   desc:"Mar – Jun · Summer",  icon:"☀"  },
];

const ADVISOR_LANGUAGES = [
  { value:"english", label:"English", hint:"Simple" },
  { value:"hindi", label:"हिन्दी", hint:"Hindi" },
  { value:"hinglish", label:"हिंग्लिश", hint:"Hindi + English" },
];

const CROP_IMAGE_MAP = {
  apple, banana, blackgram, chickpea, coconut, coffee, cotton, grape,
  jute, kidneybeans, lentil, maize, mango, mothbean, mungbean,
  muskmelon, orange, papaya, pigeonpeas, pomegranate, rice, watermelon,
};

const MODEL_WEIGHTS = { xgb:0.4, rf:0.35, knn:0.25 };

// ─── Helpers ──────────────────────────────────────────────────────────────────
function weightedVote(xgbLabel, rfLabel, knnLabel, xgbConf, rfConf, knnConf) {
  const scores = {};
  const add = (label, w, conf) => { scores[label] = (scores[label]||0) + w * Math.min(100, Math.max(0, conf)); };
  add(xgbLabel, MODEL_WEIGHTS.xgb, xgbConf);
  add(rfLabel,  MODEL_WEIGHTS.rf,  rfConf);
  add(knnLabel, MODEL_WEIGHTS.knn, knnConf);
  return Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b);
}

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
  const ui = getCropUi(language);
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
const MONTHS = ['J','F','M','A','M','J','J','A','S','O','N','D'];

function CropCalendar({ cropKey }) {
  const { language } = useLanguage();
  const ui = getCropUi(language);
  const cal = CROP_CALENDAR[cropKey?.toLowerCase()];
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
  const ui = getCropUi(language);
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
  const ui = getCropUi(language);
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
            value={value}
            onChange={e => onChange(id, e.target.value)}
            min={min} max={max} step={step}
            placeholder="—"
            className="cr-field__number"
            aria-label={`${label} value`}
            aria-invalid={Boolean(error)}
          />
          <span className="cr-field__unit">{unit}</span>
        </div>
        {error && <div className="cr-field__error">{error}</div>}
      </div>
    </div>
  );
}

// ─── #7 Soil test import ──────────────────────────────────────────────────────
function SoilTestImport({ onImport }) {
  const { language } = useLanguage();
  const ui = getCropUi(language);
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
  const fieldMeta = getLocalizedFieldMeta(language);
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

  return matched.map((item) => {
    if (item.within) {
      if (english) return `${item.label} is within the preferred range (${item.min}-${item.max})`;
      if (hinglish) return `${item.label} preferred range (${item.min}-${item.max}) ke andar hai`;
      return `${item.label} पसंदीदा सीमा (${item.min}-${item.max}) के भीतर है`;
    }

    if (english) return `${item.label} is the closest available match for this crop profile`;
    if (hinglish) return `${item.label} is crop profile ke sabse kareeb match karta hai`;
    return `${item.label} इस फसल प्रोफ़ाइल के सबसे करीब मेल खाता है`;
  });
}

function getSeasonWindowLabel(season, language = "english") {
  const match = getLocalizedSeasons(language).find((item) => item.value === season);
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
      introTitle: "AI फसल सलाहकार",
      introSub: "Gemini आधारित | आपके क्षेत्र और मौसम के अनुसार सुझाव",
      responseLanguage: "जवाब की भाषा",
      responseLanguageAria: "सलाहकार की जवाब भाषा",
      locationLabel: "आपका क्षेत्र / जिला",
      locationPlaceholder: "जैसे पंजाब, विदर्भ, कावेरी डेल्टा...",
      locationAria: "आपका क्षेत्र या जिला",
      locationHint: "जितना संभव हो उतना स्पष्ट लिखें। राज्य से बेहतर जिला-स्तर का नाम काम करता है।",
      seasonLabel: "फसल का मौसम",
      submitLabel: "AI सुझाव प्राप्त करें",
      invalidHint: "आगे बढ़ने के लिए क्षेत्र लिखें और मौसम चुनें",
      loadingText: (area, season) => <>AI सलाहकार <strong>{area}</strong> | <strong>{season}</strong> के लिए सुझाव तैयार कर रहा है...</>,
      loadingSub: "क्षेत्रीय पैटर्न, मौसम और कृषि उपयुक्तता का विश्लेषण किया जा रहा है",
      resultsLabel: (season) => `AI सलाहकार | ${season} मौसम`,
      resultsTitle: (area) => <> <em>{area}</em> के लिए उपयुक्त फसलें </>,
      backToForm: "फ़ॉर्म पर वापस जाएँ",
      liveMode: "Gemini लाइव सलाह",
      offlineMode: "ऑफ़लाइन सलाह मोड",
      languageMeta: "हिन्दी",
      seasonMeta: (season) => `${season} मौसम`,
      optionsMeta: (count) => `${count} फसल विकल्प`,
      fallbackDisclaimer: "अभी Gemini की सीमा पूरी हो गई है, इसलिए ये सुझाव स्थानीय fallback से आए हैं। पास के कृषि विशेषज्ञ से पुष्टि करें।",
      liveDisclaimer: "AI द्वारा तैयार सुझाव। अंतिम निर्णय से पहले स्थानीय कृषि विशेषज्ञ से पुष्टि करें।",
      followUpTitle: "आगे सवाल पूछें",
      followUpPlaceholder: "इस फसल के बारे में कुछ भी पूछें...",
      followUpSend: "भेजें",
      followUpThinking: "सोच रहा है...",
      followUpError: "अभी जवाब नहीं मिल पाया। कृपया फिर से कोशिश करें।",
      voiceUnsupported: "इस ब्राउज़र में वॉइस इनपुट उपलब्ध नहीं है। Chrome या Edge आज़माएँ, या जगह का नाम टाइप करें।",
      voiceStopped: "वॉइस इनपुट रोक दिया गया।",
      voiceBlocked: "माइक्रोफ़ोन अनुमति बंद है। localhost के लिए माइक अनुमति दें, फिर दोबारा कोशिश करें।",
      voiceListening: "सुन रहा हूँ... अपना जिला या राज्य का नाम बोलें।",
      voiceHeard: (transcript) => `"${transcript}" सुना गया। आगे बढ़ने के लिए मौसम चुनें।`,
      voiceNoMatch: "बोली गई बात समझ में नहीं आई। फिर से कोशिश करें या जगह टाइप करें।",
      voiceStartFailed: "वॉइस इनपुट शुरू नहीं हो सका। कृपया जगह का नाम टाइप करें।",
      voiceButtonIdle: "बोलें",
      voiceButtonActive: "रोकें",
      voiceIdleAria: "जिले का नाम बोलें",
      voiceActiveAria: "सुनना बंद करें",
      cardWater: "पानी",
      cardReason: "यह क्यों उपयुक्त है",
      cardSoil: "उपयुक्त मिट्टी",
      genericAiError: "AI सुझाव नहीं मिल सके। कृपया फिर से कोशिश करें।",
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
      liveMode: "Gemini live advisory",
      offlineMode: "Offline advisory mode",
      languageMeta: "Hinglish",
      seasonMeta: (season) => `${season} season`,
      optionsMeta: (count) => `${count} crop options`,
      fallbackDisclaimer: "Abhi Gemini rate-limited hai, isliye ye recommendations local fallback se aaye hain. Nazdeeki agriculture expert se verify kar lo.",
      liveDisclaimer: "AI-generated recommendations. Final decision se pehle local agricultural expert se verify kar lo.",
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
    liveMode: "Gemini live advisory",
    offlineMode: "Offline advisory mode",
    languageMeta: "English",
    seasonMeta: (season) => `${season} season`,
    optionsMeta: (count) => `${count} crop options`,
    fallbackDisclaimer: "Gemini is rate-limited right now, so these recommendations use the local advisory fallback. Validate with nearby agricultural experts.",
    liveDisclaimer: "AI-generated recommendations. Always validate with local agricultural experts.",
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
      if (normalized === "high") return "उच्च";
      if (normalized === "medium") return "मध्यम";
      if (normalized === "low") return "कम";
    }
    if (kind === "fit") {
      if (normalized === "perfect") return "बेहतरीन";
      if (normalized === "good") return "अच्छा";
      if (normalized === "poor") return "कमज़ोर";
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
  const ui = getCropUi(language);
  if (score >= 85) return { label: ui.suitabilityHigh, tone: "high", note: ui.suitabilityHighNote };
  if (score >= 65) return { label: ui.suitabilityMid, tone: "mid", note: ui.suitabilityMidNote };
  return { label: ui.suitabilityLow, tone: "low", note: ui.suitabilityLowNote };
}

function getLocalizedSeasons(language = "english") {
  if (language === "hindi") {
    return [
      { value:"Kharif", label:"खरीफ", desc:"जून - अक्तूबर · मानसून", icon:"🌧" },
      { value:"Rabi",   label:"रबी",   desc:"नवंबर - अप्रैल · सर्दी", icon:"❄"  },
      { value:"Zaid",   label:"ज़ायद", desc:"मार्च - जून · गर्मी", icon:"☀"  },
    ];
  }

  if (language === "hinglish") {
    return [
      { value:"Kharif", label:"Kharif", desc:"Jun - Oct · Monsoon", icon:"🌧" },
      { value:"Rabi",   label:"Rabi",   desc:"Nov - Apr · Winter", icon:"❄"  },
      { value:"Zaid",   label:"Zaid",   desc:"Mar - Jun · Summer", icon:"☀"  },
    ];
  }

  return SEASONS;
}

function getCropUi(language = "english") {
  if (language === "hindi") {
    return {
      retry: "फिर कोशिश करें",
      autoFillWeather: "मौसम से ऑटो-फिल",
      autoFillPlaceholder: "शहर लिखें (जैसे दिल्ली, मुंबई...)",
      autoFillLoading: "लाया जा रहा है...",
      autoFillAction: "ऑटो-फिल",
      optionalContext: "अतिरिक्त संदर्भ",
      regionLabel: "क्षेत्र या राज्य",
      regionHint: "स्थानीय संदर्भ वैकल्पिक है",
      farmerProfile: "किसान प्रोफ़ाइल",
      farmerName: "किसान का नाम",
      farmName: "खेत का नाम",
      defaultRegion: "डिफ़ॉल्ट क्षेत्र",
      preferredLanguage: "पसंदीदा भाषा",
      saveProfile: "प्रोफ़ाइल सहेजें",
      applyProfile: "फ़ॉर्म में भरें",
      clearProfile: "साफ़ करें",
      soilClimate: "मिट्टी और जलवायु मानक",
      analysePredict: "विश्लेषण करें और सुझाव पाएँ",
      readyToPredict: "सुझाव के लिए तैयार",
      reviewValues: "आगे बढ़ने से पहले हाइलाइट किए गए मान जाँचें",
      fieldsRemaining: (count) => `${count} फ़ील्ड बाकी`,
      requestTimedOut: "रिक्वेस्ट में समय लग गया। कृपया फिर से कोशिश करें।",
      unableToReach: "सर्वर से जुड़ नहीं पाया। कृपया फिर से कोशिश करें।",
      mlRecommendedCrop: "ML द्वारा सुझाई गई फसल",
      confidence: "विश्वास",
      share: "शेयर",
      supportedBy: "समर्थित मॉडल",
      lowConfidence: "कम विश्वास - मॉडल सहमत नहीं हैं। कृपया मैन्युअली जाँचें।",
      alternative: "विकल्प",
      topSuggestions: "शीर्ष सुझाव",
      whyThisCrop: "यह फसल क्यों",
      regionSeasonContext: "क्षेत्र और मौसम संदर्भ",
      region: "क्षेत्र",
      season: "मौसम",
      cropCalendar: "फसल कैलेंडर",
      modelBreakdown: "मॉडल विवरण",
      winner: "विजेता",
      downloadResult: "रिज़ल्ट डाउनलोड करें",
      goToFertilizer: "उर्वरक सुझाव पर जाएँ",
      backToPrediction: "सुझाव पर वापस जाएँ",
      soilGaugeLabel: "मिट्टी की सेहत",
      supportedByPrefix: "समर्थन मिला",
      yourInputsIdeal: "आपकी मिट्टी बनाम आदर्श मान",
      modelConsensus: "मॉडल सहमति",
      allAgree: "सभी मॉडल सहमत हैं",
      dotCloser: "बिंदु सहमत मॉडल की ओर है",
      sow: "बुवाई",
      growing: "बढ़वार",
      harvest: "कटाई",
      yourInputs: "आपके इनपुट",
      idealRange: "आदर्श सीमा",
      soilGood: "अच्छा",
      soilFair: "सामान्य",
      soilPoor: "कमज़ोर",
      soilGreatTip: "मिट्टी का संतुलन अच्छा है",
      soilNeedsAttentionTip: "कुछ पोषक तत्वों पर ध्यान देने की ज़रूरत है",
      soilNeedsImprovementTip: "मिट्टी में सुधार की ज़रूरत है",
      suitabilityHigh: "बहुत उपयुक्त",
      suitabilityMid: "मध्यम रूप से उपयुक्त",
      suitabilityLow: "सावधानी बरतें",
      suitabilityHighNote: "यह सुझाव आपकी मौजूदा परिस्थितियों से अच्छी तरह मेल खाता है।",
      suitabilityMidNote: "सुझाव ठीक है, लेकिन कुछ स्थितियों पर नज़र रखना बेहतर रहेगा।",
      suitabilityLowNote: "इस नतीजे को सावधानी से लें और खेत की स्थिति जाँचकर ही आगे बढ़ें।",
      required: "ज़रूरी",
      enterCity: "कृपया शहर लिखें",
      importPlaceholder: "अपनी मिट्टी की लैब रिपोर्ट यहाँ पेस्ट करें...\nउदाहरण:\nNitrogen: 90\nPhosphorous: 42\nPotassium: 43\npH: 6.5",
      importDetect: "मान पहचानें",
      importFound: "मिले हुए मान",
      importApply: "फ़ॉर्म में भरें",
      importNotFound: "मान पहचान नहीं पाए। कोई दूसरा फ़ॉर्मेट आज़माएँ।",
      noDescription: "विवरण उपलब्ध नहीं है।",
      pasteLabReport: "लैब रिपोर्ट पेस्ट करें",
      loadError: "शहर से मौसम डेटा नहीं मिला।",
      weatherFetchFailed: "मौसम डेटा नहीं मिल पाया।",
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
      { value: "Hindi", label: "हिन्दी" },
      { value: "Hinglish", label: "हिंग्लिश" },
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
      N: { label: "नाइट्रोजन", explainer: "नाइट्रोजन पत्तियों की बढ़वार और हरियाली के लिए ज़रूरी है। कमी होने पर पत्ते पीले पड़ते हैं।" },
      P: { label: "फॉस्फोरस", explainer: "फॉस्फोरस जड़ों और शुरुआती बढ़वार में मदद करता है। फल और फूल के लिए भी अहम है।" },
      K: { label: "पोटैशियम", explainer: "पोटैशियम पानी के संतुलन और रोग-प्रतिरोधक क्षमता को बेहतर बनाता है।" },
      temperature: { label: "तापमान", explainer: "औसत दिन का तापमान। अधिकतर फसलें 15 से 30 डिग्री सेल्सियस में बेहतर बढ़ती हैं।" },
      humidity: { label: "नमी", explainer: "हवा की आर्द्रता। बहुत अधिक नमी से फफूंदी बढ़ सकती है और कम नमी से पौधे मुरझा सकते हैं।" },
      ph: { label: "मिट्टी का pH", explainer: "अधिकतर फसलों के लिए pH 6 से 7.5 अच्छा माना जाता है।" },
      rainfall: { label: "वर्षा", explainer: "मौसमी या वार्षिक वर्षा की मात्रा। इससे सिंचाई की ज़रूरत समझने में मदद मिलती है।" },
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
    if (zone === "ok") return "संतुलित";
    if (zone === "high") return "ऊँचा";
    return "कम";
  }
  if (language === "hinglish") {
    if (zone === "ok") return "Balanced";
    if (zone === "high") return "High";
    return "Low";
  }
  if (zone === "ok") return "ok";
  return zone;
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
  const ui = getAdvisorUi(language);

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

// ─── ML result view ───────────────────────────────────────────────────────────
function MLResult({ predictionData, formData, onBack }) {
  const history = useHistory();
  const { language } = useLanguage();
  const ui = getCropUi(language);
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
  const reasonHighlights = getCropReasonHighlights(formData, finalLabel, language);

  const confClass = finalConf >= 80 ? 'high' : finalConf >= 60 ? 'mid' : 'low';
  const suitability = getSuitabilityMeta(finalConf, language);
  const localizedSeasons = getLocalizedSeasons(language);
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
              {finalConf.toFixed(2)}% {ui.confidence} · {modelUsed}
            </div>
            <button className="cr-share-btn" onClick={handleShare} aria-label={ui.share}>{ui.share} ↗</button>
          </div>
        </div>
      </div>

      <div className="cr-result__body">
        <div className={`cr-suitability-banner cr-suitability-banner--${suitability.tone}`}>
          <strong>{suitability.label}</strong>
          <span>{suitability.note}</span>
        </div>
        {agreeingModels.length > 0 && (
          <div className="cr-agree-row">
            <span className="cr-agree-row__icon" aria-hidden="true">✓</span>
            <span>{ui.supportedByPrefix} <strong>{agreeingModels.join(', ')}</strong></span>
          </div>
        )}
        {finalConf < 60 && <div className="cr-warning" role="alert">⚠ {ui.lowConfidence}</div>}
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
                {m.label === finalLabel && <span className="cr-model-badge__crown">★ {ui.winner}</span>}
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

// ─── ML panel ─────────────────────────────────────────────────────────────────
function MLPanel() {
  const { language } = useLanguage();
  const ui = getCropUi(language);
  const localizedSeasons = getLocalizedSeasons(language);
  const profileLanguageOptions = getProfileLanguageOptions(language);
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
  const localizedFieldMeta = getLocalizedFieldMeta(language);
  const localizedFields = FIELDS.map((field) => ({
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
      const response = await api.post("/predict_crop", {
        N:           parseFloat(formData.N),
        P:           parseFloat(formData.P),
        K:           parseFloat(formData.K),
        temperature: parseFloat(formData.temperature),
        humidity:    parseFloat(formData.humidity),
        ph:          parseFloat(formData.ph),
        rainfall:    parseFloat(formData.rainfall),
      });
      const result = response.data;
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
          <span className="cr-alert__icon" aria-hidden="true">⚠</span>
          <span>{predictionData.error}</span>
          <button className="cr-alert__retry" onClick={() => setPredictionData({})}>{ui.retry} ↺</button>
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
          {loadingWeather ? ui.autoFillLoading : `📍 ${ui.autoFillAction}`}
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
              <input className="cr-field__input" id="farmerName" type="text" value={profileForm.farmerName} onChange={handleProfileChange} placeholder=" " autoComplete="off" />
              <label className="cr-floating-label" htmlFor="farmerName">{ui.farmerName}</label>
            </div>
          </div>

          <div className="cr-field">
            <div className="cr-field__icon" aria-hidden="true">FM</div>
            <div className="cr-field__inner">
              <input className="cr-field__input" id="farmName" type="text" value={profileForm.farmName} onChange={handleProfileChange} placeholder=" " autoComplete="off" />
              <label className="cr-floating-label" htmlFor="farmName">{ui.farmName}</label>
            </div>
          </div>

          <div className="cr-field">
            <div className="cr-field__icon" aria-hidden="true">RG</div>
            <div className="cr-field__inner">
              <input className="cr-field__input" id="profileRegion" type="text" value={profileForm.region} onChange={handleProfileChange} placeholder=" " autoComplete="off" />
              <label className="cr-floating-label" htmlFor="profileRegion">{ui.defaultRegion}</label>
            </div>
          </div>

          <div className="cr-field">
            <div className="cr-field__icon" aria-hidden="true">LG</div>
            <div className="cr-field__inner">
              <label className="cr-floating-label cr-floating-label--active" htmlFor="profileLanguage">{ui.preferredLanguage}</label>
              <div className="cr-profile-language-group" id="profileLanguage" role="group" aria-label={ui.preferredLanguage}>
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

// ─── AI advisor ───────────────────────────────────────────────────────────────
function isFallbackCrop(crop) {
  return crop.source === 'fallback' || /rule-based fallback/i.test(crop.reason || '');
}

function cleanAdviceReason(reason) {
  return (reason || '').replace(/^Rule-based fallback(?:\s+for\s+[^:]+)?:\s*/i, '');
}

function AICropCard({ crop, index, language }) {
  const ui = getAdvisorUi(language);
  const cropKey = crop.crop?.toLowerCase().replace(/\(.*?\)/g,"").replace(/\s+/g,"").replace(/[^a-z]/g,"").trim();
  const imgSrc  = CROP_IMAGE_MAP[cropKey] || null;
  const confColor = crop.confidence === 'High' ? 'high' : crop.confidence === 'Medium' ? 'mid' : 'low';
  const fitColor  = crop.season_fit  === 'Perfect' ? 'high' : crop.season_fit === 'Good' ? 'mid' : 'low';
  const fallback = isFallbackCrop(crop);
  const reason = cleanAdviceReason(crop.reason);
  const confidenceLabel = localizeAdvisorScale(crop.confidence, language, "confidence");
  const fitLabel = localizeAdvisorScale(crop.season_fit, language, "fit");
  const sourceLabel = fallback ? (language === "hindi" ? "ऑफ़लाइन" : "Offline") : "Gemini";

  return (
  <div className={`ai-card${fallback ? ' ai-card--fallback' : ''}`} style={{ animationDelay: `${index * 120}ms` }}>
    
    <div className="ai-card__rank">#{index + 1}</div>
    <div className="ai-card__source">{sourceLabel}</div>

    <div className="ai-card__img-wrap">
      {imgSrc ? (
        <img src={imgSrc} alt={crop.crop} className="ai-card__img" />
      ) : (
        <div className="ai-card__img-placeholder"><span className="ai-card__img-placeholder-icon">Crop</span></div>
      )}
      <div className="ai-card__img-overlay" />
      <div className="ai-card__img-label">{crop.crop}</div>
    </div>

    <div className="ai-card__body">
      
      <div className="ai-card__pills">
        <span className={`ai-pill ai-pill--${confColor}`}>
          {confidenceLabel} {language === "hindi" ? "विश्वास" : "confidence"}
        </span>
        <span className={`ai-pill ai-pill--${fitColor}`}>
          {fitLabel} {language === "hindi" ? "मेल" : "fit"}
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

// ─── #11 AI follow-up chat ────────────────────────────────────────────────────
function getFollowUpSuggestions(cropContext, language) {
  const primaryCrop = cropContext.crops?.[0] || 'this crop';
  if (language === 'hindi') {
    return [
      `${primaryCrop} की सिंचाई कैसे करूं?`,
      `${cropContext.area} में किस फसल की मांग बेहतर है?`,
      'कौन से कीटों से सावधान रहना चाहिए?',
      `${primaryCrop} के साथ कौन सी फसल लगा सकते हैं?`,
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
  const ui = getAdvisorUi(language);

  const suggestions = getFollowUpSuggestions(cropContext, language);

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
        { role: "assistant", content: reply }
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

// ─── AI advisor panel ─────────────────────────────────────────────────────────
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
  const ui = getAdvisorUi(language);
  const localizedSeasons = getLocalizedSeasons(language);

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
    const cropContext = { area, season, crops:aiResults.map(c=>c.crop) };
    const fallbackMode = aiResults.some(isFallbackCrop);
    const modeLabel = fallbackMode ? ui.offlineMode : ui.liveMode;
    return (
      <div className="ai-results">
        <div className="ai-results__header">
          <div>
            <div className="cr-section-label">{ui.resultsLabel(season)}</div>
            <h2 className="ai-results__title">{ui.resultsTitle(area)}</h2>
          </div>
          <button className="cr-btn cr-btn--ghost ai-results__back" onClick={() => { setAiResults(null); setArea(''); setSeason(''); setError(''); }}>
            {ui.backToForm}
          </button>
        </div>
        <div className="ai-results__meta" aria-label="Recommendation summary">
          <span>{modeLabel}</span>
          <span>{ui.languageMeta}</span>
          <span>{ui.seasonMeta(season)}</span>
          <span>{ui.optionsMeta(aiResults.length)}</span>
        </div>
        <div className="ai-results__disclaimer">
          <span className="ai-results__disclaimer-icon" aria-hidden="true">AI</span>
          {fallbackMode
            ? ui.fallbackDisclaimer
            : ui.liveDisclaimer}
        </div>
        <div className="ai-cards-grid">
          {aiResults.map((crop,i) => <AICropCard key={i} crop={crop} index={i} language={language}/>)}
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

// ─── Root component ───────────────────────────────────────────────────────────
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







