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

function inferRecommendationMeta(items = []) {
  const fallback = items.some(
    (item) => item?.source === "fallback" || item?.source === "local-fallback"
  );

  return {
    mode: fallback ? "fallback" : "live",
    source: fallback ? "local-fallback" : "gemini",
  };
}

function normalizeRecommendationPayload(data) {
  if (Array.isArray(data)) {
    return {
      items: data,
      meta: inferRecommendationMeta(data),
    };
  }

  if (Array.isArray(data?.items)) {
    return {
      items: data.items,
      meta: {
        ...inferRecommendationMeta(data.items),
        ...(data.meta || {}),
      },
    };
  }

  const parsed = extractJSON(data);
  return {
    items: Array.isArray(parsed) ? parsed : [],
    meta: inferRecommendationMeta(Array.isArray(parsed) ? parsed : []),
  };
}

function normalizeFollowUpPayload(data) {
  const fallbackPattern = /gemini quota|temporarily unavailable|temporarily busy|local agriculture extension officer|local agriculture officer/i;

  if (typeof data === "string") {
    const fallback = fallbackPattern.test(data);
    return {
      reply: data,
      meta: {
        mode: fallback ? "fallback" : "live",
        source: fallback ? "local-fallback" : "gemini",
      },
    };
  }

  const reply = String(data?.reply || "Sorry, no response from AI.");
  const fallback = data?.meta?.mode === "fallback" || data?.meta?.source === "local-fallback" || fallbackPattern.test(reply);

  return {
    reply,
    meta: {
      mode: data?.meta?.mode || (fallback ? "fallback" : "live"),
      source: data?.meta?.source || (fallback ? "local-fallback" : "gemini"),
      ...(data?.meta || {}),
    },
  };
}

export async function getAICropRecommendation(area, season, language = "english") {
  try {
    const response = await api.post("/ai-recommend", { area, season, language });
    return normalizeRecommendationPayload(response.data);
  } catch (error) {
    throw new Error(
      error.response?.data?.error ||
      "Failed to get AI recommendation. Please try again."
    );
  }
}

export async function getAICropFollowUp(context, history, language = "english") {
  try {
    const response = await api.post("/ai-follow-up", { context, history, language });
    return normalizeFollowUpPayload(response.data);
  } catch (error) {
    throw new Error(
      error.response?.data?.error ||
      "Failed to get an AI answer. Please try again."
    );
  }
}
