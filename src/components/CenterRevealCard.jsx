// src/components/CenterRevealCard.jsx
import React, { useEffect, useRef, useState } from "react";

/* ===== Utils (минимально необходимое) ===== */
const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
const within = (x,y,r)=> x>=r.left && x<=r.right && y>=r.top && y<=r.bottom;
const randColor = () => `hsl(${Math.floor(Math.random()*360)}, 86%, 60%)`;

/* Кастомный курсор (десктоп) */
const CURSOR_URL = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20'><circle cx='10' cy='10' r='6' fill='%23E53935'/><circle cx='10' cy='10' r='3' fill='%23ffffff'/></svg>`.replace(/\n|\s{2,}/g,"");

/* ===== Параметры «стеклянной» плашки ===== */
const PLATE_OPACITY_MAX = 0.95;
const PLATE_EASE_POWER  = 1.35;
const PLATE_LERP        = 0.18;
const PLATE_SATURATE_INPUT = 0.30;
const PLATE_SATURATE_FRACTION = PLATE_SATURATE_INPUT > 1 ? PLATE_SATURATE_INPUT/100 : PLATE_SATURATE_INPUT;

/* ===== Платформа ===== */
const MOBILE_BREAKPOINT = 768;

/* ===== Звук ===== */
function useAudio() {
  const ctxRef = useRef(null);
  const getCtx = async () => {
    try{
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if(!Ctx) return null;
      if(!ctxRef.current) ctxRef.current = new Ctx();
      if(ctxRef.current.state==="suspended") await ctxRef.current.resume().catch(()=>{});
      return ctxRef.current;
    }catch{ return null; }
  };
  // Подготовка аудиоконтекста на первый тап/клик
  useEffect(()=>{
    let armed=true;
    const prime=async()=>{ if(!armed) return; const ctx=await getCtx(); if(ctx){ try{
      const o=ctx.createOscillator(), g=ctx.createGain();
      g.gain.value=0.00001; o.connect(g).connect(ctx.destination); o.start(); o.stop(ctx.currentTime+0.01);
    }catch{} } armed=false;
      window.removeEventListener("pointerdown",prime,true);
      window.removeEventListener("touchstart",prime,true);
      window.removeEventListener("click",prime,true);
    };
    window.addEventListener("pointerdown",prime,true);
    window.addEventListener("touchstart",prime,true);
    window.addEventListener("click",prime,true);
    return ()=>{ window.removeEventListener("pointerdown",prime,true); window.removeEventListener("touchstart",prime,true); window.removeEventListener("click",prime,true); };
  },[]);

  const playHoverSoft = async () => {
    const ctx = await getCtx(); if (!ctx) return;
    const t0 = ctx.currentTime;
    const mix = ctx.createGain(); mix.gain.value = 0.55; mix.connect(ctx.destination);
    const o1 = ctx.createOscillator(), g1 = ctx.createGain();
    o1.type="triangle"; o1.frequency.setValueAtTime(480,t0);
    o1.frequency.exponentialRampToValueAtTime(880,t0+0.11);
    g1.gain.setValueAtTime(0.0001,t0); g1.gain.exponentialRampToValueAtTime(0.12,t0+0.02);
    g1.gain.exponentialRampToValueAtTime(0.0001,t0+0.18);
    o1.connect(g1).connect(mix);
    const o2 = ctx.createOscillator(), g2 = ctx.createGain();
    o2.type="sine"; o2.frequency.setValueAtTime(920,t0);
    o2.frequency.exponentialRampToValueAtTime(1300,t0+0.08);
    g2.gain.setValueAtTime(0.0001,t0); g2.gain.exponentialRampToValueAtTime(0.07,t0+0.015);
    g2.gain.exponentialRampToValueAtTime(0.0001,t0+0.14);
    o2.connect(g2).connect(mix);
    o1.start(t0);o2.start(t0);o1.stop(t0+0.22);o2.stop(t0+0.17);
  };

  const playIcon = async () => {
    const ctx = await getCtx(); if (!ctx) return;
    const t0 = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type="triangle"; o.frequency.setValueAtTime(1200,t0);
    g.gain.setValueAtTime(0.0001,t0); g.gain.exponentialRampToValueAtTime(0.14,t0+0.01);
    g.gain.exponentialRampToValueAtTime(0.0001,t0+0.15);
    o.connect(g).connect(ctx.destination); o.start(t0); o.stop(t0+0.16);
  };

  const playDot = async () => {
    const ctx = await getCtx(); if (!ctx) return;
    const t0 = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(180, t0);
    o.frequency.exponentialRampToValueAtTime(60, t0 + 0.25);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.35, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.25);
    o.connect(g).connect(ctx.destination);
    o.start(t0);
    o.stop(t0 + 0.3);
  };

  const playAppear = async () => {
    const ctx = await getCtx(); if (!ctx) return;
    const t0 = ctx.currentTime;
    const len = Math.floor(ctx.sampleRate*0.3);
    const buf = ctx.createBuffer(1,len,ctx.sampleRate);
    const d = buf.getChannelData(0); for (let i=0;i<len;i++) d[i]=(Math.random()*2-1)*(1-i/len);
    const noise = ctx.createBufferSource(); noise.buffer=buf;
    const bp = ctx.createBiquadFilter(); bp.type="bandpass"; bp.frequency.value=1500; bp.Q.value=4;
    const gN = ctx.createGain(); gN.gain.setValueAtTime(0.0001,t0);
    gN.gain.exponentialRampToValueAtTime(0.18,t0+0.05);
    gN.gain.exponentialRampToValueAtTime(0.0001,t0+0.28);
    noise.connect(bp).connect(gN).connect(ctx.destination);
    noise.start(t0); noise.stop(t0+0.3);
    [392,523.25,659.25].forEach((f,i)=>{
      const o=ctx.createOscillator(), g=ctx.createGain();
      o.type="sine"; o.frequency.value=f;
      g.gain.setValueAtTime(0.0001,t0+i*0.05);
      g.gain.exponentialRampToValueAtTime(0.18,t0+i*0.05+0.02);
      g.gain.exponentialRampToValueAtTime(0.0001,t0+i*0.05+0.20);
      o.connect(g).connect(ctx.destination);
      o.start(t0+i*0.05); o.stop(t0+i*0.05+0.22);
    });
  };

  return { playHoverSoft, playIcon, playDot, playAppear };
}

/* ===== Соц-иконка ===== */
function IconLink({ href, whiteSrc, colorSrc, label, onHoverSound, size=28 }) {
  const [hover, setHover] = useState(false);
  const enter = () => { setHover(true); onHoverSound?.(); };
  const leave = () => setHover(false);
  return (
    <a
      href={href} target="_blank" rel="noreferrer" aria-label={label}
      onMouseEnter={enter} onMouseLeave={leave}
      onPointerDown={enter} onPointerUp={leave} onPointerCancel={leave}
      style={{
        position:"relative", width:size, height:size,
        display:"inline-flex", alignItems:"center", justifyContent:"center",
        transform: hover ? "scale(1.3)" : "scale(1)", transition:"transform 140ms ease",
      }}
    >
      <img src={whiteSrc} alt={label}
           style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"contain",
                    opacity: hover ? 0 : 1, transition:"opacity 120ms ease" }}/>
      <img src={colorSrc} alt={label}
           style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"contain",
                    opacity: hover ? 1 : 0, transition:"opacity 120ms ease" }}/>
    </a>
  );
}

