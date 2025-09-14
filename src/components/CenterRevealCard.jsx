// src/components/CenterRevealCard.jsx
import React, { useEffect, useRef, useState } from "react";

/* === Прелоадер — гифка/спиннер поверх чёрного фона === */
function PreloaderOverlay() {
  const [visible, setVisible] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    let done = false;
    const MIN_SHOW_MS = 600;   // минимум показываем 0.6с
    const MAX_WAIT_MS = 8000;  // максимум ждём 8с
    const tStart = performance.now();

    const finish = () => {
      if (done) return;
      done = true;
      const elapsed = performance.now() - tStart;
      const rest = Math.max(0, MIN_SHOW_MS - elapsed);
      setTimeout(() => setMounted(true), 16); // включить анимацию
      setTimeout(() => setVisible(false), rest + 420); // +время на fadeout
    };

    const onLoad = () => finish();

    if (document.readyState === "complete") {
      setTimeout(onLoad, 0);
    } else {
      window.addEventListener("load", onLoad, { once: true });
    }

    const maxT = setTimeout(finish, MAX_WAIT_MS);

    return () => {
      window.removeEventListener("load", onLoad);
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
        zIndex: 2147484000, // поверх всего
        background: "#000",
        display: "grid",
        placeItems: "center",
        opacity: mounted ? 0 : 1, // плавный fadeout
        transition: "opacity 420ms ease",
        pointerEvents: "none",
      }}
    >
      {/* Гифка. Если её нет — включится CSS-спиннер ниже */}
      <img
        src="/rustam-site/assents/loader/loader.gif?v=1"
        alt="Loading…"
        onError={(e) => {
          e.currentTarget.style.display = "none"; // если гифки нет
        }}
        style={{ width: 120, height: 120, objectFit: "contain" }}
      />
      {/* CSS-спиннер (резерв) */}
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          border: "3px solid rgba(255,255,255,0.18)",
          borderTopColor: "#fff",
          animation: "rr-spin 0.9s linear infinite",
          position: "absolute",
        }}
      />
      <style>{`@keyframes rr-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

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

/* === Оверлей-плеер — Vimeo со звуком === */
function VideoOverlay({ open, onClose, vimeoId }) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.96)",
        zIndex: 2147483647, display: "flex",
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
        {/* крестик — меньше, выше и правее */}
        <button
          aria-label="Close"
          onClick={onClose}
          style={{
            position: "absolute",
            top: -34,
            right: -8,
            width: 34, height: 34,
            borderRadius: 999,
            background: "rgba(0,0,0,0.55)",
            border: "1px solid rgba(255,255,255,0.35)",
            cursor: "pointer",
            display: "grid", placeItems: "center",
            boxShadow: "0 6px 18px rgba(0,0,0,0.4)",
            transition: "transform 120ms ease, background 160ms ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.7)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.55)")}
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
      const o = isInRect(x, y, rectRef.current) || isInTrigger(x, y) || isInSocialHotzone(x, y);
      setOpen(o);
      if (!o) setShowDots(false);
    };
    document.addEventListener("mousemove", onMove);
    return () => document.removeEventListener("mousemove", onMove);
  }, []);

  /* === АУДИО для hover-эффектов === */
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

  useEffect(() => {
    const onPointer = () => { primeSound(); };
    window.addEventListener("pointerdown", onPointer, { once: true });
    window.addEventListener("keydown", onPointer, { once: true });
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onPointer);
    };
  }, []);

  const ensureAudio = async () => {
    if (soundReadyRef.current) return true;
    const ok = await primeSound();
    return !!ok;
  };

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

  // Vimeo IDs
  const VIMEO_IDS = { 1: "1118465522", 2: "1118467509", 3: "1001147905" };

  const [playerOpen, setPlayerOpen] = useState(false);
  const [vimeoId, setVimeoId] = useState(null);

  // кружочки
  const [showDots, setShowDots] = useState(false);
  const [dotsMounted, setDotsMounted] = useState(false);

  const openVimeo = (n) => { const id = VIMEO_IDS[n]; if (id) { setVimeoId(id); setPlayerOpen(true); } };

  const onNameLeaveAll = () => { setNameColors(Array.from(nameStr).map(() => "#fff")); setNameScale(Array.from(nameStr).map(() => false)); };
  const onDirLeaveAll  = () => { setDirColors(Array.from(dirStr).map(() => "#fff"));  setDirScale(Array.from(dirStr).map(() => false)); };

  const titleFont    = clamp(Math.round(window.innerWidth * 0.024), 18, 26);
  const directedFont = Math.round(titleFont / 1.5);
  const revealDelaySmall = 160;
  const revealDelayBig   = 220;

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

  const FACT_MIN_W = 200, FACT_MIN_H = 110;
  const SAFE_PAD = 12, GAP_HERO = 12;
  const FACT_FADE_MS = 320;

  const removeBioSoft = (id) => {
    setBios((prev) => prev.map(b => b.id === id ? { ...b, visible: false } : b));
    setTimeout(() => setBios((prev) => prev.filter(b => b.id !== id)), FACT_FADE_MS);
  };

  const intersects = (a, b) => !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
  const containsPoint = (b, x, y) => x >= b.left && x <= b.left + b.w && y >= b.top && y <= b.top + b.h;

  const placeNearClick = (x, y, w, h) => {
    const vw = window.innerWidth, vh = window.innerHeight;
    const hero = rectRef.current;
    let left = clamp(x - w / 2, SAFE_PAD, vw - w - SAFE_PAD);
    let top  = clamp(y - h / 2, SAFE_PAD, vh - h - SAFE_PAD);
    const tryCard = { left, top, right: left + w, bottom: top + h };
    if (!intersects(tryCard, hero)) return { left, top };

    const cx = (hero.left + hero.right) / 2, cy = (hero.top + hero.bottom) / 2;
    const vx = Math.sign(x - cx) || 1, vy = Math.sign(y - cy) || 1;

    const candidates = [
      { left: vx < 0 ? hero.left - GAP_HERO - w : hero.right + GAP_HERO, top: clamp(y - h / 2, SAFE_PAD, vh - h - SAFE_PAD) },
      { left: clamp(x - w / 2, SAFE_PAD, vw - w - SAFE_PAD), top: vy < 0 ? hero.top - GAP_HERO - h : hero.bottom + GAP_HERO },
      { left: vx < 0 ? hero.left - GAP_HERO - w : hero.right + GAP_HERO, top: vy < 0 ? hero.top - GAP_HERO - h : hero.bottom + GAP_HERO },
    ]
      .map(p => ({ left: clamp(p.left, SAFE_PAD, vw - w - SAFE_PAD), top: clamp(p.top, SAFE_PAD, vh - h - SAFE_PAD) }))
      .filter(p => !intersects({ left: p.left, top: p.top, right: p.left + w, bottom: p.top + h }, hero))
      .sort((a,b) => ((a.left + w/2 - x)**2 + (a.top + h/2 - y)**2) - ((b.left + w/2 - x)**2 + (b.top + h/2 - y)**2));

    if (candidates[0]) return candidates[0];
    return null;
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
    if (!next || !next.title) return; // страховка

    const w = clamp(Math.round(window.innerWidth * 0.18), FACT_MIN_W, 340);
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
      seenInside, title: next.title, text: next.text,
    }]);
    requestAnimationFrame(() => {
      setBios((prev) => prev.map((b) => (b.id === id ? { ...b, visible: true } : b)));
    });
  };

  // Клик — создаём факт
  useEffect(() => {
    const onClick = (e) => { primeSound(); spawnNextFact(e.clientX, e.clientY, e.target); };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
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
  const headerWrap = { position: "relative", display: "inline-block", lineHeight: 1.5, marginTop: Math.round(directedFont * 1.5) + 14 };
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

  const letterStyle = (colored, scaled, clickable = false) => ({
    display: "inline-block",
    color: colored,
    transform: scaled ? "scale(1.2)" : "scale(1)",
    transition: "color 160ms ease, transform 120ms ease, text-shadow 160ms ease",
    textShadow: "0 1px 2px rgba(0,0,0,0.25)",
    userSelect: "none",
    cursor: clickable ? "pointer" : "default",
  });

  /* --- Кружки: последовательная анимация --- */
  const showDotsSequenced = () => {
    setShowDots(true);
    setDotsMounted(false);
    requestAnimationFrame(() => setDotsMounted(true));
  };

  const iconsRowStyle = { display: "flex", gap: 14, justifyContent: "center", alignItems: "center", marginTop: 6 };

  return (
    <>
      <div style={wrapperStyle}>
        {/* Главная центральная плашка */}
        <div id="hero-card" ref={mainCardRef} style={cardStyle}>
          <div style={contentBox}>
            <div style={centerRow}>
              <div style={headerWrap}>

                {/* Кружки над текстом */}
                <div
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: -Math.max(60, Math.round(directedFont * 2.0)),
                    transform: "translateX(-50%)",
                    opacity: showDots ? 1 : 0,
                    display: "flex",
                    gap: 16,
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 4,
                    pointerEvents: showDots ? "auto" : "none",
                    transition: "opacity 220ms ease",
                  }}
                >
                  {[1,2,3].map((n, idx) => (
                    <DotButton
                      key={n}
                      n={n}
                      order={idx}
                      active={dotsMounted}
                      onClick={() => { primeSound(); openVimeo(n); }}
                      onHover={async () => { if (await ensureAudio()) playNotify(); }}
                    />
                  ))}
                </div>

                {/* DIRECTOR'S SHOWREEL — вызывает появление кружков */}
                <h2 onMouseEnter={showDotsSequenced} onMouseLeaveCapture={onDirLeaveAll} style={directedStyle}>
                  {Array.from(dirStr).map((ch, i) => (
                    <span
                      key={`d-${i}`}
                      onMouseEnter={async () => {
                        const dc = [...dirColors]; dc[i] = randColor(); setDirColors(dc);
                        const ds = [...dirScale];  ds[i] = true;        setDirScale(ds);
                        if (await ensureAudio()) playLetterClick();
                      }}
                      style={letterStyle(dirColors[i], dirScale[i], false)}
                    >
                      {ch === " " ? "\u00A0" : ch}
                    </span>
                  ))}
                </h2>

                {/* Имя — только hover-реакция */}
                <h1 onMouseLeave={onNameLeaveAll} style={titleStyle}>
                  {Array.from(nameStr).map((ch, i) => (
                    <span
                      key={`n-${i}`}
                      onMouseEnter={async () => {
                        const nc = [...nameColors]; nc[i] = randColor(); setNameColors(nc);
                        const ns = [...nameScale];  ns[i] = true;        setNameScale(ns);
                        if (await ensureAudio()) playLetterClick();
                      }}
                      style={letterStyle(nameColors[i], nameScale[i], false)}
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
                whiteSrc="/rustam-site/assents/icons/instagram-white.svg?v=1"
                colorSrc="/rustam-site/assents/icons/instagram-color.svg?v=1"
                order={0} open={open} onNotify={playNotify} onPrime={primeSound}
              />
              <IconLink
                href="https://t.me/rustamromanov"
                label="Telegram"
                whiteSrc="/rustam-site/assents/icons/telegram-white.svg?v=1"
                colorSrc="/rustam-site/assents/icons/telegram-color.svg?v=1"
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
              alignItems: "center", justifyContent: "center",
              transformOrigin: `${b.originX}px ${b.originY}px`,
              transform: b.visible ? "scale(1)" : "scale(0.6)",
              opacity: b.visible ? 1 : 0,
              transition: `transform 700ms cubic-bezier(0.16,1,0.3,1), opacity ${FACT_FADE_MS}ms ease`,
              overflow: "hidden",
              textAlign: "center",
            }}
          >
            <div style={{
              fontSize: 18, lineHeight: 1.15, letterSpacing: "0.02em",
              overflow: "hidden", display: "-webkit-box", WebkitBoxOrient: "vertical",
              WebkitLineClamp: 2, wordBreak: "break-word", overflowWrap: "anywhere", hyphens: "auto",
            }}>
              {b.title}
            </div>
            <div style={{
              fontSize: 14, lineHeight: 1.35, opacity: 0.9,
              overflow: "hidden", display: "-webkit-box", WebkitBoxOrient: "vertical",
              WebkitLineClamp: 6, wordBreak: "break-word", overflowWrap: "anywhere", hyphens: "auto",
            }}>
              {b.text}
            </div>
          </div>
        ))}
      </div>

      {/* Плеер — Vimeo */}
      <VideoOverlay
        open={playerOpen}
        onClose={() => { setPlayerOpen(false); setVimeoId(null); }}
        vimeoId={vimeoId}
      />

      {/* Прелоадер поверх всего (рендерим последним) */}
      <PreloaderOverlay />
    </>
  );
}

/* === Матовый кружок с цифрой (поочередная анимация, звук на hover) === */
function DotButton({ n, onClick, onHover, order = 0, active = false }) {
  const [hover, setHover] = useState(false);
  const [bg, setBg] = useState("rgba(255,255,255,0.08)");

  useEffect(() => { if (hover) setBg(`hsla(${Math.floor(Math.random()*360)},80%,65%,0.35)`); }, [hover]);

  const delay = `${order * 90}ms`;
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => { setHover(true); setBg(`hsla(${Math.floor(Math.random()*360)},80%,65%,0.35)`); onHover?.(); }}
      onMouseLeave={() => { setHover(false); setBg("rgba(255,255,255,0.08)"); }}
      style={{
        width: 40, height: 40,
        borderRadius: 999,
        background: bg,
        border: "1px solid rgba(255,255,255,0.28)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        color: "#fff",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 16,
        cursor: "pointer",
        transform: active ? (hover ? "translateY(0) scale(1.4)" : "translateY(0) scale(1)") : "translateY(14px) scale(0.88)",
        opacity: active ? 1 : 0,
        transitionProperty: "transform, opacity, background, box-shadow, border-color",
        transitionTimingFunction: active ? "cubic-bezier(0.18,0.8,0.2,1)" : "cubic-bezier(0.3,0.7,0.4,1)",
        transitionDuration: active ? "360ms" : "280ms",
        transitionDelay: active ? delay : "0ms",
        boxShadow: hover ? "0 8px 24px rgba(0,0,0,0.25)" : "none",
      }}
    >
      {n}
    </button>
  );
}

/* === helpers — фиксированный shuffle === */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
