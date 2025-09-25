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

/* ----------------------------------------------------------
   iOS/мобайл: точная видимая высота без чёрных полос.
   Выставляем CSS-переменные:
   --vvh : visualViewport.height в px
   --vvw : visualViewport.width  в px (на будущее)
   И держим их актуальными при любых изменениях UI.
---------------------------------------------------------- */
(function setupVvh() {
  const docEl = document.documentElement;
  const vv = () => window.visualViewport || null;

  let raf = 0;
  const applyNow = () => {
    const v = vv();
    // актуальные размеры видимой области
    const w = Math.round((v?.width ?? window.innerWidth) || 0);
    const h = Math.round((v?.height ?? window.innerHeight) || 0);

    // CSS-переменные для верстки
    docEl.style.setProperty("--vvw", w + "px");
    docEl.style.setProperty("--vvh", h + "px");

    // страховка: привяжем корневой контейнер к видимой высоте
    // (если где-то в css забудут использовать переменную)
    if (rootEl) {
      rootEl.style.width = "100vw";
      rootEl.style.height = "var(--vvh)";       // ключ
      rootEl.style.minHeight = "var(--vvh)";    // ключ
    }
  };

  const requestApply = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(applyNow);
  };

  // начальный вызов
  requestApply();

  // слушатели окна
  window.addEventListener("resize", requestApply, { passive: true });
  window.addEventListener("orientationchange", requestApply, { passive: true });

  // visualViewport: изменение размеров/скролла адресной строки
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", requestApply, { passive: true });
    window.visualViewport.addEventListener("scroll", requestApply, { passive: true });
  }

  // возврат со сна/из bfcache — Safari часто «замораживает» старую высоту
  window.addEventListener("pageshow", (e) => {
    if (e.persisted) {
      // дать движку «проснуться» и пересчитать
      setTimeout(requestApply, 0);
      setTimeout(requestApply, 60);
    } else {
      requestApply();
    }
  }, { passive: true });

  // когда вкладка снова стала видимой — тоже обновим
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) requestApply();
  }, { passive: true });
})();

/* Рендер приложения */
ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