/* ===== Мягкая короткая тень под элементами ===== */
function PrePlate({ active, children, expandX=14, expandY=8, radius=12, centerOpacity=0.28 }) {
  const bg = `radial-gradient(ellipse at 50% 50%,
    rgba(0,0,0,${centerOpacity}) 0%,
    rgba(0,0,0,${(centerOpacity*0.65).toFixed(3)}) 28%,
    rgba(0,0,0,0) 60%)`;
  return (
    <div style={{ position:"relative", display:"inline-block", borderRadius:radius }}>
      <div
        aria-hidden
        style={{
          position:"absolute",
          top: -expandY, bottom: -expandY, left: -expandX, right: -expandX,
          borderRadius: radius + Math.max(expandX, expandY),
          background: bg,
          opacity: active ? 1 : 0,
          transition:"opacity 220ms ease",
          pointerEvents:"none",
          filter:"blur(0.3px)",
          zIndex: 0
        }}
      />
      <div style={{ position:"relative", zIndex:1 }}>{children}</div>
    </div>
  );
}

/* ===== Overlay «Круг 2» (как было, BODY +1px) ===== */
function Circle2Overlay({ open, onClose, diameter, hideClose = false, backdropClose = false }) {
  const [imgSrc, setImgSrc] = React.useState("/rustam-site/assents/foto/circle2.jpg");
  if (!open) return null;

  const D = Math.round(diameter);
  const FAMILY_HEADER = "'Uni Sans Heavy','UniSans-Heavy','Uni Sans',system-ui,-apple-system,Segoe UI,Roboto";
  const FAMILY_BODY   = "'Uni Sans Thin','UniSans-Thin','Uni Sans',system-ui,-apple-system,Segoe UI,Roboto";
  const COLOR = "rgba(255,255,255,0.95)";
  const maxTextWidth = Math.round(D * 0.80);
  const TEXT_SHIFT = Math.round(D * 0.05);

  function FitHeader({ text, baseRatio = 0.040, minPx = 12 }) {
    const ref = React.useRef(null);
    const [fs, setFs] = React.useState(Math.max(minPx, Math.round(D * baseRatio)));
    React.useEffect(() => { setFs(Math.max(minPx, Math.round(D * baseRatio))); }, [D, baseRatio, text]);
    React.useEffect(() => {
      const el = ref.current; if (!el) return;
      const w = el.getBoundingClientRect().width;
      if (w > maxTextWidth && fs > minPx) setFs(s => Math.max(minPx, s - (w/maxTextWidth>1.15?2:1)));
    }, [fs, maxTextWidth, text]);
    return (
      <div style={{ textAlign: "center", animation: "c2breath 6200ms ease-in-out 0ms infinite" }}>
        <span
          ref={ref}
          style={{
            display: "inline-block",
            whiteSpace: "nowrap",
            fontFamily: FAMILY_HEADER,
            fontWeight: 800,
            fontSize: fs,
            lineHeight: 1.18,
            letterSpacing: "0.02em",
            color: COLOR
          }}
        >
          {text}
        </span>
      </div>
    );
  }

  const BODY_FS = Math.max(12, Math.round(D * 0.0225));
  const BodyLine = ({ children, delay = 180, mt = Math.round(D * 0.018) }) => (
    <div style={{ marginTop: mt, textAlign: "center", animation: `c2breath 6200ms ease-in-out ${delay}ms infinite`, willChange: "transform" }}>
      <span
        style={{
          display: "inline-block",
          maxWidth: maxTextWidth,
          whiteSpace: "normal",
          wordBreak: "break-word",
          hyphens: "auto",
          fontFamily: FAMILY_BODY,
          fontWeight: 700,
          fontSize: BODY_FS + 1 + bodyInc, // <-- было BODY_FS+1, теперь можно добавить +bodyInc
          lineHeight: 1.24,
          letterSpacing: "0.02em",
          color: COLOR
        }}
      >
        {children}
      </span>
    </div>
  );

  const handleBackdrop = backdropClose ? onClose : undefined;

  return (
    <div
      onClick={handleBackdrop}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147486200,
        background: "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 0
      }}
    >
      <div
        onClick={(e)=>e.stopPropagation()}
        style={{
          position: "relative",
          width: D,
          height: D,
          aspectRatio: "1 / 1",
          borderRadius: "50%",
          overflow: "visible",
          transform: "scale(0.6)",
          opacity: 0,
          flex: "0 0 auto",
          animation: "c2pop 320ms cubic-bezier(.18,.8,.2,1) forwards",
          willChange: "transform,opacity"
        }}
      >
        {!hideClose && (
          <button
            aria-label="Close"
            onClick={onClose}
            style={{
              position: "absolute",
              top: -20, right: -20,
              width: 38, height: 38,
              borderRadius: 999,
              background: "rgba(0,0,0,0.6)",
              border: "1px solid rgba(255,255,255,0.45)",
              cursor: "pointer",
              display: "grid",
              placeItems: "center",
              boxShadow: "0 12px 28px rgba(0,0,0,0.5)",
              zIndex: 3
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6l-12 12" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        )}

        {/* Круг */}
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            aspectRatio: "1 / 1",
            borderRadius: "50%",
            overflow: "hidden",
            boxShadow: "0 30px 80px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(255,255,255,0.08)"
          }}
        >
          <img
            src={imgSrc}
            alt="circle2"
            onError={() => { if (!imgSrc.endsWith(".JPG")) setImgSrc("/rustam-site/assents/foto/circle2.JPG"); }}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "50% 50%",
              filter: "brightness(0.38) saturate(1.02)",
              transform: "translateZ(0)"
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(120% 160% at 50% -20%, rgba(255,255,255,0.08), rgba(255,255,255,0) 60%)," +
                "radial-gradient(120% 160% at 50% 120%, rgba(255,255,255,0.05), rgba(255,255,255,0) 60%)," +
                "linear-gradient(to bottom, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
              backdropFilter: "blur(2px) saturate(1.08)",
              WebkitBackdropFilter: "blur(10px) saturate(1.08)"
            }}
          />
          {/* Контент */}
          <div
            style={{
              position: "absolute", inset: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              textAlign: "center", padding: "clamp(14px,3vw,36px)"
            }}
          >
            <div style={{ maxWidth: maxTextWidth, color: "rgba(255,255,255,0.95)", transform: `translateY(${TEXT_SHIFT}px)` }}>
              <FitHeader text="Режиссёр · Продюсер · Сценарист" />
              <div style={{ height: 20 }} />
              <BodyLine>100+ артистов · 200+ проектов · 2+ млрд просмотров</BodyLine>
              <BodyLine>Большой опыт работы с топовыми артистами и селебрити-блогерами.</BodyLine>
              <BodyLine mt={Math.round(D * 0.022)}>Оперативно пишу тритменты и соблюдаю дедлайны.</BodyLine>
              <BodyLine mt={Math.round(D * 0.022)}>Буду рад сотрудничеству!</BodyLine>
            </div>
          </div>

          <div
            style={{
              position: "absolute", inset: 0, pointerEvents: "none",
              background:
                "radial-gradient(100% 120% at 30% 10%, rgba(255,255,255,0.12), rgba(255,255,255,0) 50%)," +
                "radial-gradient(100% 120% at 70% 90%, rgba(255,255,255,0.08), rgba(255,255,255,0) 55%)"
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes c2pop { to { transform: scale(1); opacity: 1 } }
        @keyframes c2breath {
          0%, 100% { transform: translateY(0px) scale(1); }
          50%      { transform: translateY(-2px) scale(1.012); }
        }
      `}</style>
    </div>
  );
}

/* ===== BIO overlay (desktop) ===== */
function BioOverlay({ open, onClose, imageSrc }) {
  const audioRef = useRef(null);
  const [isMuted, setIsMuted] = useState(false);
  const TEXT_FONT        = "'ABC_TypeWriterRussian', system-ui, -apple-system, 'Segoe UI', Roboto";
  const TEXT_TOP_EXTRA   = "clamp(12px, 1.6vw, 28px)";
  const TEXT_RIGHT_INSET = "clamp(18px, 2.4vw, 48px)";

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (open) {
      a.currentTime = 0;
      a.muted = isMuted;
      a.volume = 0.72;
      a.play().catch(() => {});
    } else a.pause();
    return () => a && a.pause();
  }, [open, isMuted]);

  if (!open) return null;

  const textBio = `В начале 2000-х я сделал свой первый клип. Камера Hi8, магнитофон и видеоплеер — как монтажный стол. Это была настоящая магия без компьютера.

В 2009 я переехал в Москву. Снимал рэп-клипы на «зеркалку» с горящими глазами и верой, что все получится. Получилось! 

В 2010 году я оказался в команде Gazgolder, а в 2011 отправился с Бастой в тур по Америке. 

В 2012 я снял первый документальный фильм о Тимати. Так началась большая глава с Black Star, а вместе с ней и десятки клипов.

2014 год стал переломным - клип L’One «Океан» открыл для меня новые горизонты. А в 2015 работа Doni feat. Натали — «Ты такой» побила все рекорды, став первым клипом в России, преодолевшим 100 млн просмотров на YouTube.

Дальше — сотни проектов, работа с топовыми артистами разных жанров и масштабов: от Макса Коржа, Iowa, Pizza до Стаса Михайлова, Николая Баскова и Филиппа Киркорова. 

Сегодня мой багаж 200+ проектов, более 2-х миллиардов просмотров на Youtube и более сотни артистов с кем мне довелось поработать.`;

  const inset = "clamp(10px,1.2vw,18px)";
  const leftPart = "40%";

  const IconSpeaker = ({ muted, color = "white" }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 9v6h4l5 4V5l-5 4H4z" fill={color}/>
      {!muted && (<>
        <path d="M17 8a5 5 0 0 1 0 8" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round"/>
        <path d="M20 5a9 9 0 0 1 0 14" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round"/>
      </>)}
      {muted && <path d="M2 2l20 20" stroke={color} strokeWidth="2" strokeLinecap="round"/>}
    </svg>
  );

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.82)", zIndex:2147485200,
                  display:"flex", alignItems:"center", justifyContent:"center", padding:"3vw", animation:"bioFade 180ms ease" }}>
      <audio ref={audioRef} src="/rustam-site/assents/music/bio.mp3" preload="auto" loop />
      <div style={{ position:"relative", display:"inline-block", overflow:"visible" }}>
        <div onClick={(e)=>e.stopPropagation()}
             style={{ position:"relative", width:"min(44vw,60vh)", borderRadius:12, overflow:"hidden",
                      background:"#000", boxShadow:"0 30px 80px rgba(0,0,0,0.55)", transform:"scale(0.7)",
                      animation:"bioPop 280ms cubic-bezier(0.18,0.8,0.2,1) forwards" }}>
          <img src={imageSrc} alt="bio"
               style={{ display:"block", width:"100%", height:"100%", maxHeight:"60vh", objectFit:"cover",
                        background:"#000", userSelect:"none", pointerEvents:"none" }}/>
          <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"row", alignItems:"stretch", pointerEvents:"none" }}>
            <div style={{ width:leftPart, height:"100%" }}/>
            <div style={{ position:"relative", width:`calc(100% - ${leftPart})`, height:"100%",
                          paddingRight:`calc(${inset} + clamp(12px,2vw,30px))`, paddingLeft:inset, pointerEvents:"auto" }}>
              <div style={{ position:"absolute",
                            top:`calc(${inset} + ${TEXT_TOP_EXTRA})`,
                            bottom:`calc(${inset} + ${inset})`,
                            left:0, right:TEXT_RIGHT_INSET }}>
                <div
                  className="bio-scroll"
                  lang="ru"
                  style={{
                    position:"absolute", top:0, bottom:0, left:0, right:"-14px",
                    overflow:"auto", paddingRight:"14px",
                    color:"#000", fontFamily:TEXT_FONT, fontWeight:300,
                    fontSize:"clamp(12px, 0.9vw, 16px)", lineHeight:1.28,
                    whiteSpace:"pre-wrap", textAlign:"justify", textAlignLast:"left"
                  }}
                >
                  {textBio}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mute / Close */}
        <button aria-label="Mute/Unmute" onClick={()=>setIsMuted(m=>!m)}
          style={{ position:"absolute", top:-34, right:-34, width:36, height:36,
                   borderRadius:999, background: isMuted ? "rgba(255,255,255,0.78)" : "rgba(0,0,0,0.65)",
                   border: isMuted ? "1px solid rgba(0,0,0,0.35)" : "1px solid rgba(255,255,255,0.45)",
                   cursor:"pointer", display:"grid", placeItems:"center", boxShadow:"0 12px 26px rgba(0,0,0,0.5)", zIndex:12 }}>
          <IconSpeaker muted={isMuted} color={isMuted ? "#222" : "white"} />
        </button>

        <button aria-label="Close" onClick={onClose}
          style={{ position:"absolute", top:-34, right:-78, width:36, height:36,
                   borderRadius:999, background:"rgba(0,0,0,0.65)", border:"1px solid rgba(255,255,255,0.45)",
                   cursor:"pointer", display:"grid", placeItems:"center", boxShadow:"0 12px 26px rgba(0,0,0,0.5)", zIndex:13 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6l-12 12" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
        </button>
      </div>

      <style>{`
        .bio-scroll { scrollbar-width: none; -ms-overflow-style: none; }
        .bio-scroll::-webkit-scrollbar { width: 0; height: 0; }
        @keyframes bioFade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes bioPop  { to { transform: scale(1) } }
      `}</style>
    </div>
  );
}

/* ===== BIO Mobile overlay ===== */
function BioMobileOverlay({ open, onClose, imageSrc }) {
  const audioRef = useRef(null);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (open) {
      a.currentTime = 0;
      a.muted = isMuted;
      a.volume = 0.72;
      a.play().catch(() => {});
    } else {
      a.pause();
    }
    return () => a && a.pause();
  }, [open, isMuted]);

  if (!open) return null;

  const IconSpeaker = ({ muted, color = "white" }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 9v6h4l5 4V5l-5 4H4z" fill={color} />
      {!muted && (<>
        <path d="M17 8a5 5 0 0 1 0 8" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M20 5a9 9 0 0 1 0 14" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" />
      </>)}
      {muted && <path d="M2 2l20 20" stroke={color} strokeWidth="2" strokeLinecap="round" />}
    </svg>
  );

  const SIDE_INSET = "6%";
  const TOP_GAP    = "16svh";
  const BOT_GAP    = "5svh";

  const FS_PX       = 16;
  const LINE_HEIGHT = 1.28;
  const LINES_ABOVE = 11;
  const TEXT_TOP_PX = Math.round(FS_PX * LINE_HEIGHT * LINES_ABOVE);

  return (
    <div style={{ position: "fixed", inset: 0, background: "transparent", zIndex: 2147485600, pointerEvents: "auto" }}>
      <audio ref={audioRef} src="/rustam-site/assents/music/bio.mp3" preload="auto" loop />

      <div
        style={{
          position: "absolute",
          left: SIDE_INSET, right: SIDE_INSET,
          top: TOP_GAP, bottom: BOT_GAP,
          borderRadius: 20, overflow: "hidden",
          background: "#000",
          boxShadow: "0 30px 80px rgba(0,0,0,0.55)"
        }}
      >
        <img
          src={imageSrc} alt="bio-mobile"
          style={{
            position: "absolute", inset: 0, width: "100%", height: "100%",
            objectFit: "cover", objectPosition: "90% 22%"
          }}
        />

        <div
          className="bio-scroll-m"
          style={{
            position: "absolute", left: "6%", right: "6%",
            top: TEXT_TOP_PX, bottom: "5%",
            overflow: "auto", color: "#000",
            fontFamily: "'ABC_TypeWriterRussian', system-ui, -apple-system, 'Segoe UI', Roboto",
            fontSize: FS_PX, lineHeight: LINE_HEIGHT, paddingRight: 12,
            textShadow: "none", whiteSpace: "pre-wrap", textAlign: "justify",
            paddingLeft: `${FS_PX * 1}px`, textAlignLast: "left"
          }}
        >
{`В 2009 я переехал из Ульяновска в Москву. Снимал рэп-клипы на «зеркалку» с горящими глазами и верой, что все получится. Получилось! 

В 2010 году я оказался в команде Gazgolder, а в 2011 отправился с Бастой в тур по Америке. 

В 2012 я снял первый документальный фильм о Тимати. Так началась большая глава с Black Star, а вместе с ней и десятки громких клипов.

2014 год стал переломным - клип L’One «Океан» открыл для меня новые горизонты. А в 2015 работа Doni feat. Натали — «Ты такой» побила все рекорды, став первым клипом в России, преодолевшим 100 млн просмотров на YouTube.

Дальше — сотни проектов, работа с топовыми артистами разных жанров и масштабов: от Макса Коржа, Iowa, Pizza до Стаса Михайлова, Николая Баскова и Филиппа Киркорова. 

Сегодня мой багаж 200+ проектов, более 2-х миллиардов просмотров на Youtube и более сотни артистов с кем мне довелось поработать.`}
        </div>
      </div>

      <button
        aria-label={isMuted ? "Unmute" : "Mute"}
        onClick={() => setIsMuted((m) => !m)}
        style={{
          position: "absolute",
          top: `calc(${TOP_GAP} - 55px)`,
          right: `calc(${SIDE_INSET} + 46px)`,
          width: 40, height: 40, borderRadius: 999,
          background: isMuted ? "rgba(255,255,255,0.78)" : "rgba(0,0,0,0.55)",
          border: isMuted ? "1px solid rgba(0,0,0,0.35)" : "1px solid rgba(255,255,255,0.4)",
          cursor: "pointer", display: "grid", placeItems: "center",
          boxShadow: "0 6px 18px rgba(0,0,0,0.4)", zIndex: 2147485602
        }}
      >
        <IconSpeaker muted={isMuted} color={isMuted ? "#222" : "white"} />
      </button>

      <button
        aria-label="Close"
        onClick={onClose}
        style={{
          position: "absolute",
          top: `calc(${TOP_GAP} - 55px)`, right: SIDE_INSET,
          width: 40, height: 40, borderRadius: 999,
          background: "rgba(0,0,0,0.55)",
          border: "1px solid rgba(255,255,255,0.4)",
          cursor: "pointer", display: "grid", placeItems: "center",
          boxShadow: "0 6px 18px rgba(0,0,0,0.4)", zIndex: 2147485603
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 6l12 12M18 6l-12 12" stroke="white" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      <style>{`
        .bio-scroll-m { scrollbar-width: none; -ms-overflow-style: none; }
        .bio-scroll-m::-webkit-scrollbar { width: 0; height: 0; }
      `}</style>
    </div>
  );
}

/* ===== Vimeo overlay (исправлено: один onIframeLoad + анти-флэш) ===== */
function VideoOverlay({ open, onClose, vimeoId, full=true }) {
  const dragRef = useRef({active:false,startY:0,dy:0});
  const iframeRef = useRef(null);
  const [isMuted, setIsMuted] = useState(full ? true : false);
  const [frameReady, setFrameReady] = useState(false);
  if (!open) return null;

  const onPD = (e)=>{ if(!full) return; dragRef.current={active:true,startY:e.clientY,dy:0}; e.currentTarget.setPointerCapture?.(e.pointerId); };
  const onPM = (e)=>{ if(!full) return; const d=dragRef.current; if(!d.active) return; d.dy=e.clientY-d.startY; const panel=e.currentTarget.querySelector(".player-panel"); if(panel){ panel.style.transform=`translateY(${d.dy}px)`; panel.style.opacity=String(clamp(1-Math.abs(d.dy)/260,0.25,1)); } };
  const onPU = (e)=>{ if(!full) return; const d=dragRef.current; dragRef.current={active:false,startY:0,dy:0}; const panel=e.currentTarget.querySelector(".player-panel"); if(!panel) return; if(Math.abs(d.dy)>140){ onClose(); } else { panel.style.transition="transform 220ms ease, opacity 220ms ease"; panel.style.transform="translateY(0)"; panel.style.opacity="1"; setTimeout(()=>{ panel.style.transition=""; },230); } };

  const post = (method, value)=>{ try{ iframeRef.current?.contentWindow?.postMessage({ method, value }, "*"); }catch{} };

  const onIframeLoad = ()=> {
    setFrameReady(true);
    post("play");
    post("setMuted", isMuted ? true : false);
    if (!isMuted) { post("setVolume", 1); post("play"); }
  };

  const toggleMute = ()=> {
    const next = !isMuted;
    setIsMuted(next);
    post("setMuted", next);
    if (!next) { post("setVolume", 1); post("play"); }
  };

  const containerStyle = full
    ? { position:"relative", width:"100vw", height:"100vh", borderRadius:0 }
    : { position:"relative", width:"60vw", maxWidth:1200, height:"60vh", borderRadius:12, overflow:"hidden", boxShadow:"0 20px 60px rgba(0,0,0,0.55)", background:"#000" };

  const queryMuted = full ? 1 : 0;

  return (
    <div
      onPointerDown={onPD}
      onPointerMove={onPM}
      onPointerUp={onPU}
      onPointerCancel={onPU}
      style={{
        position:"fixed", inset:0, zIndex:2147486000,
        background:"rgba(0,0,0,0.96)", display:"flex",
        alignItems:"center", justifyContent:"center", padding:"3vw"
      }}
    >
      <button aria-label="Close" onClick={onClose}
        style={{ position:"absolute", top:"calc(2.2em + env(safe-area-inset-top))", right:16, width:40, height:40, borderRadius:999, background:"rgba(0,0,0,0.55)", border:"1px solid rgba(255,255,255,0.35)", cursor:"pointer", display:"grid", placeItems:"center", zIndex:2 }}>
        <svg width="18" height="18" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6l-12 12" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
      </button>

      <div className="player-panel" onClick={(e)=>e.stopPropagation()} style={containerStyle}>
        {/* чёрный плейсхолдер до полной готовности */}
        {!frameReady && <div style={{ position:"absolute", inset:0, background:"#000" }} />}
        <iframe
          id="vimeo-embed"
          ref={iframeRef}
          src={`https://player.vimeo.com/video/${vimeoId}?autoplay=1&muted=${queryMuted}&controls=1&playsinline=1&title=0&byline=0&portrait=0&transparent=0&autopause=1&color=000000`}
          title="Vimeo player" frameBorder="0" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowFullScreen
          onLoad={onIframeLoad}
          style={{ position:"absolute", inset:0, width:"100%", height:"100%", display:"block", background:"#000", opacity: frameReady ? 1 : 0, transition:"opacity 160ms ease" }}
        />
      </div>

      {full && (
        <button onClick={toggleMute}
          style={{ position:"absolute", left:"50%", bottom:"6%", transform:"translateX(-50%)",
                   padding:"10px 16px", borderRadius:999, background:"rgba(0,0,0,0.55)", color:"#fff",
                   border:"1px solid rgba(255,255,255,0.35)", fontFamily:"UniSans-Heavy, 'Uni Sans'", letterSpacing:"0.06em" }}>
          {isMuted ? "TAP TO UNMUTE" : "TAP TO MUTE"}
        </button>
      )}
    </div>
  );
}

