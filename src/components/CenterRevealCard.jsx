// src/components/CenterRevealCard.jsx
import React, { useEffect, useRef, useState } from "react";

/* === Лоадер-оверлей: MP4 === */
function OverlayLoader() {
  const [visible, setVisible] = useState(true);
  const [fade, setFade] = useState(false);

  useEffect(() => {
    let finished = false;
    const MIN_MS = 900;
    const MAX_MS = 20000;
    const t0 = performance.now();

    let mosaicReady = !!window.__mosaic_ready;
    let heroReady   = !!window.__hero_ready;

    const tryFinish = () => {
      if (finished) return;
      if (!mosaicReady) return;
      finished = true;
      const dt = performance.now() - t0;
      const rest = Math.max(0, MIN_MS - dt);
      setTimeout(() => {
        setFade(true);
        setTimeout(() => setVisible(false), 420);
      }, rest);
    };

    const onMosaicReady = () => { mosaicReady = true; window.__mosaic_ready = true; tryFinish(); };
    const onHeroReady   = () => { heroReady   = true; window.__hero_ready   = true; tryFinish(); };

    window.addEventListener("mosaic:ready", onMosaicReady, { once: true });
    window.addEventListener("hero:ready", onHeroReady, { once: true });

    const maxT = setTimeout(() => { onMosaicReady(); onHeroReady(); }, MAX_MS);
    return () => {
      window.removeEventListener("mosaic:ready", onMosaicReady);
      window.removeEventListener("hero:ready", onHeroReady);
      clearTimeout(maxT);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      aria-label="Loading"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147486000,
        background: "#000",
        display: "grid",
        placeItems: "center",
        pointerEvents: "none",
        opacity: fade ? 0 : 1,
        transition: "opacity 420ms ease",
      }}
    >
      <video
        src="/rustam-site/assents/loader/loader.mp4?v=3"
        muted autoPlay playsInline loop
        style={{ width: 140, height: 140, objectFit: "contain", display: "block" }}
      />
    </div>
  );
}

/* === Соц-иконка (со звуком) === */
function IconLink({ href, whiteSrc, colorSrc, label, order = 0, open, onNotify, onPrime }) {
  const [hover, setHover] = useState(false);
  const delay = `${open ? order * 120 + 900 : 0}ms`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      onMouseEnter={async () => {
        setHover(true);
        const primed = await onPrime?.();
        if (primed) await onNotify?.();
      }}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "relative",
        width: 28, height: 28,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        textDecoration: "none",
        transform: hover ? "scale(1.3)" : "scale(1)",
        transition: "transform 0.22s ease",
        opacity: open ? 1 : 0, translate: open ? "0 0" : "0 6px",
        transitionProperty: "opacity, translate, transform",
        transitionDuration: open ? "480ms, 480ms, 220ms" : "240ms, 240ms, 220ms",
        transitionTimingFunction: "ease",
        transitionDelay: `${delay}, ${delay}, 0ms`,
      }}
    >
      <img src={whiteSrc} alt={label}
           style={{ position: "absolute", inset: 0, width: "100%", height: "100%",
                    objectFit: "contain", opacity: hover ? 0 : 1, transition: "opacity 0.2s ease",
                    pointerEvents: "none" }} />
      <img src={colorSrc} alt={label}
           style={{ position: "absolute", inset: 0, width: "100%", height: "100%",
                    objectFit: "contain", opacity: hover ? 1 : 0, transition: "opacity 0.2s ease",
                    pointerEvents: "none" }} />
    </a>
  );
}

/* === Видео-оверлей — Vimeo === */
function VideoOverlay({ open, onClose, vimeoId }) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.96)",
        zIndex: 2147484500, display: "flex",
        alignItems: "center", justifyContent: "center", padding: "3vw",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          width: "60vw", maxWidth: 1200, maxHeight: "60vh",
          borderRadius: 12, overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.55)",
          background: "#000",
        }}
      >
        <button
          aria-label="Close"
          onClick={onClose}
          style={{
            position: "absolute",
            top: -34, right: -8,
            width: 34, height: 34, borderRadius: 999,
            background: "rgba(0,0,0,0.55)",
            border: "1px solid rgba(255,255,255,0.35)",
            cursor: "pointer",
            display: "grid", placeItems: "center",
            boxShadow: "0 6px 18px rgba(0,0,0,0.4)",
            transition: "transform 120ms ease, background 160ms ease",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" style={{ display: "block" }}>
            <path d="M6 6l12 12M18 6l-12 12" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        <iframe
          src={`https://player.vimeo.com/video/${vimeoId}?autoplay=1&muted=0&controls=1&playsinline=1&title=0&byline=0&portrait=0&transparent=0&autopause=1`}
          title="Vimeo player"
          frameBorder="0"
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
          style={{ width: "60vw", maxWidth: 1200, height: "60vh", display: "block", background: "#000" }}
        />
      </div>
    </div>
  );
}

