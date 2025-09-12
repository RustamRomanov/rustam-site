// src/components/FactsPanel.jsx
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";

/** Можно подрегулировать под себя */
const MIN_W = 260;      // минимальная ширина плашки
const IDEAL_W = 420;    // желаемая ширина (но не больше доступной)
const MIN_H = 120;      // минимальная высота
const MAX_H = 260;      // максимальная высота (дальше текст будет clamp’иться)
const PADDING = 16;     // отступ от краёв окна
const GAP = 24;         // зазор до центральной плашки

/**
 * Плашка фактов:
 * - автоматически выбирает угол с наибольшим свободным местом;
 * - не перекрывает #hero-card;
 * - прячется, если не помещается достойно;
 * - текст не вылезает за края.
 */
export default function FactsPanel({
  text,
  anchorId = "hero-card",
  maxLines = 6,          // сколько строк показывать максимум
  className = "",
}) {
  const panelRef = useRef(null);
  const [style, setStyle] = useState({});
  const [visible, setVisible] = useState(true);

  const place = () => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const a = document.getElementById(anchorId)?.getBoundingClientRect() || null;

    // Свободные прямоугольники в четырёх углах (с учётом центральной плашки и GAP)
    const spaces = [
      { name: "top-left",     x: PADDING,                y: PADDING,                 w: (a ? a.left  - GAP : vw) - PADDING,    h: (a ? a.top    - GAP : vh) - PADDING },
      { name: "top-right",    x: (a ? a.right + GAP : 0), y: PADDING,                w: (vw - PADDING) - (a ? a.right + GAP : PADDING), h: (a ? a.top - GAP : vh) - PADDING },
      { name: "bottom-left",  x: PADDING,                y: (a ? a.bottom + GAP : 0), w: (a ? a.left  - GAP : vw) - PADDING,    h: (vh - PADDING) - (a ? a.bottom + GAP : PADDING) },
      { name: "bottom-right", x: (a ? a.right + GAP : 0), y: (a ? a.bottom + GAP : 0), w: (vw - PADDING) - (a ? a.right + GAP : PADDING), h: (vh - PADDING) - (a ? a.bottom + GAP : PADDING) },
    ].map(s => ({ ...s, w: Math.max(0, s.w), h: Math.max(0, s.h), area: Math.max(0, s.w) * Math.max(0, s.h) }));

    // Выбираем угол с максимальной площадью
    spaces.sort((a, b) => b.area - a.area);
    const best = spaces[0];

    // Если совсем нет места — прячем
    if (!best || best.w < MIN_W || best.h < MIN_H) {
      setVisible(false);
      return;
    }

    // Итоговые размеры
    const width = Math.min(IDEAL_W, best.w);
    const height = Math.min(MAX_H, best.h);

    // Фиксированное позиционирование
    const fixedPos = {};
    if (best.name.includes("left")) fixedPos.left = PADDING; else fixedPos.right = PADDING;
    if (best.name.includes("top")) fixedPos.top = PADDING; else fixedPos.bottom = PADDING;

    setVisible(true);
    setStyle({
      position: "fixed",
      zIndex: 25,             // ниже центральной (у неё z-30), выше мозаики (z-10)
      width,
      maxWidth: width,
      maxHeight: height,
      ...fixedPos,
    });
  };

  useLayoutEffect(() => {
    place();
    const onResize = () => place();
    window.addEventListener("resize", onResize);

    const anchor = document.getElementById(anchorId);
    const ro = anchor ? new ResizeObserver(place) : null;
    if (ro && anchor) ro.observe(anchor);

    return () => {
      window.removeEventListener("resize", onResize);
      if (ro && anchor) ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorId, text]);

  if (!visible) return null;

  return (
    <div
      ref={panelRef}
      style={style}
      className={`rounded-2xl shadow-xl backdrop-blur-md bg-black/45 text-white px-4 py-3 ${className}`}
    >
      <div
        style={{
          overflow: "hidden",
          display: "-webkit-box",
          WebkitBoxOrient: "vertical",
          WebkitLineClamp: maxLines, // обрезаем по количеству строк
          wordBreak: "break-word",
          overflowWrap: "anywhere",
          hyphens: "auto",
          lineHeight: "1.25",
        }}
        className="text-sm md:text-base"
      >
        {text}
      </div>
    </div>
  );
}
