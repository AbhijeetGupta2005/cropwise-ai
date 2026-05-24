import apple from "../images/crop/apple.jpg";
import banana from "../images/crop/banana.jpg";
import blackgram from "../images/crop/blackgram.jpg";
import chickpea from "../images/crop/chickpea.jpg";
import coconut from "../images/crop/coconut.jpg";
import coffee from "../images/crop/coffee.png";
import cotton from "../images/crop/cotton.png";
import grape from "../images/crop/grape.png";
import jute from "../images/crop/jute.jpg";
import kidneybeans from "../images/crop/kidneybeans.jpg";
import lentil from "../images/crop/lentil.jpg";
import maize from "../images/crop/maize.jpg";
import mango from "../images/crop/mango.jpg";
import mothbean from "../images/crop/mothbean.jpg";
import mungbean from "../images/crop/mungbean.jpg";
import muskmelon from "../images/crop/muskmelon.jpg";
import orange from "../images/crop/orange.jpg";
import papaya from "../images/crop/papaya.jpg";
import pigeonpeas from "../images/crop/pigeonpeas.jpg";
import pomegranate from "../images/crop/pomegranate.jpg";
import rice from "../images/crop/rice.jpg";
import watermelon from "../images/crop/watermelon.jpg";

export const FIELDS = [
  { id: "N", label: "Nitrogen", hint: "0 - 140", unit: "ratio", icon: "N", min: 0, max: 140, step: 1, explainer: "Nitrogen fuels leafy growth and chlorophyll. Low N can cause yellow leaves and stunted plants." },
  { id: "P", label: "Phosphorous", hint: "0 - 140", unit: "ratio", icon: "P", min: 0, max: 140, step: 1, explainer: "Phosphorous supports root development and fruiting, especially during early growth stages." },
  { id: "K", label: "Potassium", hint: "0 - 205", unit: "ratio", icon: "K", min: 0, max: 205, step: 1, explainer: "Potassium regulates water uptake and disease resistance and helps build stronger stems." },
  { id: "temperature", label: "Temperature", hint: "8 - 44 deg C", unit: "deg C", icon: "T", min: 8, max: 44, step: 0.1, explainer: "Average daytime temperature. Most crops grow best between 15 and 30 deg C." },
  { id: "humidity", label: "Humidity", hint: "14 - 100 %", unit: "%", icon: "H", min: 14, max: 100, step: 0.1, explainer: "Relative air humidity. High humidity can favour fungi, while low humidity can cause wilting." },
  { id: "ph", label: "Soil pH", hint: "0 - 14", unit: "pH", icon: "pH", min: 0, max: 14, step: 0.1, explainer: "pH 6 to 7.5 suits most crops. Acidic or alkaline soil can limit nutrient uptake." },
  { id: "rainfall", label: "Rainfall", hint: "20 - 300 mm", unit: "mm", icon: "R", min: 20, max: 300, step: 0.1, explainer: "Annual or seasonal rainfall helps determine irrigation need and crop water budget." },
];

export const INITIAL_FORM = {
  ...FIELDS.reduce((acc, field) => ({ ...acc, [field.id]: "" }), {}),
  season: "",
  region: "",
};

export const CROP_IDEAL_RANGES = {
  rice: { N: [80, 120], P: [40, 60], K: [40, 60], temperature: [22, 28], humidity: [80, 95], ph: [5.5, 7], rainfall: [150, 300] },
  maize: { N: [80, 110], P: [40, 70], K: [35, 55], temperature: [18, 27], humidity: [55, 80], ph: [5.8, 7.5], rainfall: [60, 110] },
  wheat: { N: [60, 120], P: [30, 60], K: [30, 50], temperature: [12, 25], humidity: [50, 70], ph: [6, 7.5], rainfall: [50, 100] },
  cotton: { N: [80, 120], P: [40, 70], K: [40, 70], temperature: [21, 37], humidity: [50, 70], ph: [5.8, 8], rainfall: [50, 100] },
  mango: { N: [40, 80], P: [20, 40], K: [40, 60], temperature: [24, 30], humidity: [50, 60], ph: [5.5, 7.5], rainfall: [75, 125] },
  banana: { N: [100, 140], P: [50, 80], K: [100, 150], temperature: [26, 30], humidity: [75, 85], ph: [5.5, 6.5], rainfall: [100, 200] },
  apple: { N: [20, 60], P: [10, 30], K: [20, 60], temperature: [5, 20], humidity: [70, 90], ph: [5.5, 6.5], rainfall: [100, 125] },
  chickpea: { N: [20, 40], P: [40, 60], K: [20, 40], temperature: [15, 25], humidity: [40, 60], ph: [6, 7.5], rainfall: [40, 75] },
  lentil: { N: [20, 40], P: [30, 50], K: [15, 30], temperature: [15, 25], humidity: [40, 60], ph: [6, 7], rainfall: [30, 60] },
  watermelon: { N: [50, 80], P: [30, 50], K: [50, 80], temperature: [25, 35], humidity: [50, 70], ph: [6, 7], rainfall: [40, 80] },
};

