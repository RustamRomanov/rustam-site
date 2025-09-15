// src/components/CenterRevealCard.jsx
import React, { useEffect, useRef, useState } from "react";

/* === Лоадер-оверлей: чёрный фон + гифка, поверх всего, пока не готова мозаика === */
function OverlayLoader() {
  const [visible, setVisible] = useState(true);
  const [fade, setFade] = useState(false);
  const needHeroToo = false;

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
      if (needHeroToo && !heroReady) return;

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
    if (needHeroToo) window.addEventListener("hero:ready", onHeroReady, { once: true });

    const maxT = setTimeout(() => { onMosaicReady(); onHeroReady(); }, MAX_MS);

    return () => {
      window.removeEventListener("mosaic:ready", onMosaicReady);
      if (needHeroToo) window.removeEventListener("hero:ready", onHeroReady);
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
      <img
        src="/rustam-site/assents/loader/loader.gif?v=3"
        alt="Loading…"
        onError={(e) => { e.currentTarget.style.display = "none"; }}
        style={{ width: 140, height: 140, objectFit: "contain" }}
      />
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

/* === Оверлей-плеер — Vimeo со звуком === */
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

/* === BIO Overlay — фото + вкладки === */
function BioOverlay({ open, onClose, imageSrc, onAfterOpen, onBeforeClose }) {
  const [tab, setTab] = useState("bio"); // hover меняет: 'bio' | 'char'
  useEffect(() => {
    if (open) onAfterOpen?.();
    return () => { onBeforeClose?.(); };
  }, [open]);

  if (!open) return null;

  const textBio = `Я родился 4 декабря 1980 года в Ульяновске.
В конце 90-х я сделал свой первый клип. Камера Hi8, магнитофон вместо аудиоплеера, видеомагнитофон — как монтажный стол. Пара секунд видео, «склейка» на кассете — и я получал свой первый музыкальный монтаж. Это была настоящая магия без компьютера.

В 2009-м я переехал в Москву. Снимал рэп-клипы на «зеркалку» с горящими глазами и верой, что всё получится. Получилось. 
В 2010 году я оказался в команде Gazgolder, а в 2011-м отправился с Бастой в мировой тур. 
В 2012-м я снял первый документальный фильм о Тимати. Так началась большая глава с Black Star, а вместе с ней и десятки громких клипов.
2014 год стал переломным — клип L’One — «Океан» открыл для меня новые горизонты. А в 2015-м работа Doni feat. Натали — «Ты такой» побила все рекорды, став первым клипом в России преодолевшим отметку в 100 миллионов просмотров на YouTube.
Дальше — сотни проектов, работа с артистами разных жанров и масштабов: от Макса Коржа, Iowa, Pizza до Стаса Михайлова, Николая Баскова и Филиппа Киркорова. 
Сегодня мой багаж — 200+ проектов, 2+ миллиарда просмотров и более сотни артистов.`;

  const textChar = `Я считаю, что успешный проект зависит не только от визуального воплощения идеи, но и от глубокого понимания потребностей и ожиданий клиента. 

Руководство творческой командой - это прежде всего способности направлять и мотивировать людей для достижения общей цели. В своей карьере я приобрел значительный опыт работы с звездами и селебрити блогерами, что позволило мне развить уникальные навыки в области коммуникации и взаимодействия с высокопрофильными личностями, работа с которыми требует уникального подхода. 
Я умею находить общий язык с каждым из них, понимая их индивидуальные нужды и преобразуя их через призму видения заказчика в реальность на экране.`;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.82)",
        zIndex: 2147485200,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "3vw",
        cursor: "default",
        animation: "bioFade 180ms ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onMouseLeave={onClose}
        style={{
          position: "relative",
          /* масштаб блока через vw, чтобы текст и фото уменьшались вместе */
          width: "min(44vw, 60vh)",
          /* приблизительные пропорции фото сохраняются за счёт cover */
          borderRadius: 12, overflow: "hidden",
          background: "#000",
          boxShadow: "0 30px 80px rgba(0,0,0,0.55)",
          transform: "scale(0.7)",
          animation: "bioPop 280ms cubic-bezier(0.18,0.8,0.2,1) forwards",
        }}
      >
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

        {/* Правые 2/3. Текст — масштабируемые отступы и шрифты */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "stretch",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              position: "relative",
              width: "60%",
              maxWidth: "60%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-start",
              alignItems: "stretch",
              textAlign: "left",
              /* компактнее, единая левая линия для вкладок и текста */
             padding: "clamp(6px, 0.9vw, 16px) clamp(8px, 1vw, 16px) clamp(6px, 0.9vw, 16px) clamp(10px, 1.2vw, 18px)",
             gap: "clamp(4px, 0.6vw, 10px)",

              pointerEvents: "auto",
              color: "#000",
            }}
          >
            {/* Вкладки — активная красная и чуть крупнее */}
            <div
              style={{
                position: "sticky",
                top: 0,
                display: "flex",
                gap: "clamp(8px, 0.8vw, 14px)",
                alignItems: "center",
                justifyContent: "flex-start",
                paddingBottom: "clamp(2px, 0.4vw, 6px)",
                zIndex: 2,
                /* слева без доп. смещения — вровень с текстом */
                paddingLeft: 0,

              }}
            >
              {[
                { k: "bio",  label: "БИОГРАФИЯ" },
                { k: "char", label: "ХАРАКТЕРИСТИКА" },
              ].map(({ k, label }) => {
                const active = tab === k;
                return (
                  <span
                    key={k}
                    onMouseEnter={() => setTab(k)}
                    style={{
  fontFamily: "UniSans-Heavy, 'Uni Sans', system-ui, -apple-system, Segoe UI, Roboto, Arial",
  fontWeight: 800,
  letterSpacing: "0.05em",
  cursor: "pointer",
  userSelect: "none",
  transition: "color 140ms ease, transform 180ms cubic-bezier(.18,.9,.2,1.2)",
  color: active ? "#E53935" : "#000",
  transform: active ? "scale(1.04)" : "scale(1.0)",
  /* меньше размер */
  fontSize: "clamp(11px, 0.9vw, 16px)",
}}
onMouseOver={(e) => (e.currentTarget.style.color = "#C62828")}
onMouseOut={(e) => (e.currentTarget.style.color = active ? "#E53935" : "#000")}

                    title={label}
                  >
                    {label}
                  </span>
                );
              })}
            </div>

            {/* Текст — без фона, масштабируемый шрифт */}
            <div
              style={{
                position: "relative",
                zIndex: 1,
                color: "#000",
                fontFamily: "Jura-Ofont, Jura, system-ui, -apple-system, Segoe UI, Roboto, Arial",
                fontWeight: 400,
                fontSize: "clamp(12px, 0.9vw, 16px)",
                lineHeight: 1.35,
                whiteSpace: "pre-wrap",
                overflow: "auto",
                paddingRight: "clamp(2px, 0.4vw, 8px)",
              }}
            >
              {tab === "bio" ? textBio : textChar}
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
    recalc();
    window.addEventListener("resize", recalc);
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
  useEffect(() => {
    const h = () => updateRect();
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

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
    };
    document.addEventListener("mousemove", onMove);
    return () => document.removeEventListener("mousemove", onMove);
  }, []);

  /* === АУДИО (WebAudio прайм для коротких звуков) + фоновая mp3 для BIO === */
  const audioCtxRef = useRef(null);
  const soundReadyRef = useRef(false);
  const bioAudioRef = useRef(null); // HTMLAudioElement для bio.mp3

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
    let armed = true;
    const tryPrime = async () => {
      if (!armed) return;
      const ok = await primeSound();
      if (ok) {
        armed = false;
        window.removeEventListener("click", tryPrime, true);
        window.removeEventListener("pointerdown", tryPrime, true);
        window.removeEventListener("touchstart", tryPrime, true);
        window.removeEventListener("keydown", tryPrime, true);
      }
    };
    window.addEventListener("click", tryPrime, true);
    window.addEventListener("pointerdown", tryPrime, true);
    window.addEventListener("touchstart", tryPrime, true);
    window.addEventListener("keydown", tryPrime, true);

    const onVisibility = () => { if (!document.hidden) primeSound(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("click", tryPrime, true);
      window.removeEventListener("pointerdown", tryPrime, true);
      window.removeEventListener("touchstart", tryPrime, true);
      window.removeEventListener("keydown", tryPrime, true);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => {
    const onFirstMove = async () => {
      await primeSound();
      document.removeEventListener("mousemove", onFirstMove, true);
    };
    document.addEventListener("mousemove", onFirstMove, true);
    return () => document.removeEventListener("mousemove", onFirstMove, true);
  }, []);

  const ensureAudio = async () => {
    if (soundReadyRef.current) return true;
    return await primeSound();
  };

  const playLetterClick = async () => {
    const ok = await ensureAudio();
    if (!ok) return;
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
    const ok = await ensureAudio();
    if (!ok) return;
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

  /* --- Имя/тексты --- */
  const nameStr = "RUSTAM ROMANOV";
  const dirStr  = "DIRECTOR'S SHOWREEL";

  // Маппинг EN->RU для замены на ховере
  const mapEnToRu = {
    R: "Р", U: "У", S: "С", T: "Т", A: "А", M: "М",
    O: "О", N: "Н", V: "В", " ": " "
  };

  const [nameColors, setNameColors] = useState(Array.from(nameStr).map(() => "#fff"));
  const [nameScale,  setNameScale]  = useState(Array.from(nameStr).map(() => false));
  const [nameChars,  setNameChars]  = useState(Array.from(nameStr)); // текущие буквы (EN/RU)

  const [dirColors,  setDirColors]  = useState(Array.from(dirStr).map(() => "#fff"));
  const [dirScale,   setDirScale]   = useState(Array.from(dirStr).map(() => false));

  // Vimeo IDs
  const VIMEO_IDS = { 1: "1118465522", 2: "1118467509", 3: "1001147905" };

  const [playerOpen, setPlayerOpen] = useState(false);
  const [vimeoId, setVimeoId] = useState(null);

  // BIO overlay
  const [bioOpen, setBioOpen] = useState(false);

  const openVimeo = (n) => {
    const id = VIMEO_IDS[n];
    if (id) { setVimeoId(id); setPlayerOpen(true); }
  };

  const onNameLeaveAll = () => {
    setNameColors(Array.from(nameStr).map(() => "#fff"));
    setNameScale(Array.from(nameStr).map(() => false));
    setNameChars(Array.from(nameStr)); // вернуть EN
  };
  const onDirLeaveAll  = () => {
    setDirColors(Array.from(dirStr).map(() => "#fff"));
    setDirScale(Array.from(dirStr).map(() => false));
  };

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
    cursor: "pointer",
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

  /* --- Кружочки над DIRECTOR'S SHOWREEL --- */
  const [showDots, setShowDots] = useState(false);
  const [dotsMounted, setDotsMounted] = useState(false);
  const showDotsSequenced = async () => {
    await primeSound();
    setShowDots(true);
    setDotsMounted(false);
    requestAnimationFrame(() => setDotsMounted(true));
  };
  const iconsRowStyle = { display: "flex", gap: 14, justifyContent: "center", alignItems: "center", marginTop: 6 };

  // BIO музыка
  const startBioMusic = () => {
    try {
      if (bioAudioRef.current) {
        bioAudioRef.current.pause();
        bioAudioRef.current = null;
      }
      const a = new Audio("/rustam-site/assents/music/bio.mp3");
      a.loop = true;
      a.volume = 0.7;
      bioAudioRef.current = a;
      a.play().catch(() => {});
    } catch {}
  };
  const stopBioMusic = () => {
    try {
      bioAudioRef.current?.pause();
      if (bioAudioRef.current) bioAudioRef.current.currentTime = 0;
      bioAudioRef.current = null;
    } catch {}
  };

  useEffect(() => {
    requestAnimationFrame(() => {
      window.__hero_ready = true;
      window.dispatchEvent(new Event("hero:ready"));
    });
    return () => stopBioMusic();
  }, []);

  return (
    <>
      <div style={wrapperStyle}>
        {/* Главная центральная плашка */}
        <div id="hero-card" style={cardStyle}>
          <div style={contentBox}>
            <div style={centerRow}>
              <div style={headerWrap}>

                {/* Кружки над текстом */}
                <div
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: -Math.max(76, Math.round(directedFont * 2.2)),
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
                      onHover={playNotify}
                    />
                  ))}
                </div>

                {/* DIRECTOR'S SHOWREEL */}
                <h2 onMouseEnter={showDotsSequenced} onMouseLeaveCapture={onDirLeaveAll} style={directedStyle}>
                  {Array.from("DIRECTOR'S SHOWREEL").map((ch, i) => (
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

                {/* Имя — кликабельно + замена на RU при ховере каждой буквы */}
                <h1
                  onMouseLeave={onNameLeaveAll}
                  onClick={() => setBioOpen(true)}
                  style={titleStyle}
                  title="Открыть биографию"
                >
                  {nameChars.map((ch, i) => (
                    <span
                      key={`n-${i}`}
                      onMouseEnter={async () => {
                        const nc = [...nameColors]; nc[i] = randColor(); setNameColors(nc);
                        const ns = [...nameScale];  ns[i] = true;        setNameScale(ns);

                        // смена на русскую букву с лёгким spring
                        setNameChars(prev => {
                          const arr = [...prev];
                          const base = nameStr[i] || ch;
                          arr[i] = mapEnToRu[base] ?? base;
                          return arr;
                        });

                        await playLetterClick();
                      }}
                      style={letterStyle(nameColors[i], nameScale[i], true, true)}
                    >
                      {ch === " " ? "\u00A0" : ch}
                    </span>
                  ))}
                </h1>

                {/* spring keyframes */}
                <style>{`
                  @keyframes springPop {
                    0% { transform: scale(0.9); }
                    60% { transform: scale(1.15); }
                    100% { transform: scale(1); }
                  }
                `}</style>
              </div>
            </div>

            {/* Соц-иконки */}
            <div id="social-hotzone" style={iconsRowStyle}>
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

      {/* Vimeo плеер */}
      <VideoOverlay
        open={playerOpen}
        onClose={() => { setPlayerOpen(false); setVimeoId(null); }}
        vimeoId={vimeoId}
      />

      {/* BIO: фото + вкладки + звук */}
      <BioOverlay
        open={bioOpen}
        onClose={() => { setBioOpen(false); stopBioMusic(); }}
        imageSrc="/rustam-site/assents/foto/bio.jpg"
        onAfterOpen={startBioMusic}
        onBeforeClose={stopBioMusic}
      />

      {/* ЛОАДЕР */}
      <OverlayLoader />
    </>
  );
}

/* === Матовый кружок с цифрой (анимация + звук на hover) === */
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
