import React, { useEffect, useLayoutEffect, useRef } from "react";
import "./Title.css";

export default function Title() {
  const viewportRef = useRef(null);
  const boxRef = useRef(null);
  const topRef = useRef(null);
  const bottomRef = useRef(null);

  const fit = () => {
    const box = boxRef.current;
    const top = topRef.current;
    const bottom = bottomRef.current;
    if (!box || !top || !bottom) return;

   // --- 1) Размер плашки: ~1% от площади вьюпорта ---
const vw = window.innerWidth;
const vh = window.innerHeight;
const areaTarget = vw * vh * 0.01;              // 1% площади экрана
let boxW = Math.min(vw * 0.7, Math.max(vw * 0.25, Math.sqrt(areaTarget * (vw / vh))));
let boxH = areaTarget / boxW;

// Ограничения на высоту, чтобы плашка не пропала
boxH = Math.max(Math.min(boxH, vh * 0.30), vh * 0.10);
boxW = Math.max(vw * 0.20, Math.min(vw * 0.5, areaTarget / boxH));

// Отступы 20%
const padX = boxW * 0.20;
const padY = boxH * 0.20;

Object.assign(box.style, {
  width: `${boxW}px`,
  height: `${boxH}px`,
  padding: `${padY}px ${padX}px`,
});


    // --- 2) Подгон шрифта: учитываем и ширину, и высоту (2 строки) ---
    const innerW = boxW - padX * 2;
    const innerH = boxH - padY * 2;
    const lineHeight = 1.1; // в CSS тоже 1.1

    // Сначала впишем по ширине (по более длинному слову — "РОМАНОВ")
    let lo = 20, hi = 300, best = lo;
    bottom.style.whiteSpace = "nowrap";
    const measure = (px) => {
      bottom.style.fontSize = px + "px";
      return bottom.scrollWidth;
    };
    // бинарный поиск
    if (measure(hi) <= innerW) best = hi;
    else {
      while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2);
        const w = measure(mid);
        if (w <= innerW) { best = mid; lo = mid + 1; }
        else hi = mid - 1;
      }
    }

    // Ограничим по высоте: две строки * lineHeight
    const sizeByHeight = Math.floor(innerH / (2 * lineHeight));
    const finalSize = Math.max(20, Math.min(best, sizeByHeight));

    top.style.fontSize = finalSize + "px";
    bottom.style.fontSize = finalSize + "px";
  };

  useLayoutEffect(() => {
    fit();
    const onResize = () => fit();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (document?.fonts?.ready) document.fonts.ready.then(fit);
    else fit();
  }, []);

  return (
    <div
      ref={viewportRef}
      className="fixed left-1/2 -translate-x-1/2 w-full text-center z-[5000] pointer-events-none"
      style={{ top: "35%", boxSizing: "border-box" }}
    >
      <div ref={boxRef} className="rr-box pointer-events-none">
        <h1 ref={topRef} className="rr-title">РУСТАМ</h1>
        <h1 ref={bottomRef} className="rr-title">РОМАНОВ</h1>
      </div>
    </div>
  );
}
