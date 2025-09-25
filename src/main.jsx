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

// === iOS full-viewport height (без скролла) ===
(function setupVvh() {
  const docEl = document.documentElement;

  function apply() {
    const vv = window.visualViewport;
    const vh = Math.round((vv?.height || window.innerHeight || 0));
    // В переменной — чистая видимая высота
    docEl.style.setProperty("--vvh", vh + "px");
  }

  apply();

  window.addEventListener("resize", apply, { passive: true });
  window.visualViewport?.addEventListener("resize", apply, { passive: true });
  window.visualViewport?.addEventListener("scroll", apply, { passive: true });
})();

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