/* ===== BIOGRAPHY (desktop) per-letter ===== */
function BiographyWordPerLetter({ onOpen }) {
  const { playIcon } = useAudio();
  const latin = Array.from("BIOGRAPHY");
  const map = { B:"Б", I:"И", O:"О", G:"Г", R:"Р", A:"А", P:"Ф", H:"И", Y:"Я" };
  const [stick,setStick]=useState(latin.map(()=>false));
  const [colors,setColors]=useState(latin.map(()=>"#ffffff"));
  return (
    <h2
      className="hover-click"
      onClick={onOpen}
      onMouseLeave={()=>setStick(latin.map(()=>false))}
      style={{
        margin:0,
        cursor:"pointer",
        fontSize:"clamp(12px,1.2vw,18px)",
        userSelect:"none",
        display:"inline-block",
        whiteSpace:"nowrap",
        letterSpacing:"0.08em",
        fontFamily:"'Royal Crescent',system-ui"
      }}
    >
      {latin.map((ch,i)=>(
        <span
          key={`bio-${i}`}
          onMouseEnter={()=>{ if(!stick[i]) { playIcon(); } setStick(s=>{const a=[...s]; a[i]=true; return a;}); setColors(c=>{const a=[...c]; a[i]=randColor(); return a;}); }}
          style={{
            display:"inline-block",
            transformOrigin:"50% 50%",
            transform: stick[i] ? "scale(1.35)" : "scale(1)",
            color: stick[i] ? colors[i] : "#ffffff",
            transition:"transform 140ms ease, color 160ms ease"
          }}
        >
          {stick[i] ? (map[ch] || ch) : ch}
        </span>
      ))}
    </h2>
  );
}

