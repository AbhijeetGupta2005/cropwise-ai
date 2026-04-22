import { BrowserRouter as Router, Route, Switch } from "react-router-dom";

import LandingPage from "./components/LandingPage";
import CropRecommender from "./components/CropRecommender";
import FertilizerRecommender from "./components/FertilizerRecommender";
import PredictionHistory from "./components/PredictionHistory";
import LanguageSwitcher from "./components/LanguageSwitcher";
import { LanguageProvider } from "./context/LanguageContext";
import "./App.css";

function App() {
  return (
    <LanguageProvider>
      <Router>
        <Switch>
          <Route path="/" exact component={LandingPage} />
          <Route path="/crop" component={CropRecommender} />
          <Route path="/fertilizer" component={FertilizerRecommender} />
          <Route path="/history" component={PredictionHistory} />
        </Switch>
        <LanguageSwitcher />
      </Router>
    </LanguageProvider>
  );
}

export default App;
