import api from "./recommenderapi";

export function buildCropPredictionPayload(formData) {
  return {
    N: parseFloat(formData.N),
    P: parseFloat(formData.P),
    K: parseFloat(formData.K),
    temperature: parseFloat(formData.temperature),
    humidity: parseFloat(formData.humidity),
    ph: parseFloat(formData.ph),
    rainfall: parseFloat(formData.rainfall),
  };
}

export async function predictCrop(formData) {
  const response = await api.post("/predict_crop", buildCropPredictionPayload(formData));
  return response.data;
}

export async function predictFertilizer(payload) {
  const response = await api.post("/predict_fertilizer", payload, {
    headers: { "Content-Type": "application/json" },
    timeout: 8000,
  });
  return response.data;
}
