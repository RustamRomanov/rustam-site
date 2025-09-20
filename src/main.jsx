// src/main.jsx
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

// Глобальные стили (у тебя есть эти файлы в src/style/)
import "./style/index.css";
import "./style/fonts.css";
import "./style/App.css";     // если нужен
import "./style/animations.css"; // если нужен

const rootEl = document.getElementById("root");
createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
