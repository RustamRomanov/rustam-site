// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

/* Локальный шрифт (MontserratLocal 900) */
import "./style/fonts.css";

/* Базовые стили проекта */
import "./style/index.css";

/* Находим/создаём корневой контейнер */
let rootEl = document.getElementById("root");
if (!rootEl) {
  rootEl = document.createElement("div");
  rootEl.id = "root";
  document.body.appendChild(rootEl);
}

/* Рендер приложения */
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

/* Vite HMR (не обязательно, но полезно во время разработки) */
// if (import.meta && import.meta.hot) {
//   import.meta.hot.accept();
// }
