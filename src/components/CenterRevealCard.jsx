// src/components/CenterRevealCard.jsx
import React, { useEffect, useRef, useState } from "react";

/* ===== Utils ===== */
const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
const within = (x,y,r)=> x>=r.left && x<=r.right && y>=r.top && y<=r.bottom;
const randColor = () => `hsl(${Math.floor(Math.random()*360)}, 86%, 60%)`;
const shuffle = (arr) => { const a=arr.slice(); for (let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j]]; } return a; };

/* Курсор (десктоп) */
const CURSOR_URL = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20'><circle cx='10' cy='10' r='6' fill='%23E53935'/><circle cx='10' cy='10' r='3' fill='%23ffffff'/></svg>`.replace(/\n|\s{2,}/g,"");

/* ===== Параметры плашки ===== */
const PLATE_OPACITY_MAX = 0.95;
const PLATE_EASE_POWER  = 1.35;
const PLATE_LERP        = 0.18;
const PLATE_SATURATE_INPUT = 0.30;
// принимаем 0..1 или проценты 0..100
const PLATE_SATURATE_FRACTION = PLATE_SATURATE_INPUT > 1 ? PLATE_SATURATE_INPUT/100 : PLATE_SATURATE_INPUT;

/* ===== Платформа ===== */
const MOBILE_BREAKPOINT = 768;

/* ===== Audio ===== */
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
    const o = ctx.createOscillator();
    const g = ctx.createGain();
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

/* ===== Соц-иконка (настраиваемый размер) ===== */
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

/* ===== Мягкая короткая тень (до появления плашки) ===== */
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

/* ===== BIO overlay (desktop) — крестик снаружи; звук -20% ===== */
function BioOverlay({ open, onClose, imageSrc }) {
  const [tab,setTab] = useState("bio");
  const audioRef = useRef(null);
  useEffect(()=>{ const a=audioRef.current; if(!a) return; if(open){ a.currentTime=0; a.volume=0.72; a.play().catch(()=>{});} else a.pause(); return ()=>a.pause(); },[open]);
  if(!open) return null;

  const textBio = `Я родился 4 декабря 1980 г в Ульяновске.

В конце 90-х я сделал свой первый клип. Камера Hi8, магнитофон и видеоплеер — как монтажный стол. Это была настоящая магия без компьютера.

В 2009-м я переехал в Москву. Снимал рэп-клипы на «зеркалку» с горящими глазами и верой, что всё получится. Получилось. 

В 2010 году я оказался в команде Gazgolder, а в 2011-м отправился с Бастой в тур по Америке. 

В 2012-м я снял первый документальный фильм о Тимати. Так началась большая глава с Black Star, а вместе с ней и десятки громких клипов.

2014 год стал переломным — клип L’One — «Океан» открыл для меня новые горизонты. А в 2015-м работа Doni feat. Натали — «Ты такой» побила все рекорды, став первым клипом в России, преодолевшим 100 млн просмотров на YouTube.

Дальше — сотни проектов, работа с артистами разных жанров и масштабов: от Макса Коржа, Iowa, Pizza до Стаса Михайлова,   Николая Баскова и Филиппа Киркорова. 

Сегодня мой багаж — 200+ проектов, более 2-х миллиардов просмотров и более сотни артистов.`;

  const textChar = `Я считаю, что успешный проект зависит не только от визуального воплощения идеи, но и от глубокого понимания потребностей клиента.

Я считаю, что успешный проект зависит не только от визуального воплощения идеи, но и от глубокого понимания потребностей и ожиданий клиента. 

В основу я кладу скорость принятия решений и приоритетность действий. Для меня важно строго придерживаться дедлайна, прогнозировать изменения и настраивать команду, на достижения лучшего результата.`;

  const inset="clamp(10px,1.2vw,18px)", headerFS="clamp(12px,1vw,18px)", leftPart="40%", padRightExtra="clamp(12px,2vw,30px)";
  const CLOSE_OFFSETS = { top: -14, right: -14 };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.82)", zIndex:2147485200, display:"flex", alignItems:"center", justifyContent:"center", padding:"3vw", animation:"bioFade 180ms ease" }}>
      <audio ref={audioRef} src="/rustam-site/assents/music/bio.mp3" preload="auto" loop />
      <div style={{ position:"relative", display:"inline-block", overflow:"visible" }}>
        <div onClick={(e)=>e.stopPropagation()} style={{ position:"relative", width:"min(44vw,60vh)", borderRadius:12, overflow:"hidden", background:"#000", boxShadow:"0 30px 80px rgba(0,0,0,0.55)", transform:"scale(0.7)", animation:"bioPop 280ms cubic-bezier(0.18,0.8,0.2,1) forwards" }}>
          <img src={imageSrc} alt="bio" style={{ display:"block", width:"100%", height:"100%", maxHeight:"60vh", objectFit:"cover", background:"#000", userSelect:"none", pointerEvents:"none" }}/>
          <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"row", alignItems:"stretch", pointerEvents:"none" }}>
            <div style={{ width:leftPart, height:"100%" }}/>
            <div style={{ position:"relative", width:`calc(100% - ${leftPart})`, height:"100%", paddingRight:`calc(${inset} + ${padRightExtra})`, paddingLeft:inset, pointerEvents:"auto" }}>
              <div style={{ position:"absolute", top:`calc(${inset} + (${headerFS} * 0.6))`, left:0, right:0, display:"flex", gap:"1.2em", alignItems:"center", whiteSpace:"nowrap", overflow:"hidden" }}>
                <button onClick={()=>setTab("bio")}
                  style={{ appearance:"none", background:"transparent", border:"none", padding:0, margin:0, cursor:"pointer",
                           fontFamily:"UniSans-Heavy, 'Uni Sans'", fontWeight:800, letterSpacing:"0.05em",
                           fontSize:headerFS, lineHeight:1.2, color: tab==="bio" ? "#E53935" : "#000" }}>БИОГРАФИЯ</button>
                <button onClick={()=>setTab("char")}
                  style={{ appearance:"none", background:"transparent", border:"none", padding:0, margin:0, cursor:"pointer",
                           fontFamily:"UniSans-Heavy, 'Uni Sans'", fontWeight:800, letterSpacing:"0.05em",
                           fontSize:headerFS, lineHeight:1.2, color: tab==="char" ? "#E53935" : "#000", marginLeft:"4ch" }}>ХАРАКТЕРИСТИКА</button>
              </div>
              <div style={{ position:"absolute", top:`calc(${inset} + (${headerFS} * 2.0))`, bottom:`calc(${inset} + ${headerFS} * 1)`, left:0, right:0 }}>
                <div lang="ru" style={{ position:"absolute", top:0, bottom:0, left:0, right:"-14px", overflow:"auto", paddingRight:`calc(${padRightExtra} + 14px)`,
                      color:"#000", fontFamily:"Jura, system-ui", fontWeight:400, fontSize:"clamp(12px, 0.9vw, 16px)", lineHeight:1.28, whiteSpace:"pre-wrap", textAlign:"justify", textAlignLast:"left" }}>
                  {tab==="bio" ? textBio : textChar}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Крестик — снаружи карточки */}
        <button aria-label="Close" onClick={onClose}
          style={{ position:"absolute", top:CLOSE_OFFSETS.top, right:CLOSE_OFFSETS.right, width:36, height:36, borderRadius:999, background:"rgba(0,0,0,0.65)", border:"1px solid rgba(255,255,255,0.45)", cursor:"pointer", display:"grid", placeItems:"center", boxShadow:"0 12px 26px rgba(0,0,0,0.5)", zIndex:10 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6l-12 12" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
        </button>
      </div>
      <style>{`
        @keyframes bioFade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes bioPop  { to { transform: scale(1) } }
      `}</style>
    </div>
  );
}

