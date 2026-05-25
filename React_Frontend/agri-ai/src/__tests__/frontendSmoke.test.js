import React from "react";
import { MemoryRouter, Route, Router, Switch } from "react-router-dom";
import { createMemoryHistory } from "history";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CropRecommender from "../components/CropRecommender";
import FertilizerRecommender from "../components/FertilizerRecommender";
import PredictionHistory from "../components/PredictionHistory";
import AIResultsPanel from "../components/crop/AIResultsPanel";
import CropMlResultPanel from "../components/crop/CropMlResultPanel";
import { LanguageProvider } from "../context/LanguageContext";

const mockGetPredictionHistory = jest.fn();
const mockClearPredictionHistory = jest.fn();
const mockPredictFertilizer = jest.fn();

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
  savePredictionHistory: jest.fn(),
}));

jest.mock("../api/predictions", () => ({
  predictFertilizer: (...args) => mockPredictFertilizer(...args),
}));

function renderWithProviders(ui, language = "english") {
  window.localStorage.setItem("cw-language", language);

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
    mockPredictFertilizer.mockReset();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  test("renders the crop page shell and switches from ML to AI tab", async () => {
    renderWithProviders(<CropRecommender />);

    expect(screen.getByRole("heading", { name: "Crop Recommender" })).toBeInTheDocument();
    expect(screen.getByText("ML Panel Mock")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("tab", { name: /ai advisor/i }));

    expect(screen.getByText("AI Panel Mock")).toBeInTheDocument();
  });

  test("loads Hindi copy from saved language state", () => {
    renderWithProviders(<CropRecommender />, "hindi");

    expect(screen.getByRole("heading", { name: "फसल सुझाव" })).toBeInTheDocument();
    expect(screen.getByText("दो इंजन | एक लक्ष्य: आपकी जमीन के लिए सही फसल")).toBeInTheDocument();
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

  test("renders fertilizer result flow from example data", async () => {
    mockPredictFertilizer.mockResolvedValue({
      final_prediction: "10-26-26",
      xgb_model_prediction: "10-26-26",
      rf_model_prediction: "10-26-26",
      svm_model_prediction: "Urea",
      xgb_model_probability: 97.94,
      rf_model_probability: 95.1,
      svm_model_probability: 40.3,
    });

    renderWithProviders(<FertilizerRecommender />);

    await userEvent.click(screen.getByRole("button", { name: /load example data/i }));
    await userEvent.click(screen.getByRole("button", { name: /analyse & predict/i }));

    expect(await screen.findByText("Recommended Fertilizer")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "10-26-26 Fertilizer" })).toBeInTheDocument();
    expect(screen.getAllByText(/Supported by/i).length).toBeGreaterThan(0);
  });

  test("carries crop result context into the fertilizer handoff flow", async () => {
    const history = createMemoryHistory({ initialEntries: ["/crop"] });

    render(
      <Router history={history}>
        <LanguageProvider>
          <Switch>
            <Route path="/crop">
              <CropMlResultPanel
                predictionData={{
                  final_prediction: "mango",
                  xgb_model_prediction: "mango",
                  rf_model_prediction: "mango",
                  knn_model_prediction: "mothbeans",
                  xgb_model_probability: 32.78,
                  rf_model_probability: 27.9,
                  knn_model_probability: 100,
                }}
                formData={{
                  N: 39,
                  P: 29,
                  K: 59,
                  temperature: 14.7,
                  humidity: 36,
                  ph: 2.4,
                  rainfall: 59.7,
                  region: "Punjab",
                  season: "rabi",
                }}
                onBack={jest.fn()}
              />
            </Route>
            <Route path="/fertilizer">
              <FertilizerRecommender />
            </Route>
          </Switch>
        </LanguageProvider>
      </Router>
    );

    await userEvent.click(screen.getByRole("button", { name: /go to fertilizer prediction/i }));

    expect(await screen.findByText("Continuing with Mango Crop")).toBeInTheDocument();
    expect(screen.getByText("Prefilled NPK and climate values")).toBeInTheDocument();
    expect(screen.getByText("Punjab")).toBeInTheDocument();
  });
});