/* ===== DESKTOP Card (кружков нет; SHOWREEL кликабелен) ===== */
function DesktopCard() {
  const { playHoverSoft, playDot } = useAudio();

  // Вычисление размеров «сцены»
  const [fixedSize,setFixedSize]=useState({ w:520, h:320 });
  useEffect(()=>{
    const vw=window.innerWidth;
    const w0=clamp(Math.round(vw*0.36),360,720);
    const h0=Math.round((w0/2*1.26)*0.9);
    setFixedSize({w:w0,h:h0});
  },[]);
  const rectRef = useRef({ left:0, top:0, w:0, h:0 });
  const updateRect = ()=>{ const vw=window.innerWidth, vh=window.innerHeight; const {w,h}=fixedSize; rectRef.current={ left:Math.round((vw-w)/2), top:Math.round((vh-h)/2), w, h }; };
  useEffect(()=>{ updateRect(); },[fixedSize]);
  useEffect(()=>{ const f=()=>updateRect(); window.addEventListener("resize",f); return ()=>window.removeEventListener("resize",f); },[]);

  // Реакция круга 1 на близость курсора (как было)
  const BASE_OPACITY = PLATE_OPACITY_MAX * 0.8;
  const plateTargetRef = useRef(BASE_OPACITY);
  const plateAlphaRef  = useRef(BASE_OPACITY);
  const [plateAlpha, setPlateAlpha] = useState(BASE_OPACITY);
  const [isInside, setIsInside] = useState(false);
  const [plateProx, setPlateProx] = useState(0);

  useEffect(()=>{ 
    let raf=0;
    const tick=()=>{ 
      const a=plateAlphaRef.current, t=plateTargetRef.current;
      const next=a+(t-a)*PLATE_LERP;
      if(Math.abs(next-a)>0.001){ 
        plateAlphaRef.current=next; 
        setPlateAlpha(next); 
        const norm = clamp((next-BASE_OPACITY)/(PLATE_OPACITY_MAX-BASE_OPACITY),0,1);
        setPlateProx(norm);
      }
      raf=requestAnimationFrame(tick);
    };
    raf=requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(raf);
  },[]);

  useEffect(()=>{
    const onMove = (e)=>{
      const r = rectRef.current;
      const inside = within(e.clientX,e.clientY,{left:r.left,top:r.top,right:r.left+r.w,bottom:r.top+r.h});
      if(!inside){
        plateTargetRef.current = BASE_OPACITY;
        if(isInside) setIsInside(false);
        return;
      }
      if(!isInside) setIsInside(true);

      const cx=r.left+r.w/2, cy=r.top+r.h/2;
      const dx=(e.clientX-cx)/(r.w/2), dy=(e.clientY-cy)/(r.h/2);
      const radial = Math.hypot(dx,dy);
      const closeness=clamp(1-radial,0,1);
      const norm=clamp(closeness/PLATE_SATURATE_FRACTION,0,1);

      const target = BASE_OPACITY + Math.pow(norm, PLATE_EASE_POWER) * (PLATE_OPACITY_MAX - BASE_OPACITY);
      plateTargetRef.current = target;
    };
    const onLeave = ()=>{ plateTargetRef.current = BASE_OPACITY; setIsInside(false); };
    window.addEventListener("mousemove", onMove, { passive:true });
    window.addEventListener("mouseleave", onLeave);
    return ()=>{ window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseleave", onLeave); };
  },[isInside]);

  const [playerOpen,setPlayerOpen]=useState(false);
  const [vimeoId,setVimeoId]=useState(null);
  const [bioOpen,setBioOpen]=useState(false);
  const [circle2Open, setCircle2Open] = useState(false);

  const wrapper = { position:"fixed", left:`${rectRef.current.left}px`, top:`${rectRef.current.top}px`, width:`${rectRef.current.w}px`, height:`${rectRef.current.h}px`, display:"flex", alignItems:"center", justifyContent:"center", padding:0, overflow:"visible", pointerEvents:"auto", zIndex:2147483600 };

  const baseDiam = Math.min(rectRef.current.w, rectRef.current.h);
  const circleDiam = Math.round(baseDiam * 1.10);
  const circleScale = 1 + 0.20 * plateProx;
  const plateStyle = { position:"absolute", width:circleDiam, height:circleDiam, left:"50%", top:"50%", transform:`translate(-50%,-50%) scale(${circleScale})`, transformOrigin:"50% 50%", borderRadius:"50%", opacity: plateAlpha, transition:"opacity 60ms linear", pointerEvents:"none" };

  const showreelText="SHOWREEL";
  const nameLatin="RUSTAM ROMANOV";
  const titleBase=24; const titleFS=Math.round(titleBase*1.1);
  const directedFS = Math.round((titleFS/1.5)*1.2);
  const nameFS = Math.round(titleFS*1.32);

  const [nameStick,setNameStick]=useState(Array.from(nameLatin).map(()=>false));
  const [nameColors,setNameColors]=useState(Array.from(nameLatin).map(()=>"#cfcfcf"));
  const [srStick,setSrStick]=useState(Array.from(showreelText).map(()=>false));
  const [srColors,setSrColors]=useState(Array.from(showreelText).map(()=>"#bfbfbf"));

  return (
    <>
      <div style={wrapper}>
        {/* КРУГ 1 — стеклянная плашка */}
        <div className="glass-plate circle" style={plateStyle}>
          <i className="bend ring" />
          <i className="bend side left" />
          <i className="bend side right" />
          <i className="bend side top" />
          <i className="bend side bottom" />
        </div>

        {/* Контент */}
        <div style={{ position:"relative", width:"100%", height:"100%", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", zIndex:1 }}>
          <div style={{ position:"relative", display:"flex", flexDirection:"column", alignItems:"center", gap: Math.round(titleFS*0.42), marginTop: Math.round((titleFS/1.5) * 3.2), color:"#fff", fontFamily:"UniSans-Heavy, 'Uni Sans', system-ui", textShadow:"0 1px 2px rgba(0,0,0,0.25)" }}>

            {/* SHOWREEL — кликабельно */}
            <PrePlate active={!isInside}>
              <div
                onMouseLeave={() => setSrStick(Array.from(showreelText).map(()=>false))}
                onClick={()=>{ setVimeoId("1001147905"); setPlayerOpen(true); }}
                style={{ position:"relative", display:"inline-block", marginTop: Math.round(titleFS*0.3), marginBottom: Math.round(directedFS*0.2), cursor: `url(${CURSOR_URL}) 10 10, default` }}
                title="Открыть шоу-рил"
              >
                <h2
                  className="hover-click"
                  style={{ margin:0, fontSize: directedFS, letterSpacing:"0.08em", whiteSpace:"nowrap", userSelect:"none", position:"relative", zIndex:1, fontFamily:"'Royal Crescent','Uni Sans Heavy','Uni Sans',system-ui" }}
                >
                  {Array.from(showreelText).map((ch,i)=>(
                    <span key={`sr-${i}`}
                      onMouseEnter={()=>{ if(!srStick[i]) { playHoverSoft(); } setSrStick(s=>{const a=[...s]; a[i]=true; return a;}); setSrColors(c=>{const a=[...c]; a[i]=randColor(); return a;}); }}
                      style={{ display:"inline-block", whiteSpace:"pre", color: srStick[i] ? srColors[i] : "#bfbfbf",
                               transform: srStick[i] ? "scale(1.3)" : "scale(1)", transition:"transform 140ms ease, color 160ms ease" }}>
                      {ch===" " ? "\u00A0" : ch}
                    </span>
                  ))}
                </h2>
              </div>
            </PrePlate>

            {/* Имя — открывает круг 2 */}
            <PrePlate active={!isInside}>
              <h1
                onClick={()=> setCircle2Open(true)}
                style={{
                  margin:0, fontSize:nameFS, letterSpacing:"0.02em", whiteSpace:"nowrap",
                  userSelect:"none", cursor:"pointer",
                  fontFamily:"'Rostov','Uni Sans Heavy','Uni Sans',system-ui",
                }}
                title="Подробнее"
              >
                {Array.from(nameLatin).map((ch,i)=>{
                  return (
                    <span key={`n-${i}`}
                      onMouseEnter={()=>{ if(!nameStick[i]) { playHoverSoft(); } setNameStick(s=>{const a=[...s]; a[i]=true; return a;}); setNameColors(c=>{const a=[...c]; a[i]=randColor(); return a;}); }}
                      style={{ display:"inline-block", whiteSpace:"pre", color: nameStick[i] ? nameColors[i] : "#cfcfcf",
                               transform: nameStick[i] ? "scale(1.3)" : "scale(1)", transition:"transform 140ms ease, color 160ms ease",
                               textShadow:"0 1px 2px rgba(0,0,0,0.25)" }}>
                      {ch===" " ? "\u00A0" : ch}
                    </span>
                  );
                })}
              </h1>
            </PrePlate>

            {/* BIO */}
            <div style={{ marginTop: Math.round(titleFS*0.9) }}>
              <PrePlate active={!isInside}>
                <BiographyWordPerLetter onOpen={()=>setBioOpen(true)} />
              </PrePlate>
            </div>

            {/* Соц-иконки */}
            <PrePlate active={!isInside}>
              <div style={{ display:"flex", gap:14, justifyContent:"center", alignItems:"center", marginTop: Math.round(titleFS*0.6) }}>
                <IconLink href="https://instagram.com/rustamromanov.ru" label="Instagram"
                  whiteSrc="/rustam-site/assents/icons/instagram-white.svg?v=3"
                  colorSrc="/rustam-site/assents/icons/instagram-color.svg?v=3"
                  onHoverSound={playDot}/>
                <IconLink href="https://t.me/rustamromanov" label="Telegram"
                  whiteSrc="/rustam-site/assents/icons/telegram-white.svg?v=3"
                  colorSrc="/rustam-site/assents/icons/telegram-color.svg?v=3"
                  onHoverSound={playDot}/>
              </div>
            </PrePlate>

          </div>
        </div>
      </div>

      <VideoOverlay open={playerOpen} onClose={()=>{ setPlayerOpen(false); setVimeoId(null); }} vimeoId={vimeoId} full={false}/>
      <BioOverlay   open={bioOpen}   onClose={()=>setBioOpen(false)} imageSrc="/rustam-site/assents/foto/bio.jpg"/>
      <Circle2Overlay open={circle2Open} onClose={()=>setCircle2Open(false)} diameter={Math.round(circleDiam*1.05)}/>

      <style>{`
        .glass-plate.circle{
          background: rgba(255,255,255,0.07);
          -webkit-backdrop-filter: blur(16px) saturate(1.2);
          backdrop-filter: blur(16px) saturate(1.2);
          box-shadow: 0 12px 28px rgba(0,0,0,0.22);
          border-radius: 50%;
          overflow:hidden;
        }
        .glass-plate.circle::before{
          content:""; position:absolute; inset:-1px; border-radius:inherit; pointer-events:none;
          -webkit-backdrop-filter: blur(30px) saturate(1.25) brightness(1.02);
          backdrop-filter: blur(30px) saturate(1.25) brightness(1.02);
          -webkit-mask-image: radial-gradient(115% 115% at 50% 50%, rgba(0,0,0,0) 50%, rgba(0,0,0,1) 78%);
          mask-image: radial-gradient(115% 115% at 50% 50%, rgba(0,0,0,0) 50%, rgba(0,0,0,1) 78%);
        }
        .glass-plate.circle::after{
          content:""; position:absolute; inset:0; border-radius:inherit; pointer-events:none;
          background:
            radial-gradient(120% 160% at 50% -20%, rgba(255,255,255,0.10), rgba(255,255,255,0) 60%),
            radial-gradient(120% 160% at 50% 120%, rgba(255,255,255,0.08), rgba(255,255,255,0) 60%),
            radial-gradient(160% 120% at -20% 50%, rgba(255,255,255,0.06), rgba(255,255,255,0) 60%),
            radial-gradient(160% 120% at 120% 50%, rgba(255,255,255,0.06), rgba(255,255,255,0) 60%),
            linear-gradient(to bottom, rgba(255,255,255,0.05), rgba(255,255,255,0) 40%, rgba(255,255,255,0) 60%, rgba(255,255,255,0.05) 100%);
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.08), inset 0 -20px 60px rgba(0,0,0,0.15);
        }
        .hover-click{ transition: transform 140ms ease, text-shadow 140ms ease; }
        .hover-click:hover{ transform: scale(1.035); text-shadow: 0 8px 26px rgba(0,0,0,0.35); }
        @keyframes waveGray { 0%,100% { color: #bfbfbf } 50% { color: #e0e0e0 } }
      `}</style>
    </>
  );
}

/* ===== Mobile Card (фикс только для мобилки по твоим пунктам) ===== */
function MobileCard() {
  const { playHoverSoft, playDot } = useAudio();

  const [bioOpen,setBioOpen]=useState(false);
  const [playerOpen,setPlayerOpen]=useState(false);
  const [vimeoId,setVimeoId]=useState(null);
  const [circle2Open, setCircle2Open] = useState(false);

  const openShowreel = () => { setVimeoId("1001147905"); setPlayerOpen(true); };

  // Размер сцены
  const [size,setSize]=useState({
    w: (typeof window!=="undefined"? Math.min(680, Math.round(window.innerWidth*0.9)) : 360),
    h: 0
  });
  useEffect(()=>{
    const calc=()=>{
      const w = Math.min(680, Math.round(window.innerWidth*0.9));
      const h = Math.round(w*0.62);
      setSize({w,h});
    };
    calc();
    window.addEventListener("resize",calc);
    return ()=>window.removeEventListener("resize",calc);
  },[]);

  const wrapper = {
    position:"fixed", left:"50%", top:"50%", transform:"translate(-50%,-50%)",
    width:`${size.w}px`, height:`${size.h}px`,
    display:"flex", alignItems:"center", justifyContent:"center",
    zIndex:2147483600, touchAction:"none"
  };

  // КРУГ 1 — по центру, «дышит»
  const baseDiam   = Math.min(size.w, size.h);
  const circleDiam = Math.round(baseDiam * 1.10);
  const plateOuter = {
    position:"absolute",
    left:"50%", top:"50%",
    transform:"translate(-50%,-50%)",
    animation: "mBreath 3200ms ease-in-out infinite"
  };
  const plateStyle = {
    position:"relative",
    width:circleDiam, height:circleDiam,
    borderRadius:"50%", opacity: PLATE_OPACITY_MAX, pointerEvents:"none"
  };

  // Тексты/буквы
  const lettersBio = Array.from("BIOGRAPHY");
  const mapBio = { B:"Б", I:"И", O:"О", G:"Г", R:"Р", A:"А", P:"Ф", H:"И", Y:"Я" };
  const [stickBio,setStickBio]=useState(lettersBio.map(()=>false));
  const [colorsBio,setColorsBio]=useState(lettersBio.map(()=>"#ffffff"));

  const nameLatin = Array.from("RUSTAM ROMANOV");
  const mapName = { R:"Р", U:"У", S:"С", T:"Т", A:"А", M:"М", O:"О", N:"Н", V:"В", " ":"\u00A0" };
  const [stickName,setStickName]=useState(nameLatin.map(()=>false));
  const [colorsName,setColorsName]=useState(nameLatin.map(()=>"#ffffff")); // изначально белый (волна на десктопе не нужна тут)

  const srLetters = Array.from("SHOWREEL");
  const [srStick,setSrStick]=useState(srLetters.map(()=>false));
  const [srColors,setSrColors]=useState(srLetters.map(()=>"#ffffff"));

  // Один звук на букву за жест
  const dragTriggered = useRef({ bio: new Set(), name: new Set(), sr: new Set() });

  const activateLetter = (group, idx, setterStick, setterColor, sound="hover") => {
    const bucket = dragTriggered.current[group];
    if (!bucket.has(idx)) {
      bucket.add(idx);
      setterStick(prev => {
        if (!prev[idx]) { const a=[...prev]; a[idx]=true; return a; }
        return prev;
      });
      setterColor(c => { const a=[...c]; a[idx]=randColor(); return a; });
      sound === "click" ? playDot() : playHoverSoft();
    }
  };

  // Drag/scroll по буквам
  const draggingRef = useRef(false);
  const onPD = (e)=>{ 
    draggingRef.current=true; 
    dragTriggered.current = { bio:new Set(), name:new Set(), sr:new Set() };
    e.currentTarget.setPointerCapture?.(e.pointerId); 
    onPM(e); 
  };
  const onPU = ()=>{ 
    draggingRef.current=false; 
    // BIOGRAPHY — вернуть в белый и латиницу
    setStickBio(lettersBio.map(()=>false));
    setColorsBio(lettersBio.map(()=>"#ffffff"));
    // SHOWREEL — вернуть в белый
    setSrStick(srLetters.map(()=>false));
    setSrColors(srLetters.map(()=>"#ffffff"));
    // Имя — НИЧЕГО НЕ МЕНЯЕМ (по твоему ТЗ сейчас), только реакция при скролле по буквам
  };
  const onPM = (e)=>{
    if(!draggingRef.current) return;
    const x=e.clientX, y=e.clientY;
    const el = document.elementFromPoint(x,y);
    const idx = Number(el?.getAttribute?.("data-idx"));
    const group = el?.getAttribute?.("data-group");
    if(Number.isFinite(idx) && group){
      if(group==="bio")  activateLetter("bio", idx, setStickBio,  setColorsBio);
      if(group==="name") activateLetter("name", idx, setStickName, setColorsName);
      if(group==="sr")   activateLetter("sr", idx, setSrStick,   setSrColors);
    }
  };

  return (
    <>
      <div style={wrapper}>
        {/* КРУГ 1 — стеклянная плашка с дыханием (по центру) */}
        <div style={plateOuter}>
          <div className="glass-plate circle" style={plateStyle}>
            <i className="bend ring" /><i className="bend side left" /><i className="bend side right" />
            <i className="bend side top" /><i className="bend side bottom" />
          </div>
        </div>

        {/* Контент — центр круга; drag по буквам */}
        <div
          onPointerDown={onPD}
          onPointerMove={onPM}
          onPointerUp={onPU}
          onPointerCancel={onPU}
          style={{
            position:"absolute",
            left:"50%", top:"50%", transform:"translate(-50%,-50%)",
            width:"100%",
            display:"flex", flexDirection:"column",
            alignItems:"center", justifyContent:"center",
            textAlign:"center",
            zIndex:1,
            color:"#fff",
            textShadow:"0 1px 2px rgba(0,0,0,0.25)"
          }}
        >
          {/* BIOGRAPHY — кликабельно */}
          <PrePlate active={true}>
            <h2
              onClick={()=>{ playDot(); setBioOpen(true); }}
              style={{
                margin: 0,
                fontSize: "clamp(15px, 4.8vw, 20px)",
                letterSpacing: "0.08em",
                userSelect: "none",
                fontFamily: "'Royal Crescent','Uni Sans Heavy','Uni Sans',system-ui",
                fontWeight: 400,
                fontSynthesis: "none",
                cursor: "pointer"
              }}
              title="BIOGRAPHY"
            >
              {lettersBio.map((ch,i)=>(
                <span
                  key={i}
                  data-idx={i} data-group="bio"
                  onMouseEnter={()=>activateLetter("bio", i, setStickBio, setColorsBio)}
                  onPointerDown={()=>activateLetter("bio", i, setStickBio, setColorsBio, "click")}
                  style={{
                    display:"inline-block",
                    whiteSpace:"pre",
                    color: stickBio[i] ? colorsBio[i] : "#ffffff",
                    transform: stickBio[i] ? "scale(1.28)" : "scale(1)",
                    transition:"transform 140ms ease, color 160ms ease"
                  }}
                >
                  {stickBio[i] ? (mapBio[ch] || ch) : ch}
                </span>
              ))}
            </h2>
          </PrePlate>

          {/* Имя — РЕАГИРУЕТ ПО БУКВАМ при скролле (латиница→кириллица на активной букве) */}
          <PrePlate active={true}>
            <h1
              onClick={()=> { playDot(); setCircle2Open(true); }}
              style={{
                margin: "0.7em 0 0",
                fontSize: "clamp(18px, 6.6vw, 28px)",
                letterSpacing: "0.02em",
                userSelect: "none",
                cursor: "pointer",
                fontFamily:"'Rostov','Uni Sans Heavy','Uni Sans',system-ui",
                fontWeight: 800,
                fontSynthesis: "none",
              }}
              title="Подробнее"
            >
              {nameLatin.map((ch,i)=>(
                <span
                  key={i}
                  data-idx={i} data-group="name"
                  onMouseEnter={()=>activateLetter("name", i, setStickName, setColorsName)}
                  onPointerDown={()=>activateLetter("name", i, setStickName, setColorsName, "click")}
                  style={{
                    display:"inline-block",
                    whiteSpace:"pre",
                    color: stickName[i] ? colorsName[i] : "#ffffff",
                    transform: stickName[i] ? "scale(1.22)" : "scale(1)",
                    transition:"transform 140ms ease, color 160ms ease"
                  }}
                >
                  {/* замена по БУКВЕ, не всем словом */}
                  {stickName[i] ? (mapName[ch] || ch) : (ch===" " ? "\u00A0" : ch)}
                </span>
              ))}
            </h1>
          </PrePlate>

          {/* SHOWREEL — на строку ниже */}
          <PrePlate active={true}>
            <h3
              onClick={()=>{ playDot(); openShowreel(); }}
              style={{
                margin: "1.2em 0 0",
                fontSize: "clamp(13px, 4.2vw, 17px)",
                letterSpacing: "0.08em",
                color: "#ffffff",
                userSelect: "none",
                cursor:"pointer",
                fontFamily: "'Royal Crescent','Uni Sans Heavy','Uni Sans',system-ui",
                fontWeight: 400,
                fontSynthesis: "none",
              }}
              title="Открыть шоу-рил"
            >
              {srLetters.map((ch,i)=>(
                <span
                  key={i}
                  data-idx={i} data-group="sr"
                  onMouseEnter={()=>activateLetter("sr", i, setSrStick, setSrColors)}
                  onPointerDown={()=>activateLetter("sr", i, setSrStick, setSrColors, "click")}
                  style={{
                    display:"inline-block",
                    whiteSpace:"pre",
                    color: srStick[i] ? srColors[i] : "#ffffff",
                    transform: srStick[i] ? "scale(1.2)" : "scale(1)",
                    transition:"transform 140ms ease, color 160ms ease"
                  }}
                >
                  {ch}
                </span>
              ))}
            </h3>
          </PrePlate>
        </div>
      </div>

      {/* Соц-иконки */}
      <div
        style={{
          position: "fixed",
          left: "50%", transform: "translateX(-50%)",
          bottom: `calc(12px + env(safe-area-inset-bottom, 0px))`,
          display: "flex", justifyContent: "center", gap: 20, zIndex: 2147483601,
        }}
      >
        <IconLink
          href="https://instagram.com/rustamromanov.ru"
          label="Instagram"
          whiteSrc="/rustam-site/assents/icons/instagram-white.svg?v=3"
          colorSrc="/rustam-site/assents/icons/instagram-color.svg?v=3"
          onHoverSound={playDot}
          size={37}
        />
        <IconLink
          href="https://t.me/rustamromanov"
          label="Telegram"
          whiteSrc="/rustam-site/assents/icons/telegram-white.svg?v=3"
          colorSrc="/rustam-site/assents/icons/telegram-color.svg?v=3"
          onHoverSound={playDot}
          size={37}
        />
      </div>

      {/* Оверлеи */}
      <VideoOverlay open={playerOpen} onClose={()=>{ setPlayerOpen(false); setVimeoId(null); }} vimeoId={vimeoId} full />
      <BioMobileOverlay open={bioOpen} onClose={()=>setBioOpen(false)} imageSrc="/rustam-site/assents/foto/bio_mobile.jpg"/>
      {/* КРУГ 2: ДОПОЛНИТЕЛЬНО +5% ТОЛЬКО НА МОБИЛКЕ + ТЕКСТ ЕЩЁ +1 */}
      <Circle2Overlay
        open={circle2Open}
        onClose={()=>setCircle2Open(false)}
        diameter={Math.round(circleDiam * 1.25 * 1.10)}  // было +5% раньше, добавил ещё +5% (итого *1.10 от предыдущего)
        hideClose
        backdropClose
        bodyInc={1}  // к прежнему +1 добавляем ещё +1
      />

      {/* ЛОКАЛЬНЫЕ СТИЛИ ДЛЯ МОБИЛКИ (Важно: стиль стеклянной плашки дублируем здесь, иначе круга "нет") */}
      <style>{`
        .glass-plate.circle{
          background: rgba(255,255,255,0.07);
          -webkit-backdrop-filter: blur(16px) saturate(1.2);
          backdrop-filter: blur(16px) saturate(1.2);
          box-shadow: 0 12px 28px rgba(0,0,0,0.22);
          border-radius: 50%;
          overflow:hidden;
        }
        .glass-plate.circle::before{
          content:""; position:absolute; inset:-1px; border-radius:inherit; pointer-events:none;
          -webkit-backdrop-filter: blur(30px) saturate(1.25) brightness(1.02);
          backdrop-filter: blur(30px) saturate(1.25) brightness(1.02);
          -webkit-mask-image: radial-gradient(115% 115% at 50% 50%, rgba(0,0,0,0) 50%, rgba(0,0,0,1) 78%);
          mask-image: radial-gradient(115% 115% at 50% 50%, rgba(0,0,0,0) 50%, rgba(0,0,0,1) 78%);
        }
        .glass-plate.circle::after{
          content:""; position:absolute; inset:0; border-radius:inherit; pointer-events:none;
          background:
            radial-gradient(120% 160% at 50% -20%, rgba(255,255,255,0.10), rgba(255,255,255,0) 60%),
            radial-gradient(120% 160% at 50% 120%, rgba(255,255,255,0.08), rgba(255,255,255,0) 60%),
            radial-gradient(160% 120% at -20% 50%, rgba(255,255,255,0.06), rgba(255,255,255,0) 60%),
            radial-gradient(160% 120% at 120% 50%, rgba(255,255,255,0.06), rgba(255,255,255,0) 60%),
            linear-gradient(to bottom, rgba(255,255,255,0.05), rgba(255,255,255,0) 40%, rgba(255,255,255,0) 60%, rgba(255,255,255,0.05) 100%);
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.08), inset 0 -20px 60px rgba(0,0,0,0.15);
        }
        /* дыхание круга 1 */
        @keyframes mBreath { 
          0%,100%{ transform:translate(-50%,-50%) scale(1) } 
          50%{   transform:translate(-50%,-50%) scale(1.02) } 
        }
      `}</style>
    </>
  );
}



/* ===== Экспорт (автосвитч) ===== */
export default function CenterRevealCard() {
  const [isMobile,setIsMobile]=useState(typeof window!=="undefined" ? window.innerWidth<=MOBILE_BREAKPOINT : false);
  useEffect(()=>{
    const onR=()=>setIsMobile(window.innerWidth<=MOBILE_BREAKPOINT);
    window.addEventListener("resize",onR);
    window.addEventListener("orientationchange",onR);
    return ()=>{ window.removeEventListener("resize",onR); window.removeEventListener("orientationchange",onR); };
  },[]);
  return isMobile ? <MobileCard/> : <DesktopCard/>;
}
