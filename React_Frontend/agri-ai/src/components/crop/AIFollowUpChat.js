import React, { useRef, useState } from "react";
import { getAICropFollowUp } from "../../api/aiRecommender";
import { normalizeLocalizedCopy } from "../../utils/localization";
import { getAdvisorUi } from "../../config/cropCopy";
import { renderMessageContent } from "./CropShared";

function getFollowUpSuggestions(cropContext, language) {
  const primaryCrop = cropContext.crops?.[0] || "this crop";
  if (language === "hindi") {
    return [
      `${primaryCrop} की सिंचाई कैसे करूं?`,
      `${cropContext.area} में किस फसल की मांग बेहतर है?`,
      "कौन से कीटों से सावधान रहना चाहिए?",
      `${primaryCrop} के साथ कौन सी फसल लगा सकते हैं?`,
    ];
  }
  if (language === "hinglish") {
    return [
      `${primaryCrop} ki irrigation kaise karun?`,
      `${cropContext.area} me kis crop ki demand better hai?`,
      "Kaun se pests se bachna chahiye?",
      `${primaryCrop} ke saath intercropping kar sakte hain?`,
    ];
  }
  return [
    `How should I irrigate ${primaryCrop}?`,
    `Which option has better market demand in ${cropContext.area}?`,
    "What pests should I watch for?",
    `Can I intercrop with ${primaryCrop}?`,
  ];
}

function AIFollowUpChat({ cropContext, language }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);
  const ui = normalizeLocalizedCopy(getAdvisorUi(language));
  const suggestions = normalizeLocalizedCopy(getFollowUpSuggestions(cropContext, language));

  const send = async (text) => {
    if (!text.trim() || loading) return;
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setLoading(true);
    try {
      const updatedHistory = [...messages, { role: "user", content: text }];
      const reply = await getAICropFollowUp(cropContext, updatedHistory, language);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: reply.reply,
          mode: reply.meta?.mode || "live",
          source: reply.meta?.source || "gemini",
        },
      ]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: ui.followUpError }]);
    } finally {
      setLoading(false);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  };

  return (
    <div className="cr-followup">
      <div className="cr-section-label" style={{ marginBottom: "0.6rem" }}>
        {ui.followUpTitle}
      </div>
      {messages.length === 0 && (
        <div className="cr-followup__suggestions">
          {suggestions.map((s, i) => (
            <button key={i} className="cr-followup__suggestion" onClick={() => send(s)}>
              {s}
            </button>
          ))}
        </div>
      )}
      {messages.length > 0 && (
        <div className="cr-followup__messages">
          {messages.map((m, i) => (
            <div key={i} className={`cr-followup__msg cr-followup__msg--${m.role}`}>
              {m.role === "assistant" && m.source && (
                <div className="cr-followup__meta">{m.source === "local-fallback" ? ui.offlineMode : ui.liveMode}</div>
              )}
              {renderMessageContent(m.content)}
            </div>
          ))}
          {loading && (
            <div className="cr-followup__msg cr-followup__msg--assistant cr-followup__msg--loading">
              {ui.followUpThinking}
            </div>
          )}
          <div ref={endRef} />
        </div>
      )}
      <div className="cr-followup__input-row">
        <input
          className="cr-followup__input"
          name="followup-question"
          type="text"
          placeholder={ui.followUpPlaceholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send(input)}
          aria-label={ui.followUpTitle}
        />
        <button className="cr-followup__send" onClick={() => send(input)} disabled={!input.trim() || loading} aria-label={ui.followUpSend}>
          {ui.followUpSend}
        </button>
      </div>
    </div>
  );
}

export default AIFollowUpChat;