/* ===== BIO Mobile overlay ===== */
function BioMobileOverlay({ open, onClose, imageSrc }) {
  const [tab,setTab] = useState("bio");
  const audioRef = useRef(null);
  useEffect(()=>{ const a=audioRef.current; if(!a) return; if(open){ a.currentTime=0; a.volume=0.72; a.play().catch(()=>{});} else a.pause(); return ()=>a.pause(); },[open]);
  if(!open) return null;

  const textBio = `Я родился 4 декабря 1980 г в Ульяновске.

В конце 90-х я сделал свой первый клип. Камера Hi8, магнитофон и видеоплеер — как монтажный стол. Это была настоящая магия без компьютера.

В 2009-м я переехал в Москву. Снимал рэп-клипы на «зеркалку» с горящими глазами и верой, что всё получится. Получилось. 

В 2010 году я оказался в команде Gazgolder, а в 2011-м отправился с Бастой в тур по Америке. 

В 2012-м я снял первый документальный фильм о Тимати. Так началась большая глава с Black Star, а вместе с ней и десятки громких клипов.

2014 год стал переломным — клип L’One — «Океан» открыл для меня новые горизонты. А в 2015-м работа Doni feat. Натали — «Ты такой» побила все рекорды, став первым клипом в России, преодолевшим 100 млн просмотров на YouTube.

Дальше — сотни проектов, работа с артистами разных жанров и масштабов: от Макса Коржа, Iowa, Pizza до Стаса Михайлова,   Николая Баскова и Филиппа Киркорова. 

Сегодня мой багаж — 200+ проектов, более 2-х миллиардов просмотров и более сотни артистов.`;

  const textChar = `Я считаю, что успешный проект зависит не только от визуального воплощения идеи, но и от глубокого понимания потребностей клиента.

Я считаю, что успешный проект зависит не только от визуального воплощения идеи, но и от глубокого понимания потребностей и ожиданий клиента. 

В основу я кладу скорость принятия решений и приоритетность действий. Для меня важно строго придерживаться дедлайна, прогнозировать изменения и настраивать команду, на достижения лучшего результата.`;

  const deepRed = "#9e1010";

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.86)", zIndex:2147485600, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <audio ref={audioRef} src="/rustam-site/assents/music/bio.mp3" preload="auto" loop />
      <div style={{ position:"relative", width:"100vw", height:"100svh", overflow:"hidden", background:"#000" }}>
        <img src={imageSrc} alt="bio-mobile"
             style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover", objectPosition:"50% 65%" }}/>

        <div style={{ position:"absolute", top:"36%", left:"7%", right:"7%", display:"flex", gap:24, alignItems:"center" }}>
          <button onClick={()=>setTab("bio")}
            style={{ appearance:"none", background:"transparent", border:"none", padding:0, margin:0,
                     color: tab==="bio" ? deepRed : "rgba(255,255,255,0.94)", fontFamily:"UniSans-Heavy, 'Uni Sans'",
                     fontWeight:800, letterSpacing:"0.06em", fontSize:20, textShadow:"0 3px 8px rgba(0,0,0,0.35)" }}>
            БИОГРАФИЯ
          </button>
          <button onClick={()=>setTab("char")}
            style={{ appearance:"none", background:"transparent", border:"none", padding:0, margin:0,
                     color: tab==="char" ? deepRed : "rgba(255,255,255,0.94)", fontFamily:"UniSans-Heavy, 'Uni Sans'",
                     fontWeight:800, letterSpacing:"0.06em", fontSize:20, textShadow:"0 3px 8px rgba(0,0,0,0.35)" }}>
            ХАРАКТЕРИСТИКА
          </button>
        </div>

        <div style={{ position:"absolute", left:"6%", right:"6%", top:"calc(36% + 3.6em)", bottom:"0", overflow:"auto",
                      color:"#2f2f33", fontFamily:"Jura, system-ui", fontSize:16, lineHeight:1.32, paddingRight:12, paddingBottom:"12vh", whiteSpace:"pre-wrap" }}>
          {tab==="bio" ? textBio : textChar}
        </div>

        <button aria-label="Close" onClick={onClose}
          style={{ position:"absolute", top:"calc(env(safe-area-inset-top) + 8px)", right:12, width:40, height:40, borderRadius:999,
                   background:"rgba(0,0,0,0.55)", border:"1px solid rgba(255,255,255,0.4)", cursor:"pointer",
                   display:"grid", placeItems:"center", boxShadow:"0 6px 18px rgba(0,0,0,0.4)", zIndex:3 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6l-12 12" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
        </button>
      </div>
    </div>
  );
}