/* === BIO Overlay (обновлено) === */
function BioOverlay({ open, onClose, imageSrc }) {
  const [tab, setTab] = useState("bio");

  // refs для выравнивания правой границы текста по концу "ХАРАКТЕРИСТИКА"
  const rightColRef = useRef(null);
  const charBtnRef  = useRef(null);
  const [alignRightPx, setAlignRightPx] = useState(0);

  // небольшая ручная подстройка (px), если надо отрезать ещё пару пикселей
  const manualRightTrim = 0;

  // музыка при открытии BIO
  const audioRef = useRef(null);
  useEffect(() => {
    if (!open) return;
    const a = audioRef.current;
    if (a) {
      a.volume = 0.6;
      a.currentTime = 0;
      a.play().catch(() => {}); // есть клик по "BIO", так что autoplay проходит
    }
    return () => { if (a) a.pause(); };
  }, [open]);

  // пересчёт правого отступа текста под конец слова "ХАРАКТЕРИСТИКА"
  useEffect(() => {
    if (!rightColRef.current || !charBtnRef.current) return;
    const calc = () => {
      const rc = rightColRef.current.getBoundingClientRect();
      const bc = charBtnRef.current.getBoundingClientRect();
      const diff = Math.max(0, rc.right - bc.right);
      setAlignRightPx(diff);
    };
    calc();
    const ro = new ResizeObserver(calc);
    ro.observe(rightColRef.current);
    window.addEventListener("resize", calc);
    return () => { ro.disconnect(); window.removeEventListener("resize", calc); };
  }, []);

  if (!open) return null;

  const textBio = `Я родился 4 декабря 1980 г в Ульяновске.

В конце 90-х я сделал свой первый клип. Камера Hi8, магнитофон и видеоплеер — как монтажный стол. Это была настоящая магия без компьютера.

В 2009-м я переехал в Москву. Снимал рэп-клипы на «зеркалку» с горящими глазами и верой, что всё получится. Получилось. 

В 2010 году я оказался в команде Gazgolder, а в 2011-м отправился с Бастой в тур по Америке. 

В 2012-м я снял первый документальный фильм о Тимати. Так началась большая глава с Black Star, а вместе с ней и десятки громких клипов.

2014 год стал переломным — клип L’One — «Океан» открыл для меня новые горизонты. А в 2015-м работа Doni feat. Натали — «Ты такой» побила все рекорды, став первым клипом в России, преодолевшим 100 млн просмотров на YouTube.

Дальше — сотни проектов, работа с артистами разных жанров и масштабов: от Макса Коржа, Iowa, Pizza до Стаса Михайлова,   Николая Баскова и Филиппа Киркорова. 

Сегодня мой багаж — 200+ проектов, более 2-х миллиардов просмотров и более сотни артистов.`;

  const textChar = `Я считаю, что успешный проект зависит не только от визуального воплощения идеи, но и от глубокого понимания потребностей и ожиданий клиента. 

Руководство командой - это прежде всего способности направлять и мотивировать людей для достижения общей цели. 

В своей карьере я приобрел значительный опыт работы с звездами и селебрити блогерами, что позволило мне развить уникальные навыки в области коммуникации с высокопрофильными личностями, работа с которыми требует уникального подхода.`;

  // --- жирнение указанных фраз ---
  const phrasesToBold = [
    "Я родился 4 декабря 1980 г в Ульяновске",
    "Получилось",
    "Gazgolder",
    "Тимати",
    "Black Star",
    "L’One — «Океан»",
    "Doni feat. Натали — «Ты такой»",
    "Макса Коржа",
    "Iowa",
    "Pizza",
    "Стаса Михайлова",
    "Николая Баскова",
    "Филиппа Киркорова",
    "Филиппа Киркорова.",
    "200+",
    "более 2-х миллиардов просмотров",
    "сотни артистов.",
    "глубокого понимания потребностей и ожиданий клиента.",
    "направлять и мотивировать",
    "значительный опыт работы с звездами и селебрити блогерами",
    
  ];
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const boldify = (t) => {
    let out = t;
    phrasesToBold.forEach(p => {
      const re = new RegExp(esc(p), "g");
      out = out.replace(re, `<strong>${p}</strong>`);
    });
    return out;
  };

  // геометрия/типографика
  const inset = "clamp(10px, 1.2vw, 18px)";
  const headerFS = "clamp(12px, 1vw, 18px)";
  const leftPart = "40%";
  const textNudge = "8px";

  // правый отступ заметно больше, чем было
  const padRightExtra = "clamp(12px, 2vw, 30px)";

  // «пустая строка» между заголовками и текстом — увеличиваем зазор
  const extraGapEm = 1.1; // визуально как пустая строка

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.82)",
        zIndex: 2147485200,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "3vw",
        animation: "bioFade 180ms ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onMouseLeave={onClose}
        style={{
          position: "relative",
          width: "min(44vw, 60vh)",
          borderRadius: 12, overflow: "hidden",
          background: "#000",
          boxShadow: "0 30px 80px rgba(0,0,0,0.55)",
          transform: "scale(0.7)",
          animation: "bioPop 280ms cubic-bezier(0.18,0.8,0.2,1) forwards",
        }}
      >
        {/* Музыка (исправлен путь) */}
        <audio ref={audioRef} src="/rustam-site/assents/music/bio.mp3" preload="auto" />

        <img
          src={imageSrc}
          alt="bio"
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            maxHeight: "60vh",
            objectFit: "cover",
            background: "#000",
            userSelect: "none",
            pointerEvents: "none",
          }}
        />

        {/* Слой заголовков и текста — фото слева, текст справа */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "row",
            alignItems: "stretch",
            pointerEvents: "none",
          }}
        >
          {/* Левая зона = фото */}
          <div style={{ width: leftPart, height: "100%" }} />

          {/* Правая зона = заголовки + текст */}
          <div
            ref={rightColRef}
            style={{
              position: "relative",
              width: `calc(100% - ${leftPart})`,
              height: "100%",
              paddingRight: `calc(${inset} + ${padRightExtra})`,
              paddingLeft: `calc(${inset} - ${textNudge})`,
              pointerEvents: "auto",
            }}
          >
            {/* Табы */}
            <div
              style={{
                position: "absolute",
                top: `calc(${inset} + (${headerFS} * 1))`,
                left: 0,
                right: 0,
                display: "flex",
                gap: "1.2em",
                alignItems: "center",
                whiteSpace: "nowrap",
                overflow: "hidden",
              }}
            >
              <button
                onClick={() => setTab("bio")}
                onMouseEnter={() => setTab("bio")}
                style={{
                  appearance: "none", background: "transparent", border: "none",
                  padding: 0, margin: 0, cursor: "pointer",
                  fontFamily: "UniSans-Heavy, 'Uni Sans', system-ui, -apple-system, Segoe UI, Roboto, Arial",
                  fontWeight: 800, letterSpacing: "0.05em",
                  fontSize: headerFS, lineHeight: 1.2,
                  color: tab === "bio" ? "#E53935" : "#000",
                  whiteSpace: "nowrap",
                }}
              >
                БИОГРАФИЯ
              </button>

              <button
                ref={charBtnRef}
                onClick={() => setTab("char")}
                onMouseEnter={() => setTab("char")}
                style={{
                  appearance: "none", background: "transparent", border: "none",
                  padding: 0, margin: 0, cursor: "pointer",
                  fontFamily: "UniSans-Heavy, 'Uni Sans', system-ui, -apple-system, Segoe UI, Roboto, Arial",
                  fontWeight: 800, letterSpacing: "0.05em",
                  fontSize: headerFS, lineHeight: 1.2,
                  color: tab === "char" ? "#E53935" : "#000",
                  whiteSpace: "nowrap",
                  marginLeft: "4ch",
                }}
              >
                ХАРАКТЕРИСТИКА
              </button>
            </div>

            {/* Текст: justify + вынесенный скролл */}
            {/* Обёртка, чтобы вынести системный скролл за правую кромку изображения */}
            <div
              style={{
                position: "absolute",
                top: `calc(${inset} + (${headerFS} * ${2.2 + extraGapEm}))`, // добавил «пустую строку»
                bottom: `calc(${inset} + ${headerFS} * 1)`,
                left: 0,
                right: 0,
                pointerEvents: "none",
              }}
            >
              <div
                lang="ru"
                style={{
                  position: "absolute",
                  top: 0, bottom: 0, left: 0,
                  right: "-14px", // выносим нативный скролл на 14px наружу
                  overflow: "auto",
                  paddingRight: `calc(${padRightExtra} + ${alignRightPx + manualRightTrim}px + 14px)`,
                  color: "#000",
                  fontFamily: "Jura-Ofont, Jura, system-ui, -apple-system, Segoe UI, Roboto, Arial",
                  fontWeight: 400,
                  fontSize: "clamp(12px, 0.9vw, 16px)",
                  lineHeight: 1.28,
                  whiteSpace: "pre-wrap",
                  textAlign: "justify",
                  textAlignLast: "left",
                  hyphens: "auto",
                  wordBreak: "normal",
                  overflowWrap: "anywhere",
                  pointerEvents: "auto",
                  background: "transparent",
                }}
                dangerouslySetInnerHTML={{ __html: tab === "bio" ? boldify(textBio) : boldify(textChar) }}
              />
            </div>
          </div>
        </div>

        {/* Крестик */}
        <button
          aria-label="Close"
          onClick={onClose}
          style={{
            position: "absolute", top: -34, right: -8,
            width: 34, height: 34, borderRadius: 999,
            background: "rgba(0,0,0,0.55)",
            border: "1px solid rgba(255,255,255,0.35)",
            cursor: "pointer", display: "grid", placeItems: "center",
            boxShadow: "0 6px 18px rgba(0,0,0,0.4)",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" style={{ display: "block" }}>
            <path d="M6 6l12 12M18 6l-12 12" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <style>{`
        @keyframes bioFade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes bioPop  { to { transform: scale(1) } }
      `}</style>
    </div>
  );
}


