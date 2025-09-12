import React, { useEffect, useLayoutEffect, useRef } from "react";
import "./HeroCard.css";

export default function HeroCard() {
  const boxRef = useRef(null);
  const roleRef = useRef(null);
  const nameRef = useRef(null);
  const emptyRef = useRef(null);
  const iconsRef = useRef(null);

  const fit = () => {
    const box = boxRef.current;
    const role = roleRef.current;
    const name = nameRef.current;
    const empty = emptyRef.current;
    const icons = iconsRef.current;
    if (!box || !role || !name || !empty || !icons) return;

    // --- 1) Размер плашки: 16:9, адаптивно от окна ---
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // ↓↓↓ КОЭФФИЦИЕНТ УМЕНЬШЕНИЯ (3 раз)
    const scale = 1 / 3;

    // Базовые пределы как раньше
    const maxWBase = Math.min(0.72 * vw, 0.82 * vh * (16 / 9));
    const minWBase = Math.max(420, Math.min(0.48 * vw, 0.58 * vh * (16 / 9)));
    const chosenBase = Math.max(minWBase, Math.min(maxWBase, 0.62 * vw));

    // Применяем уменьшение к ширине плашки
    const boxW = Math.round(chosenBase * scale);
    const boxH = Math.round(boxW * 9 / 16);

    // Внутренние отступы (пропорциональны уменьшенной высоте)
    const pad = Math.round(boxH * 0.12);

    box.style.width = `${boxW}px`;
    box.style.height = `${boxH}px`;
    box.style.padding = `${pad}px`;

    const innerW = boxW - pad * 2;
    const innerH = boxH - pad * 2;

    // --- 2) Размер иконок (пропорционален уменьшенной высоте плашки) ---
    let iconSize = Math.max(12, Math.round(boxH * 0.12));
    let iconGap = Math.max(6, Math.round(boxH * 0.06));
    icons.style.setProperty("--icon-size", `${iconSize}px`);
    icons.style.setProperty("--icon-gap", `${iconGap}px`);

    // --- 3) Подгон одинакового размера шрифта для 1-й и 2-й строк ---
    const measureWidthFit = (el, target) => {
      let lo = 10, hi = 260, best = lo;
      el.style.whiteSpace = "nowrap";
      const apply = (px) => (el.style.fontSize = px + "px");
      const width = () => el.scrollWidth;

      apply(hi);
      if (width() <= target) best = hi;
      else {
        while (lo <= hi) {
          const mid = Math.floor((lo + hi) / 2);
          apply(mid);
          const w = width();
          if (w <= target) { best = mid; lo = mid + 1; }
          else { hi = mid - 1; }
        }
      }
      apply(best);
      return best;
    };

    // Подгоняем по ширине для обеих строк и берём минимальный
    const sizeRole = measureWidthFit(role, innerW);
    const sizeName = measureWidthFit(name, innerW);
    let f = Math.min(sizeRole, sizeName);

    // --- 4) Проверка по высоте (учитываем 4 строки: роль, имя, ПУСТАЯ, иконки) ---
    const lineHeight = 1.1;
    // «пустая строка» ровно 1em от итогового размера
    let emptyLinePx = Math.round(f * 1.0);

    // Вертикальные зазоры между строками (3 промежутка)
    let vGap = Math.round(f * 0.16);

    const textBlockH =
      Math.round(f * lineHeight) + // роль
      vGap +
      Math.round(f * lineHeight) + // имя
      vGap +
      emptyLinePx +                 // пустая строка
      vGap +
      iconSize;                     // иконки

    if (textBlockH > innerH) {
      const k = innerH / textBlockH;
      f = Math.max(10, Math.floor(f * k));
      emptyLinePx = Math.max(6, Math.round(emptyLinePx * k));
      iconSize = Math.max(10, Math.round(iconSize * k));
      vGap = Math.max(4, Math.round(vGap * k));

      icons.style.setProperty("--icon-size", `${iconSize}px`);
      icons.style.setProperty("--icon-gap", `${Math.max(4, Math.round(iconGap * k))}px`);
    }

    role.style.fontSize = f + "px";
    name.style.fontSize = f + "px";
    empty.style.height = emptyLinePx + "px";

    // Передаём gap внутрь CSS как переменную
    box.style.setProperty("--v-gap", `${vGap}px`);
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
    <div className="rr-hero-center">
      <div ref={boxRef} className="rr-hero-box">
        <div ref={roleRef} className="rr-line">РЕЖИССЕР</div>
        <div ref={nameRef} className="rr-line">РУСТАМ РОМАНОВ</div>
        <div ref={emptyRef} className="rr-line rr-line--empty" aria-hidden="true" />
        <div ref={iconsRef} className="rr-hero-icons">
          {/* Instagram */}
          <a
            href="https://instagram.com/your_profile"
            target="_blank"
            rel="noreferrer"
            className="rr-hero-icon"
            aria-label="Instagram"
          >
            <img
              src="/rustam-site/assents/icons/instagram-white.svg"
              className="icon-img white"
              alt="Instagram"
            />
            <img
              src="/rustam-site/assents/icons/instagram-color.svg"
              className="icon-img color"
              alt="Instagram"
            />
          </a>
          {/* Telegram */}
          <a
            href="https://t.me/your_profile"
            target="_blank"
            rel="noreferrer"
            className="rr-hero-icon"
            aria-label="Telegram"
          >
            <img
              src="/rustam-site/assents/icons/telegram-white.svg"
              className="icon-img white"
              alt="Telegram"
            />
            <img
              src="/rustam-site/assents/icons/telegram-color.svg"
              className="icon-img color"
              alt="Telegram"
            />
          </a>
        </div>
      </div>
    </div>
  );
}