/* ===== Кнопка-точка ===== */
function DotButton({ n, onClick, onHoverSound, animate=false, delayMs=0, hoverExternal=false }) {
  const [hover,setHover] = useState(false);
  const active = hover || hoverExternal;
  return (
    <>
      <div style={{ display:"inline-block", animation: `${animate ? `dotRise 820ms cubic-bezier(.22,.9,.18,1) ${delayMs}ms both` : "none"}, breath 2600ms ease-in-out ${delayMs}ms infinite` }}>
        <button
          onClick={onClick}
          onMouseEnter={()=>{ setHover(true); onHoverSound?.(); }}
          onMouseLeave={()=> setHover(false)}
          style={{
            width:42, height:42, borderRadius:999,
            background: active ? "rgba(229,57,53,0.28)" : "rgba(210,210,210,0.18)",
            border: active ? "1px solid rgba(229,57,53,0.7)" : "1px solid rgba(180,180,180,0.55)",
            backdropFilter:"blur(10px)", WebkitBackdropFilter:"blur(10px)",
            color:"#fff", display:"inline-flex", alignItems:"center", justifyContent:"center",
            fontWeight:800, fontFamily:"UniSans-Heavy, 'Uni Sans', system-ui", fontSize:18,
            cursor:"pointer",
            transform: active ? "scale(1.3)" : "scale(1)",
            transition:"transform 140ms cubic-bezier(.2,.9,.2,1), background 240ms ease, border-color 240ms ease, box-shadow 240ms ease",
            boxShadow: active ? "0 10px 28px rgba(229,57,53,0.35)" : "none",
            animation: `dotColor 2600ms ease-in-out ${delayMs}ms infinite`
          }}
        >
          <span style={{ display:"inline-block", transform: active ? "scale(1.7)" : "scale(1)", transition:"transform 140ms cubic-bezier(.2,.9,.2,1)" }}>
            {n}
          </span>
        </button>
      </div>
      <style>{`
        @keyframes dotRise { 0%{transform:translateY(26px)} 58%{transform:translateY(-14px)} 100%{transform:translateY(6px)} }
        @keyframes breath { 0%,100%{transform:scale(1)} 45%{transform:scale(1.12)} }
        @keyframes dotColor {
          0%,100% { background: rgba(210,210,210,0.18); box-shadow:none; border-color:rgba(180,180,180,0.55); }
          45%     { background: rgba(229,57,53,0.28); box-shadow:0 10px 28px rgba(229,57,53,0.35); border-color:rgba(229,57,53,0.7); }
        }
      `}</style>
    </>
  );
}

