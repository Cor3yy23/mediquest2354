import { Routes, Route, Navigate } from "react-router-dom";
import Title from "./pages/Title";
import SignIn from "./pages/SignIn";
import CreateAccount from "./pages/CreateAccount";
import Home from "./pages/Home";
import EpicCallback from "./pages/EpicCallback";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Title />} />
      <Route path="/signin" element={<SignIn />} />
      <Route path="/create-account" element={<CreateAccount />} />
      <Route path="/home" element={<Home />} />
      <Route path="/callback" element={<EpicCallback />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