/* === Главный компонент === */
export default function CenterRevealCard() {
  const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
  const randColor = () => `hsl(${Math.floor(Math.random() * 360)}, 86%, 60%)`;

  /* размеры главной плашки (-10% ширины) */
  const [baseWidth, setBaseWidth] = useState(420);
  const [height, setHeight] = useState(210);
  const width = Math.round(baseWidth * 0.9);

  useEffect(() => {
    const recalc = () => {
      const vw = window.innerWidth, vh = window.innerHeight;
      const w = clamp(Math.round(vw * 0.36), 300, Math.min(720, Math.round(vw * 0.7)));
      const h = Math.round(w / 2);
      setBaseWidth(w);
      setHeight(Math.min(h, Math.round(vh * 0.55)));
    };
    recalc();
    window.addEventListener("resize", recalc);
    return () => window.removeEventListener("resize", recalc);
  }, []);

  /* центрирование */
  const rectRef = useRef({ left: 0, top: 0, right: 0, bottom: 0, w: 0, h: 0 });
  const updateRect = () => {
    const vw = window.innerWidth, vh = window.innerHeight;
    const left = Math.round((vw - width) / 2);
    const top  = Math.round((vh - height) / 2);
    rectRef.current = { left, top, right: left + width, bottom: top + height, w: width, h: height };
  };
  useEffect(() => { updateRect(); }, [width, height]);
  useEffect(() => {
    const h = () => updateRect();
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  /* зоны открытия */
  const triggerRef = useRef({ w: 240, h: 150 });
  const isInRect = (x, y, r) => x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  const isInTrigger = (x, y) => {
    const vw = window.innerWidth, vh = window.innerHeight;
    const cx = vw / 2, cy = vh / 2;
    const { w, h } = triggerRef.current;
    return x >= cx - w / 2 && x <= cx + w / 2 && y >= cy - h / 2 && y <= cy + h / 2;
  };
  const isInSocialHotzone = (x, y) => {
    const el = document.getElementById("social-hotzone");
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  };

  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onMove = (e) => {
      const { clientX: x, clientY: y } = e;
      const o = isInRect(x, y, rectRef.current) || isInTrigger(x, y) || isInSocialHotzone(x, y);
      setOpen(o);
    };
    document.addEventListener("mousemove", onMove);
    return () => document.removeEventListener("mousemove", onMove);
  }, []);

  /* === AUDIO (синт-эффекты) === */
  const audioCtxRef = useRef(null);
  const soundReadyRef = useRef(false);
  const getCtx = async () => {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
      if (audioCtxRef.current.state === "suspended") await audioCtxRef.current.resume().catch(() => {});
      return audioCtxRef.current;
    } catch { return null; }
  };
  const primeSound = async () => {
    try {
      const ctx = await getCtx(); if (!ctx) return false;
      if (ctx.state !== "running") await ctx.resume().catch(() => {});
      const o = ctx.createOscillator(); const g = ctx.createGain();
      g.gain.setValueAtTime(0.00001, ctx.currentTime);
      o.connect(g).connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.01);
      soundReadyRef.current = (ctx.state === "running");
      return soundReadyRef.current;
    } catch { return false; }
  };
  useEffect(() => {
    const onFirstMove = async () => { await primeSound(); document.removeEventListener("mousemove", onFirstMove, true); };
    document.addEventListener("mousemove", onFirstMove, true);
    return () => document.removeEventListener("mousemove", onFirstMove, true);
  }, []);
  const ensureAudio = async () => soundReadyRef.current || primeSound();

  const playLetterClick = async () => {
    const ok = await ensureAudio(); if (!ok) return;
    try {
      const ctx = await getCtx(); if (!ctx) return;
      const now = ctx.currentTime, osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = "square"; osc.frequency.setValueAtTime(900 + Math.random() * 500, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.22, now + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
      osc.connect(gain).connect(ctx.destination); osc.start(now); osc.stop(now + 0.08);
    } catch {}
  };

  const playNotify = async () => {
    const ok = await ensureAudio(); if (!ok) return;
    try {
      const ctx = await getCtx(); if (!ctx) return;
      const now = ctx.currentTime;
      const master = ctx.createGain();
      master.gain.setValueAtTime(0.0001, now);
      master.gain.exponentialRampToValueAtTime(0.28, now + 0.02);
      master.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
      master.connect(ctx.destination);

      const main = ctx.createOscillator(); const g1 = ctx.createGain();
      main.type = "sine";
      main.frequency.setValueAtTime(720, now);
      main.frequency.exponentialRampToValueAtTime(980, now + 0.12);
      g1.gain.setValueAtTime(0.0001, now);
      g1.gain.exponentialRampToValueAtTime(0.22, now + 0.02);
      g1.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
      main.connect(g1).connect(master);
      main.start(now); main.stop(now + 0.3);

      const sparkle = ctx.createOscillator(); const g2 = ctx.createGain();
      sparkle.type = "triangle";
      sparkle.frequency.setValueAtTime(1320, now + 0.06);
      g2.gain.setValueAtTime(0.0001, now + 0.06);
      g2.gain.exponentialRampToValueAtTime(0.12, now + 0.08);
      g2.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
      sparkle.connect(g2).connect(master);
      sparkle.start(now + 0.06); sparkle.stop(now + 0.26);
    } catch {}
  };

  /* строки и состояния */
  const nameStr = "RUSTAM ROMANOV";
  const dirStr  = "DIRECTOR'S SHOWREEL";
  const mapEnToRu = { R:"Р",U:"У",S:"С",T:"Т",A:"А",M:"М",O:"О",N:"Н",V:"В"," ":" " };

  const [nameColors, setNameColors] = useState(Array.from(nameStr).map(() => "#fff"));
  const [nameScale,  setNameScale]  = useState(Array.from(nameStr).map(() => false));
  const [nameChars,  setNameChars]  = useState(Array.from(nameStr));
  const [dirColors,  setDirColors]  = useState(Array.from(dirStr).map(() => "#fff"));
  const [dirScale,   setDirScale]   = useState(Array.from(dirStr).map(() => false));

  // BIO (маленькая строка между именем и соц-иконками)
  const [bioAllRu, setBioAllRu] = useState(false);

  /* вылеты после открытия плашки */
  const [showDots, setShowDots] = useState(false);
  const [dotsMounted, setDotsMounted] = useState(false);
  const [showBioLine, setShowBioLine] = useState(false);
  const [bioMountedAnim, setBioMountedAnim] = useState(false);

  useEffect(() => {
    let t;
    if (open) {
      setShowDots(false); setDotsMounted(false);
      setShowBioLine(false); setBioMountedAnim(false);
      setBioAllRu(false);

      t = setTimeout(() => {
        setShowDots(true); requestAnimationFrame(() => setDotsMounted(true));
        setShowBioLine(true); requestAnimationFrame(() => setBioMountedAnim(true));
      }, 1000);
    } else {
      setShowDots(false); setDotsMounted(false);
      setShowBioLine(false); setBioMountedAnim(false);
      setBioAllRu(false);
    }
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => { if (showBioLine && bioMountedAnim) playNotify(); }, [showBioLine, bioMountedAnim]);

  const RED = "#E53935";
  const titleFont    = clamp(Math.round(window.innerWidth * 0.024), 18, 26);
  const directedFont = Math.round(titleFont / 1.5);
  const revealDelaySmall = 160;
  const revealDelayBig   = 220;

  const wrapperStyle = { position: "fixed", inset: 0, zIndex: 2147483600, pointerEvents: "none" };
  const cardStyle = {
    position: "fixed",
    left: `${rectRef.current.left}px`, top: `${rectRef.current.top}px`,
    width: `${width}px`, height: `${height}px`,
    display: "flex", alignItems: "stretch", justifyContent: "center",
    padding: 0, pointerEvents: "auto", overflow: "hidden",
    background: "rgba(255,255,255,0.06)",
    WebkitBackdropFilter: "blur(16px)", backdropFilter: "blur(16px)",
    borderRadius: 16, border: "none",
    boxShadow: open ? "0 12px 28px rgba(0,0,0,0.22)" : "none",
    transformOrigin: "50% 50%",
    transform: open ? "scaleY(1) scaleX(1)" : "scaleY(0.06) scaleX(1)",
    opacity: open ? 1 : 0,
    transitionProperty: "transform, opacity",
    transitionDuration: open ? "1100ms, 900ms" : "550ms, 450ms",
    transitionTimingFunction: open ? "cubic-bezier(0.16,1,0.3,1)" : "ease-out",
    color: "#fff",
    fontFamily: "UniSans-Heavy, 'Uni Sans', system-ui, -apple-system, Segoe UI, Roboto, Arial",
    fontWeight: 500,
  };
  const contentBox = { position: "relative", flex: 1, padding: "16px 24px 26px", textAlign: "center", display: "flex", flexDirection: "column", justifyContent: "space-between" };
  const headerWrap = { position: "relative", display: "inline-block", lineHeight: 1.5, marginTop: Math.round(directedFont * 1.5) + 14 };
  const centerRow  = { display: "flex", alignItems: "center", justifyContent: "center", height: "100%" };

  const directedStyle = {
    position: "relative",
    zIndex: 2,
    margin: 0, fontWeight: 500, fontSize: directedFont, letterSpacing: "0.08em",
    color: "#fff", whiteSpace: "nowrap", userSelect: "none",
    textShadow: "0 1px 2px rgba(0,0,0,0.25)",
    opacity: open ? 1 : 0, filter: open ? "blur(0px)" : "blur(10px)",
    translate: open ? "0 0" : "0 4px",
    transition: open
      ? `opacity 600ms ease ${revealDelaySmall}ms, filter 700ms ease ${revealDelaySmall}ms, translate 600ms ease ${revealDelaySmall}ms`
      : "opacity 220ms ease, filter 240ms ease, translate 220ms ease",
  };

  const titleStyle = {
    margin: 0, fontWeight: 500, fontSize: Math.max(directedFont * 1.5, 18),
    letterSpacing: "0.02em", color: "#fff", whiteSpace: "nowrap", userSelect: "none",
    textShadow: "0 1px 2px rgba(0,0,0,0.25)",
    opacity: open ? 1 : 0, filter: open ? "blur(0px)" : "blur(10px)",
    translate: open ? "0 0" : "0 4px",
    transition: open
      ? `opacity 700ms ease ${revealDelayBig}ms, filter 800ms ease ${revealDelayBig}ms, translate 700ms ease ${revealDelayBig}ms`
      : "opacity 240ms ease, filter 260ms ease, translate 240ms ease",
    cursor: "default",
  };

  const letterStyle = (colored, scaled, clickable = false, animate = false) => ({
    display: "inline-block",
    color: colored,
    transform: scaled ? "scale(1.2)" : "scale(1)",
    transition: "color 160ms ease, transform 120ms ease, text-shadow 160ms ease",
    textShadow: "0 1px 2px rgba(0,0,0,0.25)",
    userSelect: "none",
    cursor: clickable ? "pointer" : "default",
    animation: animate ? "springPop 220ms cubic-bezier(0.2,0.9,0.2,1)" : "none",
  });

  // Vimeo
  const VIMEO_IDS = { 1: "1118465522", 2: "1118467509", 3: "1001147905" };
  const [playerOpen, setPlayerOpen] = useState(false);
  const [vimeoId, setVimeoId] = useState(null);

  // BIO overlay
  const [bioOpen, setBioOpen] = useState(false);

  // малое BIO между именем и соц-иконками
  const V_BIO_TOP = Math.round(directedFont * 3.6);

  return (
    <>
      <div style={wrapperStyle}>
        <div id="hero-card" style={cardStyle}>
          <div style={contentBox}>
            <div style={centerRow}>
              <div style={headerWrap}>

                {/* Кружки — поочерёдный вылет, пульс */}
                <div
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: -Math.max(86, Math.round(directedFont * 2.35)),
                    transform: "translateX(-50%)",
                    opacity: showDots ? 1 : 0,
                    display: "flex",
                    gap: 16,
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 4,
                    pointerEvents: showDots ? "auto" : "none",
                    transition: "opacity 240ms ease",
                    zIndex: 3,
                  }}
                >
                  {[1,2,3].map((n, idx) => (
                    <DotButton
                      key={n}
                      n={n}
                      order={idx}
                      active={dotsMounted}
                      onClick={() => { const ids={1:"1118465522",2:"1118467509",3:"1001147905"}; setVimeoId(ids[n]); setPlayerOpen(true); }}
                      onHover={playNotify}
                    />
                  ))}
                </div>

                {/* DIRECTOR'S SHOWREEL */}
                <h2 style={directedStyle}>
                  {Array.from(dirStr).map((ch, i) => (
                    <span
                      key={`d-${i}`}
                      onMouseEnter={async () => {
                        const dc = [...dirColors]; dc[i] = randColor(); setDirColors(dc);
                        const ds = [...dirScale];  ds[i] = true;        setDirScale(ds);
                        await playLetterClick();
                      }}
                      style={letterStyle(dirColors[i], dirScale[i], false)}
                    >
                      {ch === " " ? "\u00A0" : ch}
                    </span>
                  ))}
                </h2>

                {/* Имя */}
                <h1
                  onMouseLeave={() => {
                    setNameColors(Array.from(nameStr).map(() => "#fff"));
                    setNameScale(Array.from(nameStr).map(() => false));
                    setNameChars(Array.from(nameStr));
                  }}
                  style={titleStyle}
                >
                  {nameChars.map((ch, i) => (
                    <span
                      key={`n-${i}`}
                      onMouseEnter={async () => {
                        const nc = [...nameColors]; nc[i] = randColor(); setNameColors(nc);
                        const ns = [...nameScale];  ns[i] = true;        setNameScale(ns);
                        setNameChars(prev => {
                          const arr = [...prev];
                          const base = nameStr[i] || ch;
                          arr[i] = mapEnToRu[base] ?? base;
                          return arr;
                        });
                        await playLetterClick();
                      }}
                      style={letterStyle(nameColors[i], nameScale[i], false, true)}
                    >
                      {ch === " " ? "\u00A0" : ch}
                    </span>
                  ))}
                </h1>

                {/* Малое BIO */}
                <div
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: V_BIO_TOP,
                    transform: "translateX(-50%)",
                    opacity: showBioLine ? 1 : 0,
                    pointerEvents: showBioLine ? "auto" : "none",
                    zIndex: 3,
                  }}
                >
                  <h2
                    onMouseEnter={async () => { setBioAllRu(true); await playNotify(); }}
                    onMouseLeave={() => setBioAllRu(false)}
                    onClick={() => setBioOpen(true)}
                    style={{
                      ...directedStyle,
                      marginTop: 6,
                      cursor: "pointer",
                      animation: showBioLine
                        ? (bioMountedAnim ? "bioFly 560ms cubic-bezier(.2,1,.2,1) both" : "none")
                        : "none",
                      transform: bioAllRu ? "scale(1.5)" : "scale(1)",
                      transition: "transform 160ms ease, color 160ms ease",
                      color: bioAllRu ? "#E53935" : "#fff",
                    }}
                  >
                    {bioAllRu ? "БИО" : "BIO"}
                  </h2>
                </div>

                <style>{`
                  @keyframes springPop { 0% { transform: scale(0.9); } 60% { transform: scale(1.15); } 100% { transform: scale(1); } }
                  @keyframes bioFly { 0%{ transform: translateY(-16px); opacity:.0 } 70%{ transform: translateY(6px); opacity:1 } 100%{ transform: translateY(0); opacity:1 } }
                `}</style>
              </div>
            </div>

            {/* Соц-иконки */}
            <div id="social-hotzone" style={{ display: "flex", gap: 14, justifyContent: "center", alignItems: "center", marginTop: 6 }}>
              <IconLink
                href="https://instagram.com/rustamromanov.ru"
                label="Instagram"
                whiteSrc="/rustam-site/assents/icons/instagram-white.svg?v=3"
                colorSrc="/rustam-site/assents/icons/instagram-color.svg?v=3"
                order={0} open={open} onNotify={playNotify} onPrime={primeSound}
              />
              <IconLink
                href="https://t.me/rustamromanov"
                label="Telegram"
                whiteSrc="/rustam-site/assents/icons/telegram-white.svg?v=3"
                colorSrc="/rustam-site/assents/icons/telegram-color.svg?v=3"
                order={1} open={open} onNotify={playNotify} onPrime={primeSound}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Vimeo */}
      <VideoOverlay
        open={playerOpen}
        onClose={() => { setPlayerOpen(false); setVimeoId(null); }}
        vimeoId={vimeoId}
      />

      {/* BIO Overlay */}
      <BioOverlay
        open={bioOpen}
        onClose={() => setBioOpen(false)}
        imageSrc="/rustam-site/assents/foto/bio.jpg"
      />

      {/* Лоадер */}
      <OverlayLoader />
    </>
  );
}