export const CROP_CALENDAR = {
  rice: { sow: [5, 6], grow: [6, 9], harvest: [9, 10], label: "Jun-Oct" },
  maize: { sow: [5, 6], grow: [6, 8], harvest: [8, 9], label: "Jun-Sep" },
  wheat: { sow: [10, 11], grow: [11, 2], harvest: [3, 4], label: "Nov-Apr" },
  cotton: { sow: [4, 5], grow: [5, 9], harvest: [9, 11], label: "May-Nov" },
  mango: { sow: [6, 7], grow: [7, 11], harvest: [3, 5], label: "Mar-May" },
  banana: { sow: [5, 7], grow: [7, 4], harvest: [4, 5], label: "Year-round" },
  apple: { sow: [1, 2], grow: [2, 9], harvest: [9, 10], label: "Sep-Oct" },
  chickpea: { sow: [10, 11], grow: [11, 2], harvest: [2, 3], label: "Feb-Mar" },
  lentil: { sow: [10, 11], grow: [11, 2], harvest: [3, 4], label: "Mar-Apr" },
  watermelon: { sow: [2, 3], grow: [3, 5], harvest: [5, 6], label: "May-Jun" },
  muskmelon: { sow: [2, 3], grow: [3, 5], harvest: [5, 6], label: "May-Jun" },
};

export const SEASONS = [
  { value: "Kharif", label: "Kharif", desc: "Jun - Oct | Monsoon", icon: "Monsoon" },
  { value: "Rabi", label: "Rabi", desc: "Nov - Apr | Winter", icon: "Winter" },
  { value: "Zaid", label: "Zaid", desc: "Mar - Jun | Summer", icon: "Summer" },
];

export function sanitizeDisplayText(value) {
  return String(value ?? "")
    .replace(/Ã¢â‚¬â€œ/g, "-")
    .replace(/Ã‚Â°C/g, "deg C")
    .replace(/Ã¢â‚¬Â¦/g, "...")
    .replace(/Ã‚/g, "")
    .replace(/Ã¢â‚¬â„¢/g, "'")
    .replace(/Ã¢â‚¬Ëœ/g, "'")
    .replace(/Ã¢â‚¬Å“/g, '"')
    .replace(/Ã¢â‚¬Â/g, '"')
    .replace(/Ã¢â‚¬Â¢/g, "|");
}

export const DISPLAY_FIELDS = FIELDS.map((field) => ({
  ...field,
  hint: sanitizeDisplayText(field.hint),
  unit: sanitizeDisplayText(field.unit),
  explainer: sanitizeDisplayText(field.explainer),
}));

export const DISPLAY_CROP_CALENDAR = Object.fromEntries(
  Object.entries(CROP_CALENDAR).map(([key, value]) => [
    key,
    { ...value, label: sanitizeDisplayText(value.label) },
  ]),
);

export const DISPLAY_SEASONS = SEASONS.map((season) => ({
  ...season,
  desc: sanitizeDisplayText(season.desc),
}));

export const ADVISOR_LANGUAGES = [
  { value: "english", label: "English", hint: "Simple" },
  { value: "hindi", label: "Hindi", hint: "Hindi" },
  { value: "hinglish", label: "Hinglish", hint: "Hindi + English" },
];

export const CROP_IMAGE_MAP = {
  apple,
  banana,
  blackgram,
  chickpea,
  coconut,
  coffee,
  cotton,
  grape,
  jute,
  kidneybeans,
  lentil,
  maize,
  mango,
  mothbean,
  mungbean,
  muskmelon,
  orange,
  papaya,
  pigeonpeas,
  pomegranate,
  rice,
  watermelon,
};

export const MODEL_WEIGHTS = { xgb: 0.4, rf: 0.35, knn: 0.25 };

export function weightedVote(xgbLabel, rfLabel, knnLabel, xgbConf, rfConf, knnConf) {
  const scores = {};
  const add = (label, weight, confidence) => {
    scores[label] = (scores[label] || 0) + weight * Math.min(100, Math.max(0, confidence));
  };

  add(xgbLabel, MODEL_WEIGHTS.xgb, xgbConf);
  add(rfLabel, MODEL_WEIGHTS.rf, rfConf);
  add(knnLabel, MODEL_WEIGHTS.knn, knnConf);

  return Object.keys(scores).reduce((best, current) => (scores[best] > scores[current] ? best : current));
}

export const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
