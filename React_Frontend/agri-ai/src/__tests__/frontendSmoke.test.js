import React from "react";
import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CropRecommender from "../components/CropRecommender";
import PredictionHistory from "../components/PredictionHistory";
import AIResultsPanel from "../components/crop/AIResultsPanel";
import { LanguageProvider } from "../context/LanguageContext";

const mockGetPredictionHistory = jest.fn();
const mockClearPredictionHistory = jest.fn();

jest.mock("../components/crop/CropMlPanel", () => function CropMlPanelMock() {
  return <div>ML Panel Mock</div>;
});

jest.mock("../components/crop/CropAiAdvisorPanel", () => function CropAiAdvisorPanelMock() {
  return <div>AI Panel Mock</div>;
});

jest.mock("../components/crop/AIFollowUpChat", () => function AIFollowUpChatMock() {
  return <div data-testid="ai-followup-chat">Follow-up Chat Mock</div>;
});

jest.mock("../utils/predictionHistory", () => ({
  clearPredictionHistory: (...args) => mockClearPredictionHistory(...args),
  getPredictionHistory: (...args) => mockGetPredictionHistory(...args),
}));

function renderWithProviders(ui) {
  window.localStorage.setItem("cw-language", "english");

  return render(
    <MemoryRouter>
      <LanguageProvider>{ui}</LanguageProvider>
    </MemoryRouter>
  );
}

describe("frontend smoke coverage", () => {
  beforeEach(() => {
    mockGetPredictionHistory.mockReset();
    mockGetPredictionHistory.mockReturnValue([]);
    mockClearPredictionHistory.mockReset();
    window.localStorage.clear();
  });

  test("renders the crop page shell and switches from ML to AI tab", async () => {
    renderWithProviders(<CropRecommender />);

    expect(screen.getByRole("heading", { name: "Crop Recommender" })).toBeInTheDocument();
    expect(screen.getByText("ML Panel Mock")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("tab", { name: /ai advisor/i }));

    expect(screen.getByText("AI Panel Mock")).toBeInTheDocument();
  });

  test("renders a live AI result state with crop cards", () => {
    renderWithProviders(
      <AIResultsPanel
        aiResults={{
          items: [
            {
              crop: "Wheat",
              confidence: "High",
              season_fit: "Perfect",
              water_need: "Medium",
              soil_type: "Alluvial Loamy",
              reason: "Well suited to the current regional and seasonal conditions.",
              source: "gemini",
            },
            {
              crop: "Mustard",
              confidence: "Medium",
              season_fit: "Good",
              water_need: "Low",
              soil_type: "Sandy Loam",
              reason: "Good fit for cooler conditions with modest water need.",
              source: "gemini",
            },
          ],
          meta: {
            mode: "live",
            source: "gemini",
          },
        }}
        area="Kharar"
        season="Rabi"
        language="english"
        onRetry={jest.fn()}
        onBackToForm={jest.fn()}
      />
    );

    expect(screen.getByRole("heading", { name: "Top crops for Kharar" })).toBeInTheDocument();
    expect(screen.getByText("Live AI advisory")).toBeInTheDocument();
    expect(screen.getByText("Wheat")).toBeInTheDocument();
    expect(screen.getByText("Mustard")).toBeInTheDocument();
    expect(screen.getByTestId("ai-followup-chat")).toBeInTheDocument();
  });

  test("renders the AI fallback badge when local advisory is used", () => {
    renderWithProviders(
      <AIResultsPanel
        aiResults={{
          items: [
            {
              crop: "Chickpea",
              confidence: "Medium",
              season_fit: "Good",
              water_need: "Low",
              soil_type: "Loamy",
              reason: "Rule-based fallback: Suitable pulse option for the selected season.",
              source: "fallback",
            },
          ],
          meta: {
            mode: "fallback",
            source: "local-fallback",
          },
        }}
        area="Punjab"
        season="Rabi"
        language="english"
        onRetry={jest.fn()}
        onBackToForm={jest.fn()}
      />
    );

    expect(screen.getByText("Local advisory backup")).toBeInTheDocument();
    expect(
      screen.getByText(/these suggestions are coming from the local advisory backup/i)
    ).toBeInTheDocument();
  });

  test("renders the history empty state when no entries exist", () => {
    mockGetPredictionHistory.mockReturnValue([]);

    renderWithProviders(<PredictionHistory />);

    expect(screen.getByRole("heading", { name: "Prediction History" })).toBeInTheDocument();
    expect(screen.getByText("No saved predictions yet")).toBeInTheDocument();
    expect(
      screen.getByText("Run a crop or fertilizer prediction and it will show up here automatically.")
    ).toBeInTheDocument();
  });

  test("renders the history populated state when entries exist", () => {
    mockGetPredictionHistory.mockReturnValue([
      {
        id: "crop-1",
        type: "crop",
        result: "Mango Crop",
        confidence: 32.78,
        createdAt: "2026-05-25T10:00:00.000Z",
        inputs: {
          N: 39,
          P: 29,
          K: 59,
          temperature: 14.7,
          humidity: 36,
          ph: 2.4,
          rainfall: 59.7,
        },
      },
    ]);

    renderWithProviders(<PredictionHistory />);

    expect(screen.getAllByText("Mango Crop").length).toBeGreaterThan(0);
    expect(screen.getByText("Crop Prediction")).toBeInTheDocument();
    expect(screen.getByText("Total Saved")).toBeInTheDocument();
    expect(screen.getByText("32.8%")).toBeInTheDocument();
  });
});