/* === Кружок с цифрой === */
function DotButton({ n, onClick, onHover, order = 0, active = false }) {
  const [hover, setHover] = useState(false);
  const RED = "#E53935";
  const pulseDelay = `${order * 300}ms`;
  const flyDelay   = `${order * 140}ms`;

  return (
    <>
      <button
        onClick={onClick}
        onMouseEnter={() => { setHover(true); onHover?.(); }}
        onMouseLeave={() => setHover(false)}
        style={{
          width: 40, height: 40,
          borderRadius: 999,
          background: hover ? "rgba(229,57,53,0.65)" : "rgba(255,255,255,0.10)",
          border: `1px solid ${hover ? RED : "rgba(255,255,255,0.28)"}`,
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          color: "#fff",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 16,
          cursor: "pointer",

          translate: active ? "0 0" : "0 14px",
          scale: active ? (hover ? "1.3" : "1") : "0.88",
          opacity: active ? 1 : 0,

          transitionProperty: "translate, scale, opacity, background, border-color, box-shadow",
          transitionTimingFunction: hover ? "cubic-bezier(.2,.9,.2,1.05)" : "cubic-bezier(.18,.8,.2,1)",
          transitionDuration: hover ? "160ms" : "360ms",

          animation: active
            ? [
                hover ? "none" : `dotPulse 1400ms ease-in-out ${pulseDelay} infinite`,
                `dotFly 560ms cubic-bezier(.2,1,.2,1) ${flyDelay} both`
              ].join(", ")
            : "none",

          boxShadow: hover ? "0 8px 24px rgba(229,57,53,0.35)" : "none",
        }}
      >
        {n}
      </button>

      <style>{`
        @keyframes dotFly {
          0%   { translate: 0 12px; }
          65%  { translate: 0 -14px; }
          100% { translate: 0 0; }
        }
        @keyframes dotPulse {
          0%,100% { background: rgba(229,57,53,0.22); border-color: rgba(229,57,53,0.40); }
          50%     { background: rgba(229,57,53,0.60); border-color: rgba(229,57,53,0.85); }
        }
      `}</style>
    </>
  );
}
