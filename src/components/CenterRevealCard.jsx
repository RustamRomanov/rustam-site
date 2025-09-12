// src/components/CenterRevealCard.jsx
import React, { useEffect, useRef, useState } from "react";

/* === Соц-иконка с уведомлением (звук на hover) === */
function IconLink({ href, whiteSrc, colorSrc, label, order = 0, open, onNotify, onPrime }) {
  const [hover, setHover] = useState(false);
  const delay = `${open ? order * 120 + 900 : 0}ms`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      onMouseEnter={async () => { setHover(true); await onPrime?.(); await onNotify?.(); }}
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

/* === Видеоплеер === */
function VideoOverlay({ open, onClose, srcList }) {
  const videoRef = useRef(null);
  const [i, setI] = useState(0);
  const [err, setErr] = useState("");

  useEffect(() => { if (open) { setI(0); setErr(""); } }, [open, srcList]);
  useEffect(() => {
    if (!open) return;
    const v = videoRef.current; if (!v) return;
    const t = setTimeout(() => v.play?.().catch(() => {}), 0);
    return () => clearTimeout(t);
  }, [i, open]);

  if (!open) return null;
  const src = srcList?.[i];
  const tryNext = () => {
    if (!srcList || i >= srcList.length - 1) setErr("Не удалось проиграть видео.");
    else setI(i + 1);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)",
        zIndex: 2147483647, display: "flex", alignItems: "center",
        justifyContent: "center", padding: "3vw",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          width: "60vw", maxWidth: 1200,
          height: "auto", maxHeight: "60vh",
          borderRadius: 12, overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.55)",
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "black",
        }}
      >
        <button
  aria-label="Close"
  onClick={onClose}
  style={{
    position: "absolute",
    top: 8, right: 8,
    width: 42, height: 42,
    borderRadius: 999,
    background: "rgba(0,0,0,0.55)",
    border: "1px solid rgba(255,255,255,0.35)",
    cursor: "pointer",
    boxShadow: "0 6px 18px rgba(0,0,0,0.4)",
    /* идеальное центрирование */
    display: "grid",
    placeItems: "center",
    /* чуть приятнее на hover/focus */
    transition: "transform 120ms ease, background 160ms ease",
  }}
  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.7)")}
  onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.55)")}
>
  {/* крест как SVG — всегда строго по центру */}
  <svg
    width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"
    style={{ display: "block" }}
  >
    <path d="M6 6l12 12M18 6l-12 12"
          stroke="white" strokeWidth="2" strokeLinecap="round" />
  </svg>
</button>


        <video
          ref={videoRef}
          key={src || "fallback"}
          src={src || "/rustam-site/assents/video/1.mp4"}
          style={{ width: "100%", height: "100%", maxHeight: "60vh", outline: "none", display: "block", background: "black" }}
          controls autoPlay playsInline preload="metadata" onError={tryNext}
        />
      </div>

      {err && (
        <div
          style={{
            position: "absolute",
            bottom: 16,
            left: "50%", transform: "translateX(-50%)",
            background: "rgba(255,77,77,0.12)",
            border: "1px solid rgba(255,77,77,0.35)",
            color: "#fff",
            padding: "10px 14px",
            borderRadius: 10,
            fontSize: 13,
            backdropFilter: "blur(6px)",
          }}
        >
          {err}
        </div>
      )}
    </div>
  );
}

