import { HashRouter, Routes, Route } from "react-router-dom";
import Layout from "./Layout";
import Home from "./components/Home";
import Players from "./components/Players";
import Training from "./components/Training";
import Leaderboard from "./components/Leaderboard";
import Games from "./components/Games";
import AuthProvider from "./AuthProvider";
import FeedbackProvider from "./ui/FeedbackProvider";

export default function App() {
  return (
    <AuthProvider>
      <FeedbackProvider>
        <HashRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/players" element={<Players />} />
              <Route path="/training" element={<Training />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/games" element={<Games />} />
            </Routes>
          </Layout>
        </HashRouter>
      </FeedbackProvider>
    </AuthProvider>
  );
}