/* ===== DESKTOP Card — круг на 10% больше; стартовая непрозрачность 50% ===== */
function DesktopCard() {
  const { playHoverSoft, playDot } = useAudio();

  const [fixedSize,setFixedSize]=useState({ w:520, h:320 });
  useEffect(()=>{ const vw=window.innerWidth; const w0=clamp(Math.round(vw*0.36),360,720); const h0=Math.round((w0/2*1.26)*0.9); setFixedSize({w:w0,h:h0}); },[]);
  const rectRef = useRef({ left:0, top:0, w:0, h:0 });
  const updateRect = ()=>{ const vw=window.innerWidth, vh=window.innerHeight; const {w,h}=fixedSize; rectRef.current={ left:Math.round((vw-w)/2), top:Math.round((vh-h)/2), w, h }; };
  useEffect(()=>{ updateRect(); },[fixedSize]);
  useEffect(()=>{ const f=()=>updateRect(); window.addEventListener("resize",f); return ()=>window.removeEventListener("resize",f); },[]);

  // === стартовая непрозрачность круга — 50% от финала
  const BASE_OPACITY = PLATE_OPACITY_MAX * 0.8;
  const plateTargetRef = useRef(BASE_OPACITY);
  const plateAlphaRef  = useRef(BASE_OPACITY);
  const [plateAlpha, setPlateAlpha] = useState(BASE_OPACITY);
  const [isInside, setIsInside] = useState(false);

  useEffect(()=>{ // плавное приближение к цели
    let raf=0;
    const tick=()=>{ const a=plateAlphaRef.current, t=plateTargetRef.current;
      const next=a+(t-a)*PLATE_LERP;
      if(Math.abs(next-a)>0.001){ plateAlphaRef.current=next; setPlateAlpha(next); }
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
        plateTargetRef.current = BASE_OPACITY; // вне — держим базовые 50%
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

  const wrapper = { position:"fixed", left:`${rectRef.current.left}px`, top:`${rectRef.current.top}px`, width:`${rectRef.current.w}px`, height:`${rectRef.current.h}px`, display:"flex", alignItems:"center", justifyContent:"center", padding:0, overflow:"visible", pointerEvents:"auto", zIndex:2147483600 };

  // круг был = min(w,h); стал на 10% больше
  const baseDiam = Math.min(rectRef.current.w, rectRef.current.h);
  const circleDiam = Math.round(baseDiam * 1.10);
  const plateStyle = { position:"absolute", width:circleDiam, height:circleDiam, left:"50%", top:"50%", transform:"translate(-50%,-50%)", borderRadius:"50%", opacity: plateAlpha, transition:"opacity 60ms linear", pointerEvents:"none" };

  const showreelText="DIRECTOR'S SHOWREEL";
  const nameLatin="RUSTAM ROMANOV";
  const map={ R:"Р", U:"У", S:"С", T:"Т", A:"А", M:"М", O:"О", N:"Н", V:"В", " ":"\u00A0", D:"D", I:"I", E:"E", C:"C", L:"L", H:"H", W:"W" };
  const titleBase=24; const titleFS=Math.round(titleBase*1.1);
  const directedFS = Math.round((titleFS/1.5)*1.2);
  const nameFS = Math.round(titleFS*1.32);

  const [nameStick,setNameStick]=useState(Array.from(nameLatin).map(()=>false));
  const [nameColors,setNameColors]=useState(Array.from(nameLatin).map(()=>"#cfcfcf"));
  const nameRef=useRef(null);
  const [srStick,setSrStick]=useState(Array.from(showreelText).map(()=>false));
  const [srColors,setSrColors]=useState(Array.from(showreelText).map(()=>"#bfbfbf"));
  const showreelRef=useRef(null);

  const circlesRef=useRef(null);
  const [circlesVisible,setCirclesVisible]=useState(false);
  const [circleOrder,setCircleOrder]=useState([0,1,2]);
  useEffect(()=>{ let last=circlesVisible; let af=null; const onMove=(e)=>{ if(af) cancelAnimationFrame(af); af=requestAnimationFrame(()=>{ const x=e.clientX,y=e.clientY;
      const sr=showreelRef.current?.getBoundingClientRect();
      const cr=circlesRef.current?.getBoundingClientRect();
      const nr=nameRef.current?.getBoundingClientRect();
      const overSR=sr?within(x,y,{left:sr.left,top:sr.top,right:sr.right,bottom:sr.bottom}):false;
      const overCR=cr?within(x,y,{left:cr.left,top:cr.top,right:cr.right,bottom:cr.bottom}):false;
      const overNM=nr?within(x,y,{left:nr.left,top:nr.top,right:nr.right,bottom:nr.bottom}):false;
      let next=last; if(overNM) next=false; else if(overSR||overCR) next=true;
      if(next!==last){ setCirclesVisible(next); if(next) setCircleOrder(shuffle([0,1,2])); last=next; } }); };
    window.addEventListener("mousemove",onMove,{passive:true}); return ()=>{ window.removeEventListener("mousemove",onMove); if(af) cancelAnimationFrame(af);} },[circlesVisible]);

  const contentWrap={ position:"relative", width:"100%", height:"100%", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", zIndex:1 };
  const headerWrap={ position:"relative", display:"flex", flexDirection:"column", alignItems:"center", gap: Math.round(titleFS*0.42), marginTop: Math.round((titleFS/1.5) * 3.2), color:"#fff", fontFamily:"UniSans-Heavy, 'Uni Sans', system-ui", textShadow:"0 1px 2px rgba(0,0,0,0.25)" };

  return (
    <>
      <div style={wrapper}>
        <div className="glass-plate circle" style={plateStyle}>
          <i className="bend ring" />
          <i className="bend side left" />
          <i className="bend side right" />
          <i className="bend side top" />
          <i className="bend side bottom" />
        </div>

        <div style={contentWrap}>
          <div style={headerWrap}>
            <PrePlate active={!isInside}>
              <div ref={showreelRef} onMouseLeave={() => setSrStick(Array.from(showreelText).map(()=>false))}
                   style={{ position:"relative", display:"inline-block", marginTop: Math.round(titleFS*0.3), marginBottom: Math.round(directedFS*0.2), cursor: `url(${CURSOR_URL}) 10 10, default` }}>
                <h2 style={{ margin:0, fontSize: directedFS, letterSpacing:"0.08em", whiteSpace:"nowrap", userSelect:"none", position:"relative", zIndex:1 }}>
                  {Array.from(showreelText).map((ch,i)=>(
                    <span key={`sr-${i}`}
                      onMouseEnter={()=>{ if(!srStick[i]) { playHoverSoft(); } setSrStick(s=>{const a=[...s]; a[i]=true; return a;}); setSrColors(c=>{const a=[...c]; a[i]=randColor(); return a;}); }}
                      style={{ display:"inline-block", whiteSpace:"pre", color: srStick[i] ? srColors[i] : "#bfbfbf",
                               transform: srStick[i] ? "scale(1.3)" : "scale(1)", transition:"transform 140ms ease, color 160ms ease" }}>
                      {ch===" " ? "\u00A0" : ch}
                    </span>
                  ))}
                </h2>
                <div ref={circlesRef}
                     style={{ position:"absolute", left:"50%", top:"0%", transform: circlesVisible ? "translate(-50%, -160%)" : "translate(-50%, 0%)", opacity: circlesVisible ? 1 : 0, transition:"transform 820ms cubic-bezier(.22,.9,.18,1), opacity 520ms ease", display:"flex", gap:16, alignItems:"center", pointerEvents: circlesVisible ? "auto" : "none", zIndex:3 }}>
                  {[1,2,3].map((n,idx)=>{
                    const delayMs = [0,1,2].indexOf(idx)*180;
                    return (
                      <DotButton key={n} n={n} animate={circlesVisible} delayMs={delayMs} onHoverSound={playDot}
                                 onClick={()=>{ setVimeoId({1:"1118465522",2:"1118467509",3:"1001147905"}[n]); setPlayerOpen(true); }}/>
                    );
                  })}
                </div>
              </div>
            </PrePlate>

            <PrePlate active={!isInside}>
              <h1 ref={nameRef} onMouseLeave={() => setNameStick(Array.from(nameLatin).map(()=>false))}
                  style={{ margin:0, fontSize:nameFS, letterSpacing:"0.02em", whiteSpace:"nowrap", userSelect:"none", cursor: `url(${CURSOR_URL}) 10 10, default` }}>
                {Array.from(nameLatin).map((ch,i)=>{
                  const cyr = map[ch] || ch;
                  const show = nameStick[i] ? (cyr===" " ? "\u00A0" : cyr) : (ch===" " ? "\u00A0" : ch);
                  return (
                    <span key={`n-${i}`}
                      onMouseEnter={()=>{ if(!nameStick[i]) { playHoverSoft(); } setNameStick(s=>{const a=[...s]; a[i]=true; return a;}); setNameColors(c=>{const a=[...c]; a[i]=randColor(); return a;}); }}
                      style={{ display:"inline-block", whiteSpace:"pre", cursor:"inherit", color: nameStick[i] ? nameColors[i] : "#cfcfcf",
                               transform: nameStick[i] ? "scale(1.3)" : "scale(1)", transition:"transform 140ms ease, color 160ms ease",
                               textShadow:"0 1px 2px rgba(0,0,0,0.25)" }}>
                      {show}
                    </span>
                  );
                })}
              </h1>
            </PrePlate>

            <div style={{ marginTop: Math.round(titleFS*0.9) }}>
              <PrePlate active={!isInside}>
                <BiographyWordPerLetter onOpen={()=>setBioOpen(true)} />
              </PrePlate>
            </div>

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

      <style>{`
        .glass-plate.circle{ background: rgba(255,255,255,0.07); -webkit-backdrop-filter: blur(16px) saturate(1.2); backdrop-filter: blur(16px) saturate(1.2); box-shadow: 0 12px 28px rgba(0,0,0,0.22); border-radius: 50%; overflow:hidden;}
        .glass-plate.circle::before{ content:""; position:absolute; inset:-1px; border-radius:inherit; pointer-events:none; -webkit-backdrop-filter: blur(30px) saturate(1.25) brightness(1.02); backdrop-filter: blur(30px) saturate(1.25) brightness(1.02); -webkit-mask-image: radial-gradient(115% 115% at 50% 50%, rgba(0,0,0,0) 50%, rgba(0,0,0,1) 78%); mask-image: radial-gradient(115% 115% at 50% 50%, rgba(0,0,0,0) 50%, rgba(0,0,0,1) 78%);}
        .glass-plate.circle::after{ content:""; position:absolute; inset:0; border-radius:inherit; pointer-events:none; background: radial-gradient(120% 160% at 50% -20%, rgba(255,255,255,0.10), rgba(255,255,255,0) 60%), radial-gradient(120% 160% at 50% 120%, rgba(255,255,255,0.08), rgba(255,255,255,0) 60%), radial-gradient(160% 120% at -20% 50%, rgba(255,255,255,0.06), rgba(255,255,255,0) 60%), radial-gradient(160% 120% at 120% 50%, rgba(255,255,255,0.06), rgba(255,255,255,0) 60%), linear-gradient(to bottom, rgba(255,255,255,0.05), rgba(255,255,255,0) 40%, rgba(255,255,255,0) 60%, rgba(255,255,255,0.05) 100%); box-shadow: inset 0 0 0 1px rgba(255,255,255,0.08), inset 0 -20px 60px rgba(0,0,0,0.15);}
        @keyframes shimmerGray { 0%,100% { color: #cfcfcf } 50% { color: #7a7a7a } }
        @keyframes waveGray { 0%,100% { color: #bfbfbf } 50% { color: #e0e0e0 } }
      `}</style>
    </>
  );
}

/* ===== BIOGRAPHY per-letter (desktop) ===== */
function BiographyWordPerLetter({ onOpen }) {
  const { playIcon } = useAudio();
  const latin = Array.from("BIOGRAPHY");
  const map = { B:"Б", I:"И", O:"О", G:"Г", R:"Р", A:"А", P:"Ф", H:"И", Y:"Я" };
  const [stick,setStick]=useState(latin.map(()=>false));
  const [colors,setColors]=useState(latin.map(()=>"#ffffff"));
  return (
    <h2 onClick={onOpen} onMouseLeave={()=>setStick(latin.map(()=>false))}
        style={{ margin:0, cursor:"pointer", fontSize:"clamp(12px,1.2vw,18px)", userSelect:"none", display:"inline-block", whiteSpace:"nowrap", letterSpacing:"0.08em" }}>
      {latin.map((ch,i)=>(
        <span key={`bio-${i}`}
          onMouseEnter={()=>{ if(!stick[i]) { playIcon(); } setStick(s=>{const a=[...s]; a[i]=true; return a;}); setColors(c=>{const a=[...c]; a[i]=randColor(); return a;}); }}
          style={{ display:"inline-block", transformOrigin:"50% 50%", transform: stick[i] ? "scale(1.35)" : "scale(1)", color: stick[i] ? colors[i] : "#ffffff", transition:"transform 140ms ease, color 160ms ease" }}>
          {stick[i] ? (map[ch] || ch) : ch}
        </span>
      ))}
    </h2>
  );
}

/* ===== Mobile Card — ТОЛЬКО ЭТОТ БЛОК ЗАМЕНИ ===== */
function MobileCard() {
  const { playHoverSoft, playDot } = useAudio();
  const [bioOpen,setBioOpen]=useState(false);
  const [playerOpen,setPlayerOpen]=useState(false);
  const [vimeoId,setVimeoId]=useState(null);

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

  // круг — как раньше (увеличенный), 1.35 от базового
  const circleDiam = Math.round(Math.min(size.w, size.h) * 1.35);
  const plateStyle = {
    position:"absolute", width:circleDiam, height:circleDiam,
    left:"50%", top:"50%", transform:"translate(-50%,-50%)",
    borderRadius:"50%", opacity: PLATE_OPACITY_MAX, pointerEvents:"none"
  };

  // тексты
  const lettersBio = Array.from("BIOGRAPHY");
  const mapBio = { B:"Б", I:"И", O:"О", G:"Г", R:"Р", A:"А", P:"Ф", H:"И", Y:"Я" };
  const [stickBio,setStickBio]=useState(lettersBio.map(()=>false));
  const [colorsBio,setColorsBio]=useState(lettersBio.map(()=>"#ffffff"));

  const nameLatin = Array.from("RUSTAM ROMANOV");
  const mapName = { R:"Р", U:"У", S:"С", T:"Т", A:"А", M:"М", O:"О", N:"Н", V:"В", " ":"\u00A0" };
  const [stickName,setStickName]=useState(nameLatin.map(()=>false));
  const [colorsName,setColorsName]=useState(nameLatin.map(()=>"#cfcfcf"));

  const srLetters = Array.from("DIRECTOR'S SHOWREEL");
  const [srStick,setSrStick]=useState(srLetters.map(()=>false));
  const [srColors,setSrColors]=useState(srLetters.map(()=>"#bfbfbf"));

  // интерактив скролл-шифт по буквам + кружки
  const dotsRef = useRef(null);
  const [hoverDot,setHoverDot]=useState(-1);
  const draggingRef = useRef(false);
  const lastSoundRef = useRef(0);
  const lastDotRef   = useRef(-1);
  const tryPlayHover = () => {
    const now = performance.now();
    if (now - lastSoundRef.current > 90) { lastSoundRef.current = now; playHoverSoft(); }
  };

  const hitLetter = (el, setterStick, setterColor) => {
    const idx = Number(el?.getAttribute?.("data-idx"));
    if(!Number.isFinite(idx)) return;
    setterStick(prev=>{ if(!prev[idx]) { const a=[...prev]; a[idx]=true; return a; } return prev; });
    setterColor(c=>{ const a=[...c]; a[idx]=randColor(); return a; });
    tryPlayHover();
  };

  const handlePointerDown = (e)=>{ draggingRef.current=true; e.currentTarget.setPointerCapture?.(e.pointerId); handlePointerMove(e); };
  const handlePointerUp   = ()=>{ draggingRef.current=false; setHoverDot(-1); lastDotRef.current=-1; };
  const handlePointerMove = (e)=>{
    if(!draggingRef.current) return;
    const x=e.clientX, y=e.clientY;
    const el = document.elementFromPoint(x,y);
    if(el?.closest?.("[data-bio]"))  hitLetter(el, setStickBio,  setColorsBio);
    if(el?.closest?.("[data-name]")) hitLetter(el, setStickName, setColorsName);
    if(el?.closest?.("[data-sr]"))   hitLetter(el, setSrStick,   setSrColors);

    if(dotsRef.current){
      const kids = Array.from(dotsRef.current.querySelectorAll("[data-dot]"));
      let hit=-1; kids.forEach((k,i)=>{ const r=k.getBoundingClientRect(); if(x>=r.left && x<=r.right && y>=r.top && y<=r.bottom) hit=i; });
      if(hit!==hoverDot){ setHoverDot(hit); if(hit!==-1 && hit!==lastDotRef.current){ lastDotRef.current=hit; playDot(); } }
    }
  };

  // «строки» для сдвигов
  const ONE_LINE = "1.2em";
  const HALF_LINE = "0.6em";

  return (
    <>
      <div
        style={wrapper}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div className="glass-plate circle" style={plateStyle}>
          <i className="bend ring" />
          <i className="bend side left" />
          <i className="bend side right" />
          <i className="bend side top" />
          <i className="bend side bottom" />
        </div>

        <div style={{
          position:"relative", zIndex:1, width:"100%", height:"100%",
          display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
          color:"#fff", fontFamily:"UniSans-Heavy, 'Uni Sans'", textShadow:"0 1px 2px rgba(0,0,0,0.25)"
        }}>
          {/* BIOGRAPHY — ниже на 2 строки */}
          <PrePlate active={true}>
            <h2
              data-bio
              onClick={()=>setBioOpen(true)}
              style={{ margin:0, marginTop:`calc(${ONE_LINE} * 2)`, fontSize:"clamp(16px, 5.2vw, 22px)", letterSpacing:"0.08em", userSelect:"none" }}
            >
              {lettersBio.map((ch,i)=>(
                <span
                  key={i}
                  data-idx={i}
                  style={{
                    display:"inline-block", whiteSpace:"pre",
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

          {/* RUSTAM ROMANOV — ниже на 1 строку */}
          <PrePlate active={true}>
            <h1
              data-name
              style={{ margin:`${ONE_LINE} 0 0`, fontSize:"clamp(20px, 7.2vw, 32px)", letterSpacing:"0.02em", userSelect:"none" }}
            >
              {nameLatin.map((ch,i)=>(
                <span
                  key={i}
                  data-idx={i}
                  style={{
                    display:"inline-block", whiteSpace:"pre",
                    color: stickName[i] ? colorsName[i] : "#cfcfcf",
                    transform: stickName[i] ? "scale(1.28)" : "scale(1)",
                    transition:"transform 140ms ease, color 160ms ease",
                    animation: stickName[i] ? "none" : `waveGray 1800ms ease-in-out ${i*90}ms infinite`
                  }}
                >
                  {stickName[i] ? (mapName[ch] || ch) : (ch===" " ? "\u00A0" : ch)}
                </span>
              ))}
            </h1>
          </PrePlate>

          {/* DIRECTOR'S SHOWREEL — ниже на полстроки */}
          <PrePlate active={true}>
            <h3
              data-sr
              style={{ margin:`${HALF_LINE} 0 0`, fontSize:"clamp(14px, 4.6vw, 18px)", letterSpacing:"0.08em", color:"#cfcfcf", userSelect:"none" }}
            >
              {srLetters.map((ch,i)=>(
                <span
                  key={i}
                  data-idx={i}
                  style={{
                    display:"inline-block", whiteSpace:"pre",
                    color: srStick[i] ? srColors[i] : "#cfcfcf",
                    transform: srStick[i] ? "scale(1.2)" : "scale(1)",
                    transition:"transform 140ms ease, color 160ms.ease"
                  }}
                >
                  {ch===" " ? "\u00A0" : ch}
                </span>
              ))}
            </h3>
          </PrePlate>

          {/* Кружочки — сразу под DIRECTOR'S */}
          <div ref={dotsRef} style={{ marginTop:HALF_LINE, display:"flex", gap:16, alignItems:"center" }}>
            {[1,2,3].map((n,idx)=>(
              <div key={n} data-dot>
                <DotButton
                  n={n}
                  delayMs={idx*200}
                  hoverExternal={hoverDot===idx}
                  onHoverSound={playDot}
                  onClick={()=>{ setVimeoId({1:"1118465522",2:"1118467509",3:"1001147905"}[n]); setPlayerOpen(true); }}
                />
              </div>
            ))}
          </div>

          {/* Соц-иконки — под кружками, размер +20% (31 → 37) */}
          <div style={{ marginTop:`calc(${ONE_LINE})`, display:"flex", justifyContent:"center", gap:20 }}>
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
        </div>
      </div>

      {/* оверлеи — как были */}
      <VideoOverlay open={playerOpen} onClose={()=>{ setPlayerOpen(false); setVimeoId(null); }} vimeoId={vimeoId} full />
      <BioMobileOverlay open={bioOpen} onClose={()=>setBioOpen(false)} imageSrc="/rustam-site/assents/foto/bio_mobile.jpg"/>

      {/* локальные анимации */}
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
        @keyframes waveGray { 0%,100% { color: #bfbfbf } 50% { color: #e0e0e0 } }
      `}</style>
    </>
  );
}


/* ===== Vimeo overlay ===== */
function VideoOverlay({ open, onClose, vimeoId, full=true }) {
  const dragRef = useRef({active:false,startY:0,dy:0});
  const iframeRef = useRef(null);
  const [isMuted, setIsMuted] = useState(full ? true : false);
  if (!open) return null;

  const onPD = (e)=>{ if(!full) return; dragRef.current={active:true,startY:e.clientY,dy:0}; e.currentTarget.setPointerCapture?.(e.pointerId); };
  const onPM = (e)=>{ if(!full) return; const d=dragRef.current; if(!d.active) return; d.dy=e.clientY-d.startY; const panel=e.currentTarget.querySelector(".player-panel"); if(panel){ panel.style.transform=`translateY(${d.dy}px)`; panel.style.opacity=String(clamp(1-Math.abs(d.dy)/260,0.25,1)); } };
  const onPU = (e)=>{ if(!full) return; const d=dragRef.current; dragRef.current={active:false,startY:0,dy:0}; const panel=e.currentTarget.querySelector(".player-panel"); if(!panel) return; if(Math.abs(d.dy)>140){ onClose(); } else { panel.style.transition="transform 220ms ease, opacity 220ms ease"; panel.style.transform="translateY(0)"; panel.style.opacity="1"; setTimeout(()=>{ panel.style.transition=""; },230); } };

  const post = (method, value)=>{ try{ iframeRef.current?.contentWindow?.postMessage({ method, value }, "*"); }catch{} };

  const onIframeLoad = ()=> {
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
    <div onPointerDown={onPD} onPointerMove={onPM} onPointerUp={onPU} onPointerCancel={onPU}
         style={{ position:"fixed", inset:0, zIndex:2147486000, background:"rgba(0,0,0,0.96)", display:"flex", alignItems:"center", justifyContent:"center", padding:"3vw" }}>
      <button aria-label="Close" onClick={onClose}
        style={{ position:"absolute", top:"calc(2.2em + env(safe-area-inset-top))", right:16, width:40, height:40, borderRadius:999, background:"rgba(0,0,0,0.55)", border:"1px solid rgba(255,255,255,0.35)", cursor:"pointer", display:"grid", placeItems:"center", zIndex:2 }}>
        <svg width="18" height="18" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6l-12 12" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
      </button>

      <div className="player-panel" onClick={(e)=>e.stopPropagation()} style={containerStyle}>
        <iframe
          id="vimeo-embed"
          ref={iframeRef}
          src={`https://player.vimeo.com/video/${vimeoId}?autoplay=1&muted=${queryMuted}&controls=1&playsinline=1&title=0&byline=0&portrait=0&transparent=0&autopause=1`}
          title="Vimeo player" frameBorder="0" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowFullScreen
          onLoad={onIframeLoad}
          style={{ position:"absolute", inset:0, width:"100%", height:"100%", display:"block", background:"#000" }}
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