export default function CenterRevealCard() {
  const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
  const randColor = () => `hsl(${Math.floor(Math.random() * 360)}, 86%, 60%)`;
  const uuid = () => (window.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2));

  /* --- Размеры главной плашки --- */
  const [width, setWidth] = useState(420);
  const [height, setHeight] = useState(210);
  useEffect(() => {
    const recalc = () => {
      const vw = window.innerWidth, vh = window.innerHeight;
      const w = clamp(Math.round(vw * 0.36), 300, Math.min(720, Math.round(vw * 0.7)));
      const h = Math.round(w / 2);
      setWidth(w); setHeight(Math.min(h, Math.round(vh * 0.55)));
    };
    recalc(); window.addEventListener("resize", recalc);
    return () => window.removeEventListener("resize", recalc);
  }, []);

  /* --- Центрирование --- */
  const rectRef = useRef({ left: 0, top: 0, right: 0, bottom: 0, w: 0, h: 0 });
  const updateRect = () => {
    const vw = window.innerWidth, vh = window.innerHeight;
    const left = Math.round((vw - width) / 2);
    const top  = Math.round((vh - height) / 2);
    rectRef.current = { left, top, right: left + width, bottom: top + height, w: width, h: height };
  };
  useEffect(() => { updateRect(); }, [width, height]);
  useEffect(() => { const h = () => updateRect(); window.addEventListener("resize", h); return () => window.removeEventListener("resize", h); }, []);

  /* --- Триггеры --- */
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
      setOpen(isInRect(x, y, rectRef.current) || isInTrigger(x, y) || isInSocialHotzone(x, y));
    };
    document.addEventListener("mousemove", onMove);
    return () => document.removeEventListener("mousemove", onMove);
  }, []);

  /* === АУДИО === */
  const audioCtxRef = useRef(null);
  const soundReadyRef = useRef(false);

  const getCtx = async () => {
    try {
      if (!audioCtxRef.current) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return null;
        audioCtxRef.current = new Ctx();
      }
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

  // гарантия, что звук разрешён
  const ensureAudio = async () => {
    if (soundReadyRef.current) return true;
    const ok = await primeSound();
    return !!ok;
  };

  // праймим звук только на реальном «жесте»
  useEffect(() => {
    const onPointer = () => { primeSound(); };
    const onKey = () => { primeSound(); };
    window.addEventListener("pointerdown", onPointer, { once: true });
    window.addEventListener("touchstart", onPointer, { once: true, passive: true });
    window.addEventListener("keydown", onKey, { once: true });
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("touchstart", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const playLetterClick = async () => {
    const ctx = await getCtx(); if (!ctx) return;
    const now = ctx.currentTime, osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = "square"; osc.frequency.setValueAtTime(900 + Math.random() * 500, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.22, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
    osc.connect(gain).connect(ctx.destination); osc.start(now); osc.stop(now + 0.08);
  };

  const playNotify = async () => {
    if (!soundReadyRef.current) { const ok = await primeSound(); if (!ok) return; }
    const ctx = await getCtx(); if (!ctx) return;
    const now = ctx.currentTime;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.28, now + 0.02);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    master.connect(ctx.destination);

    const main = ctx.createOscillator();
    const g1 = ctx.createGain();
    main.type = "sine";
    main.frequency.setValueAtTime(720, now);
    main.frequency.exponentialRampToValueAtTime(980, now + 0.12);
    g1.gain.setValueAtTime(0.0001, now);
    g1.gain.exponentialRampToValueAtTime(0.22, now + 0.02);
    g1.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
    main.connect(g1).connect(master);
    main.start(now); main.stop(now + 0.3);

    const sparkle = ctx.createOscillator();
    const g2 = ctx.createGain();
    sparkle.type = "triangle";
    sparkle.frequency.setValueAtTime(1320, now + 0.06);
    g2.gain.setValueAtTime(0.0001, now + 0.06);
    g2.gain.exponentialRampToValueAtTime(0.12, now + 0.08);
    g2.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
    sparkle.connect(g2).connect(master);
    sparkle.start(now + 0.06); sparkle.stop(now + 0.26);
  };

  /* --- Главная плашка — тексты/стили --- */
  const nameStr = "RUSTAM ROMANOV";
  const dirStr  = "DIRECTOR'S SHOWREEL";
  const [nameColors, setNameColors] = useState(Array.from(nameStr).map(() => "#fff"));
  const [dirColors,  setDirColors]  = useState(Array.from(dirStr).map(() => "#fff"));
  const [nameScale, setNameScale]   = useState(Array.from(nameStr).map(() => false));
  const [dirScale,  setDirScale]    = useState(Array.from(dirStr).map(() => false));

  const pickVideoNumberForLetter = (index) => (index % 2 === 0 ? 1 : 2);

  const [playerOpen, setPlayerOpen] = useState(false);
  const [playerSources, setPlayerSources] = useState([]);
  const openVideoByNumber = (n) => {
    setPlayerSources([`/rustam-site/assents/video/${n}.mp4`, `/rustam-site/assents/video/${n}.MP4`]);
    setPlayerOpen(true);
  };

  const onNameLeaveAll = () => { setNameColors(Array.from(nameStr).map(() => "#fff")); setNameScale(Array.from(nameStr).map(() => false)); };
  const onDirLeaveAll = () => { setDirColors(Array.from(dirStr).map(() => "#fff")); setDirScale(Array.from(dirStr).map(() => false)); };

  // — ТЕКСТ ВЫХОДИТ ЧУТЬ РАНЬШЕ —
  const titleFont    = clamp(Math.round(window.innerWidth * 0.024), 18, 26);
  const directedFont = Math.round(titleFont / 1.5);
  const revealDelaySmall = 160; // было ~300
  const revealDelayBig   = 220; // было ~380

  /* === ФАКТЫ === */
  const FACTS_SOURCE = [
    { title: "2000 год. Ульяновск", text: "Вооружённый vhs видеокамерой я начинаю свой путь. Снимаю всё, что вижу, превращая обыденное в увлекательное." },
    { title: "2009 год. Москва", text: "Новая жизнь и вызовы. С горящими глазами и смелостью снимаю рэп-клипы на «зеркалку»." },
    { title: "2010 год. Газгольдер", text: "От Касты до Басты. Лейблы приглашают работать." },
    { title: "2011 год. Газгольдер", text: "Мировые туры с Бастой и первые большые клипы. Здесь даже солнца не видно" },
    { title: "2012 год. Тимати", text: "Первый документальный фильм о Тимати. Начало большого сотрудничества с Black Star" },
    { title: "2014 год. Клипмейкер", text: "Макс Корж, Iowa, Pizza, Мот, Джиган и др. Клип L'One - Океан, становится карьерным бустом" },
    { title: "2015 год. Первый", text: "Doni feat. Натали - Ты такой, становится первым клипом, преодолевшим отметку в 100 млн просмотров на YouTube" },
    { title: "Масштаб", text: "200+ проектов. 2+ млрд просмотров на YouTube. 100+ артистов" },
    { title: "Подход", text: "Успех проекта — не только визуал, но и глубокое понимание потребностей и ожиданий клиента." },
    { title: "Работа с селебрити", text: "Опыт со звёздами и блогерами. Нахожу общий язык с каждым и перевожу видение в результат." },
  ];

  const shuffledDeckRef = useRef(shuffle(FACTS_SOURCE));
  const remainingRef = useRef([...shuffledDeckRef.current]);
  const shownCountRef = useRef(0);

  const [bios, setBios] = useState([]);
  const mainCardRef = useRef(null);

  // размеры/отступы
  const FACT_MIN_W = 220, FACT_MIN_H = 120;
  const SAFE_PAD = 12, GAP_HERO = 12;
  const FACT_FADE_MS = 320;

  // плавное удаление
  const removeBioSoft = (id) => {
    setBios((prev) => prev.map(b => b.id === id ? { ...b, visible: false } : b));
    setTimeout(() => setBios((prev) => prev.filter(b => b.id !== id)), FACT_FADE_MS);
  };

  const intersects = (a, b) =>
    !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);

  const containsPoint = (b, x, y) => x >= b.left && x <= b.left + b.w && y >= b.top && y <= b.top + b.h;

  const placeNearClick = (x, y, w, h) => {
    const vw = window.innerWidth, vh = window.innerHeight;
    const hero = rectRef.current;

    // стартовая позиция — у клика
    let left = clamp(x - w / 2, SAFE_PAD, vw - w - SAFE_PAD);
    let top  = clamp(y - h / 2, SAFE_PAD, vh - h - SAFE_PAD);
    const tryCard = { left, top, right: left + w, bottom: top + h };

    if (!intersects(tryCard, hero)) return { left, top };

    const cx = (hero.left + hero.right) / 2;
    const cy = (hero.top + hero.bottom) / 2;
    const vx = Math.sign(x - cx) || 1;
    const vy = Math.sign(y - cy) || 1;

    const candidates = [
      { left: vx < 0 ? hero.left - GAP_HERO - w : hero.right + GAP_HERO, top: clamp(y - h / 2, SAFE_PAD, vh - h - SAFE_PAD) },
      { left: clamp(x - w / 2, SAFE_PAD, vw - w - SAFE_PAD), top: vy < 0 ? hero.top - GAP_HERO - h : hero.bottom + GAP_HERO },
      { left: vx < 0 ? hero.left - GAP_HERO - w : hero.right + GAP_HERO, top: vy < 0 ? hero.top - GAP_HERO - h : hero.bottom + GAP_HERO },
    ]
      .map(p => ({
        left: clamp(p.left, SAFE_PAD, vw - w - SAFE_PAD),
        top:  clamp(p.top,  SAFE_PAD, vh - h - SAFE_PAD)
      }))
      .filter(p => !intersects({ left: p.left, top: p.top, right: p.left + w, bottom: p.top + h }, hero))
      .sort((a, b) => {
        const da = (a.left + w/2 - x)**2 + (a.top + h/2 - y)**2;
        const db = (b.left + w/2 - x)**2 + (b.top + h/2 - y)**2;
        return da - db;
      });

    if (candidates[0]) return candidates[0];

    const spaces = [
      { left: SAFE_PAD, top: SAFE_PAD,                    w: (hero.left - GAP_HERO) - SAFE_PAD, h: (hero.top - GAP_HERO) - SAFE_PAD },
      { left: hero.right + GAP_HERO, top: SAFE_PAD,       w: vw - (hero.right + GAP_HERO) - SAFE_PAD, h: (hero.top - GAP_HERO) - SAFE_PAD },
      { left: SAFE_PAD, top: hero.bottom + GAP_HERO,      w: (hero.left - GAP_HERO) - SAFE_PAD, h: vh - (hero.bottom + GAP_HERO) - SAFE_PAD },
      { left: hero.right + GAP_HERO, top: hero.bottom + GAP_HERO, w: vw - (hero.right + GAP_HERO) - SAFE_PAD, h: vh - (hero.bottom + GAP_HERO) - SAFE_PAD },
    ]
      .map(s => ({ ...s, w: Math.max(0, s.w), h: Math.max(0, s.h), area: Math.max(0, s.w) * Math.max(0, s.h) }))
      .sort((a,b) => b.area - a.area)
      .find(s => s.w >= w && s.h >= h);

    if (!spaces) return null;
    return { left: Math.round(spaces.left + (spaces.w - w) / 2), top: Math.round(spaces.top + (spaces.h - h) / 2) };
  };

  // Спавн факт-плашки
  const spawnNextFact = (x, y, target) => {
    if (shownCountRef.current >= 100) return;
    if (mainCardRef.current?.contains(target)) return;
    const social = document.getElementById("social-hotzone");
    if (social?.contains(target)) return;
    if (target?.closest?.("[data-bio-card]")) return;

    if (remainingRef.current.length === 0) {
      shuffledDeckRef.current = shuffle(FACTS_SOURCE);
      remainingRef.current = [...shuffledDeckRef.current];
    }
    const next = remainingRef.current.pop();

    const w = clamp(Math.round(window.innerWidth * 0.20), FACT_MIN_W, 360);
    const h = Math.round((w * 9) / 16);
    if (window.innerWidth < w + SAFE_PAD * 2 || window.innerHeight < h + SAFE_PAD * 2) return;

    const pos = placeNearClick(x, y, w, h);
    if (!pos) return;

    const { left, top } = pos;
    const originX = x - left, originY = y - top;
    const id = uuid();
    const seenInside = containsPoint({ left, top, w, h }, x, y);

    shownCountRef.current += 1;
    setBios((prev) => [...prev, {
      id, left, top, w, h, originX, originY, visible: false,
      seenInside,
      title: next.title, text: next.text,
    }]);
    requestAnimationFrame(() => {
      setBios((prev) => prev.map((b) => (b.id === id ? { ...b, visible: true } : b)));
    });
  };

  // Клик — создаём факт + праймим звук (любой клик разблокирует)
  useEffect(() => {
    const onClick = (e) => {
      primeSound();
      spawnNextFact(e.clientX, e.clientY, e.target);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  // Глобальный fallback закрытия
  useEffect(() => {
    const onMove = (e) => {
      const x = e.clientX, y = e.clientY;
      setBios((prev) => prev.map((b) => {
        const inside = containsPoint(b, x, y);
        if (inside) return b.seenInside ? b : { ...b, seenInside: true };
        if (b.seenInside && !inside) { removeBioSoft(b.id); }
        return b;
      }));
    };
    document.addEventListener("mousemove", onMove);
    return () => document.removeEventListener("mousemove", onMove);
  }, []);

  // Ресайз — подвинуть/удалить, если не помещается
  useEffect(() => {
    const onResize = () => {
      setBios((prev) => {
        const hero = rectRef.current, vw = window.innerWidth, vh = window.innerHeight;
        const out = [];
        for (const b of prev) {
          if (vw < FACT_MIN_W + SAFE_PAD * 2 || vh < FACT_MIN_H + SAFE_PAD * 2) continue;
          const p = placeNearClick(b.left + b.w / 2, b.top + b.h / 2, b.w, b.h) || { left: b.left, top: b.top };
          const card = { left: p.left, top: p.top, right: p.left + b.w, bottom: p.top + b.h };
          if (intersects(card, hero)) continue;
          out.push({ ...b, left: p.left, top: p.top });
        }
        return out;
      });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  /* --- Стили главной плашки --- */
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
  const headerWrap = { display: "inline-block", lineHeight: 1.5, marginTop: Math.round(directedFont * 1.5) };
  const centerRow  = { display: "flex", alignItems: "center", justifyContent: "center", height: "100%" };
  const directedStyle = {
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
  };
  const letterStyle = (colored, scaled, clickable) => ({
    display: "inline-block",
    color: colored,
    transform: scaled ? "scale(1.2)" : "scale(1)",
    transition: "color 160ms ease, transform 120ms ease, text-shadow 160ms ease",
    cursor: clickable ? "pointer" : "default",
    textShadow: clickable ? "0 0 12px rgba(255,255,255,0.35)" : "0 1px 2px rgba(0,0,0,0.25)",
  });
  const iconsRowStyle = { display: "flex", gap: 14, justifyContent: "center", alignItems: "center", marginTop: 6 };

  return (
    <>
      <div style={wrapperStyle}>
        {/* Главная центральная плашка */}
        <div id="hero-card" ref={mainCardRef} style={cardStyle}>
          <div style={contentBox}>
            <div style={centerRow}>
              <div style={headerWrap}>
                <h2 onMouseLeave={onDirLeaveAll} style={directedStyle}>
                  {Array.from("DIRECTOR'S SHOWREEL").map((ch, i) => (
                    <span
                      key={`d-${i}`}
                      onMouseEnter={async () => {
                        const dc = [...dirColors]; dc[i] = randColor(); setDirColors(dc);
                        const ds = [...dirScale];  ds[i] = true;        setDirScale(ds);
                        if (await ensureAudio()) playLetterClick();
                      }}
                      onClick={() => openVideoByNumber(pickVideoNumberForLetter(i))}
                      style={letterStyle(dirColors[i], dirScale[i], true)}
                    >
                      {ch === " " ? "\u00A0" : ch}
                    </span>
                  ))}
                </h2>
                <h1 onMouseLeave={onNameLeaveAll} style={titleStyle}>
                  {Array.from("RUSTAM ROMANOV").map((ch, i) => (
                    <span
                      key={`n-${i}`}
                      onMouseEnter={async () => {
                        const nc = [...nameColors]; nc[i] = randColor(); setNameColors(nc);
                        const ns = [...nameScale];  ns[i] = true;        setNameScale(ns);
                        if (await ensureAudio()) playLetterClick();
                      }}
                      onClick={() => openVideoByNumber(pickVideoNumberForLetter(i))}
                      style={letterStyle(nameColors[i], nameScale[i], true)}
                    >
                      {ch === " " ? "\u00A0" : ch}
                    </span>
                  ))}
                </h1>
              </div>
            </div>

            {/* Соц-иконки */}
            <div id="social-hotzone" style={iconsRowStyle}>
              <IconLink
                href="https://instagram.com/rustamromanov.ru"
                label="Instagram"
                whiteSrc="/rustam-site/assents/icons/instagram-white.svg"
                colorSrc="/rustam-site/assents/icons/instagram-color.svg"
                order={0} open={open} onNotify={playNotify} onPrime={primeSound}
              />
              <IconLink
                href="https://t.me/rustamromanov"
                label="Telegram"
                whiteSrc="/rustam-site/assents/icons/telegram-white.svg"
                colorSrc="/rustam-site/assents/icons/telegram-color.svg"
                order={1} open={open} onNotify={playNotify} onPrime={primeSound}
              />
            </div>
          </div>
        </div>

        {/* Факт-плашки */}
        {bios.map((b) => (
          <div
            key={b.id}
            data-bio-card
            onPointerLeave={() => removeBioSoft(b.id)}
            onMouseLeave={() => removeBioSoft(b.id)}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "fixed",
              left: b.left, top: b.top, width: b.w, height: b.h,
              padding: 14, pointerEvents: "auto",
              background: "rgba(255,255,255,0.06)",
              WebkitBackdropFilter: "blur(16px)", backdropFilter: "blur(16px)",
              borderRadius: 16, border: "none",
              boxShadow: "0 12px 28px rgba(0,0,0,0.22)",
              color: "#fff",
              fontFamily: "Jura-Ofont, Jura, system-ui, -apple-system, Segoe UI, Roboto, Arial",
              fontWeight: 100,
              display: "flex", flexDirection: "column", gap: 8,
              alignItems: "stretch", justifyContent: "flex-start",
              transformOrigin: `${b.originX}px ${b.originY}px`,
              transform: b.visible ? "scale(1)" : "scale(0.6)",
              opacity: b.visible ? 1 : 0,
              transition: `transform 700ms cubic-bezier(0.16,1,0.3,1), opacity ${FACT_FADE_MS}ms ease`,
              overflow: "hidden",
            }}
          >
            <div style={{
              fontSize: 18, lineHeight: 1.15, letterSpacing: "0.02em", textAlign: "center",
              overflow: "hidden", display: "-webkit-box", WebkitBoxOrient: "vertical",
              WebkitLineClamp: 2, wordBreak: "break-word", overflowWrap: "anywhere", hyphens: "auto",
            }}>
              {b.title}
            </div>
            <div style={{
              fontSize: 14, lineHeight: 1.35, opacity: 0.9, textAlign: "center",
              overflow: "hidden", display: "-webkit-box", WebkitBoxOrient: "vertical",
              WebkitLineClamp: 6, wordBreak: "break-word", overflowWrap: "anywhere", hyphens: "auto",
            }}>
              {b.text}
            </div>
          </div>
        ))}
      </div>

      {/* Плеер — по клику, живёт до крестика */}
      <VideoOverlay open={playerOpen} onClose={() => setPlayerOpen(false)} srcList={playerSources} />
    </>
  );
}

/* === helpers === */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
