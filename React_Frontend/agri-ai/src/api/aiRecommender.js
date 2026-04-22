import api from "./recommenderapi";

function extractJSON(text) {
  if (!text) return [];

  try {
    return JSON.parse(text);
  } catch {
    const cleaned = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    try {
      return JSON.parse(cleaned);
    } catch (e) {
      console.error("JSON Parse Failed:", cleaned);
      return [];
    }
  }
}

export async function getAICropRecommendation(area, season, language = "english") {
  try {
    const response = await api.post("/ai-recommend", { area, season, language });
    return Array.isArray(response.data) ? response.data : extractJSON(response.data);
  } catch (error) {
    throw new Error(
      error.response?.data?.error ||
      "Failed to get AI recommendation. Please try again."
    );
  }
}

function formatAIResponse(text) {
  if (!text) return "";

  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/(\d+\.\s)/g, "<br/><br/><strong>$1</strong>")
    .replace(/\*\s/g, "<br/>• ")
    .replace(/\n/g, "<br/>")
    .replace(/(<br\/>){3,}/g, "<br/><br/>");
}

export async function getAICropFollowUp(context, history, language = "english") {
  try {
    const response = await api.post("/ai-follow-up", { context, history, language });
    return formatAIResponse(response.data?.reply || "Sorry, no response from AI.");
  } catch (error) {
    throw new Error(
      error.response?.data?.error ||
      "Failed to get an AI answer. Please try again."
    );
  }
}
