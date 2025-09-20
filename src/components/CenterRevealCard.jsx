// src/components/CenterRevealCard.jsx
import React, { useEffect, useRef, useState } from "react";

/* ===== Utils ===== */
const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
const within = (x,y,r)=> x>=r.left && x<=r.right && y>=r.top && y<=r.bottom;
const randColor = () => `hsl(${Math.floor(Math.random()*360)}, 86%, 60%)`;
const shuffle = (arr) => { const a=arr.slice(); for (let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]} return a; };

/* Цветной курсор (Safari ок) */
const CURSOR_URL = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20'><circle cx='10' cy='10' r='6' fill='%23E53935'/><circle cx='10' cy='10' r='3' fill='%23ffffff'/></svg>`.replace(/\n|\s{2,}/g,"");

/* ===== Audio (как было в прошлой версии) ===== */
function useAudio() {
  const ctxRef = useRef(null);
  const getCtx = async () => {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      if (!ctxRef.current) ctxRef.current = new Ctx();
      if (ctxRef.current.state === "suspended") await ctxRef.current.resume().catch(()=>{});
      return ctxRef.current;
    } catch { return null; }
  };

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

  // Мягкий «поп» — быстрый удар и затухание
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

/* ===== Social Icon ===== */
function IconLink({ href, whiteSrc, colorSrc, label, onHoverSound }) {
  const [hover, setHover] = useState(false);
  return (
    <a
      href={href} target="_blank" rel="noreferrer" aria-label={label}
      onMouseEnter={async () => { setHover(true); await onHoverSound?.(); }}
      onMouseLeave={() => setHover(false)}
      style={{
        position:"relative", width:28, height:28,
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

/* ===== DotButton: полёт — на обёртке; масштаб — на кнопке ===== */
function DotButton({ n, onClick, onHoverSound, animate=false, delayMs=0 }) {
  const [hover,setHover] = useState(false);
  return (
    <>
      <div
        style={{
          display:"inline-block",
          animation: animate ? `dotRise 820ms cubic-bezier(.22,.9,.18,1) ${delayMs}ms both` : "none"
        }}
      >
        <button
          onClick={onClick}
          onMouseEnter={async ()=>{ setHover(true); await onHoverSound?.(); }}
          onMouseLeave={()=> setHover(false)}
          style={{
            width:42, height:42, borderRadius:999,
            background: hover ? "rgba(229,57,53,0.28)" : "rgba(210,210,210,0.18)",
            border: hover ? "1px solid rgba(229,57,53,0.7)" : "1px solid rgba(180,180,180,0.55)",
            backdropFilter:"blur(10px)", WebkitBackdropFilter:"blur(10px)",
            color:"#fff", display:"inline-flex", alignItems:"center", justifyContent:"center",
            fontWeight:800, fontFamily:"UniSans-Heavy, 'Uni Sans', system-ui", fontSize:18,
            cursor:"pointer",
            transform: hover ? "scale(1.3)" : "scale(1)",              // <— растёт именно кружок
            transition:"transform 140ms cubic-bezier(.2,.9,.2,1), background 240ms ease, border-color 240ms ease",
            boxShadow: hover ? "0 10px 28px rgba(229,57,53,0.35)" : "none",
          }}
        >
          <span
            style={{
              display:"inline-block",
              transform: hover ? "scale(1.7)" : "scale(1)",            // цифра ещё больше
              transition:"transform 140ms cubic-bezier(.2,.9,.2,1)",
            }}
          >
            {n}
          </span>
        </button>
      </div>

      <style>{`
        @keyframes dotRise {
          0%   { transform: translateY(26px); opacity: 0; }
          58%  { transform: translateY(-14px); opacity: 1; }
          100% { transform: translateY(6px);  opacity: 1; }
        }
      `}</style>
    </>
  );
}

/* ===== BIO overlay (как было) ===== */
function BioOverlay({ open, onClose, imageSrc }) {
  const [tab,setTab] = useState("bio");
  const audioRef = useRef(null);
  useEffect(()=>{ const a=audioRef.current; if(!a) return; if(open){ a.currentTime=0;a.volume=0.9;a.play().catch(()=>{});} else a.pause(); return ()=>a.pause(); },[open]);
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

  return (
    <div onClick={onClose}
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.82)", zIndex:2147485200, display:"flex", alignItems:"center", justifyContent:"center", padding:"3vw", animation:"bioFade 180ms ease" }}>
      <audio ref={audioRef} src="/rustam-site/assents/music/bio.mp3" preload="auto"/>
      <div onClick={(e)=>e.stopPropagation()} onMouseLeave={onClose}
        style={{ position:"relative", width:"min(44vw,60vh)", borderRadius:12, overflow:"hidden", background:"#000", boxShadow:"0 30px 80px rgba(0,0,0,0.55)", transform:"scale(0.7)", animation:"bioPop 280ms cubic-bezier(0.18,0.8,0.2,1) forwards" }}>
        <img src={imageSrc} alt="bio" style={{ display:"block", width:"100%", height:"100%", maxHeight:"60vh", objectFit:"cover", background:"#000", userSelect:"none", pointerEvents:"none" }}/>
        <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"row", alignItems:"stretch", pointerEvents:"none" }}>
          <div style={{ width:leftPart, height:"100%" }}/>
          <div style={{ position:"relative", width:`calc(100% - ${leftPart})`, height:"100%", paddingRight:`calc(${inset} + ${padRightExtra})`, paddingLeft:inset, pointerEvents:"auto" }}>
            <div style={{ position:"absolute", top:`calc(${inset} + (${headerFS} * 1))`, left:0, right:0, display:"flex", gap:"1.2em", alignItems:"center", whiteSpace:"nowrap", overflow:"hidden" }}>
              <button onClick={()=>setTab("bio")} onMouseEnter={()=>setTab("bio")}
                style={{ appearance:"none", background:"transparent", border:"none", padding:0, margin:0, cursor:"pointer",
                         fontFamily:"UniSans-Heavy, 'Uni Sans'", fontWeight:800, letterSpacing:"0.05em",
                         fontSize:headerFS, lineHeight:1.2, color: tab==="bio" ? "#E53935" : "#000" }}>БИОГРАФИЯ</button>
              <button onClick={()=>setTab("char")} onMouseEnter={()=>setTab("char")}
                style={{ appearance:"none", background:"transparent", border:"none", padding:0, margin:0, cursor:"pointer",
                         fontFamily:"UniSans-Heavy, 'Uni Sans'", fontWeight:800, letterSpacing:"0.05ем",
                         fontSize:headerFS, lineHeight:1.2, color: tab==="char" ? "#E53935" : "#000", marginLeft:"4ch" }}>ХАРАКТЕРИСТИКА</button>
            </div>
            <div style={{ position:"absolute", top:`calc(${inset} + (${headerFS} * 3.2))`, bottom:`calc(${inset} + ${headerFS} * 1)`, left:0, right:0 }}>
              <div lang="ru" style={{ position:"absolute", top:0, bottom:0, left:0, right:"-14px", overflow:"auto", paddingRight:`calc(${padRightExtra} + 14px)`,
                    color:"#000", fontFamily:"Jura, system-ui", fontWeight:400, fontSize:"clamp(12px, 0.9vw, 16px)", lineHeight:1.28, whiteSpace:"pre-wrap", textAlign:"justify", textAlignLast:"left" }}>
                {tab==="bio" ? textBio : textChar}
              </div>
            </div>
          </div>
        </div>
        <button aria-label="Close" onClick={onClose}
          style={{ position:"absolute", top:-34, right:-8, width:34, height:34, borderRadius:999, background:"rgba(0,0,0,0.55)", border:"1px solid rgba(255,255,255,0.35)", cursor:"pointer", display:"grid", placeItems:"center", boxShadow:"0 6px 18px rgba(0,0,0,0.4)" }}>
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

/* ===== Desktop card ===== */
function DesktopCard() {
  const { playHoverSoft, playIcon, playDot, playAppear } = useAudio();

  /* фиксированный размер */
  const [fixedSize,setFixedSize]=useState({ w:520, h:320 });
  useEffect(()=>{ const vw=window.innerWidth; const w0=clamp(Math.round(vw*0.36),360,720); const h0=Math.round((w0/2*1.26)*0.9); setFixedSize({w:w0,h:h0}); },[]);
  const rectRef = useRef({ left:0, top:0, w:0, h:0 });
  const updateRect = ()=>{ const vw=window.innerWidth, vh=window.innerHeight; const {w,h}=fixedSize; rectRef.current={ left:Math.round((vw-w)/2), top:Math.round((vh-h)/2), w, h }; };
  useEffect(()=>{ updateRect(); },[fixedSize]);
  useEffect(()=>{ const f=()=>updateRect(); window.addEventListener("resize",f); return ()=>window.removeEventListener("resize",f); },[]);

  /* появление */
  const [cardShown,setCardShown]=useState(false); const [popAnim,setPopAnim]=useState(false);
  useEffect(()=>{ if(cardShown) return; let af=null; const onMove=(e)=>{ if(af) cancelAnimationFrame(af); af=requestAnimationFrame(async()=>{ const r=rectRef.current; const inside=within(e.clientX,e.clientY,{left:r.left,top:r.top,right:r.left+r.w,bottom:r.top+r.h}); if(inside&&!cardShown){ setCardShown(true); setPopAnim(true); setTimeout(()=>setPopAnim(false),450);} });}; window.addEventListener("mousemove",onMove,{passive:true}); return ()=>{ window.removeEventListener("mousemove",onMove); if(af) cancelAnimationFrame(af);} },[cardShown,playAppear]);

  /* модалки */
  const [playerOpen,setPlayerOpen]=useState(false);
  const [vimeoId,setVimeoId]=useState(null);
  const [bioOpen,setBioOpen]=useState(false);

  const card = {
    position:"fixed", left:`${rectRef.current.left}px`, top:`${rectRef.current.top}px`,
    width:`${rectRef.current.w}px`, height:`${rectRef.current.h}px`,
    display:"flex", alignItems:"center", justifyContent:"center",
    padding:0, pointerEvents: cardShown ? "auto" : "none", overflow:"hidden",
    background:"rgba(255,255,255,0.07)", WebkitBackdropFilter:"blur(16px)", backdropFilter:"blur(16px)",
    borderRadius:16, border:"none", boxShadow:"0 12px 28px rgba(0,0,0,0.22)", color:"#fff",
    fontFamily:"UniSans-Heavy, 'Uni Sans', system-ui",
    transformOrigin:"50% 50%", transform: cardShown ? "scale(1)" : "scale(0.6)", opacity: cardShown ? 1 : 0,
    animation: cardShown && popAnim ? "cardPop 450ms cubic-bezier(.2,.9,.18,1) both" : "none",
    transition: cardShown ? "none" : "opacity 200ms ease, transform 200ms ease", zIndex:2147483600,
  };

  /* типографика */
  const latin="RUSTAM ROMANOV";
  const map={ R:"Р", U:"У", S:"С", T:"Т", A:"А", M:"М", O:"О", N:"Н", V:"В", " ":"\u00A0" };
  const titleBase=24; const titleFS=Math.round(titleBase*1.1); const directedFS=Math.round(titleFS/1.5);

  /* sticky-состояния и цвета */
  const [nameStick,setNameStick]=useState(Array.from(latin).map(()=>false));
  const [nameColors,setNameColors]=useState(Array.from(latin).map(()=>"#cfcfcf"));
  const nameRef=useRef(null);

  const showreelText="DIRECTOR'S SHOWREEL";
  const [srStick,setSrStick]=useState(Array.from(showreelText).map(()=>false));
  const [srColors,setSrColors]=useState(Array.from(showreelText).map(()=>"#bfbfbf"));
  const showreelRef=useRef(null);

  /* кружки */
  const circlesRef=useRef(null);
  const [circlesVisible,setCirclesVisible]=useState(false);
  const [circleOrder,setCircleOrder]=useState([0,1,2]);
  const baseStagger=180;
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

  /* layout: ПОДНЯЛО всё содержимое на одну строку (уменьшил marginTop) */
  const content={ position:"relative", width:"100%", height:"100%", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" };
  const headerWrap={
    position:"relative", display:"flex", flexDirection:"column", alignItems:"center",
    gap: Math.round(titleFS*0.42),
    marginTop: Math.round((titleFS/1.5) * 3.2), // было 4.2 — поднял весь блок на ~одну строку
  };

  return (
    <>
      <div style={card}>
        <div style={content}>
          <div style={headerWrap}>

            {/* SHOWREEL — ниже имени как раньше; shimmer серого, когда не ховер */}
            <div
              ref={showreelRef}
              onMouseLeave={() => setSrStick(Array.from(showreelText).map(()=>false))}
              style={{ position:"relative", display:"inline-block",
                       marginTop: Math.round(titleFS*1.7), marginBottom: Math.round(-directedFS*0.35),
                       cursor: `url(${CURSOR_URL}) 10 10, default` }}
            >
              <h2 style={{ margin:0, fontSize: directedFS, letterSpacing:"0.08em", whiteSpace:"nowrap", userSelect:"none" }}>
                {Array.from(showreelText).map((ch,i)=>(
                  <span
                    key={`sr-${i}`}
                    onMouseEnter={async ()=>{ setSrStick(s=>{const a=[...s]; a[i]=true; return a;}); setSrColors(c=>{const a=[...c]; a[i]=randColor(); return a;}); await playHoverSoft(); }}
                    style={{
                      display:"inline-block", whiteSpace:"pre",
                      color: srStick[i] ? srColors[i] : "#bfbfbf",
                      transform: srStick[i] ? "scale(1.3)" : "scale(1)",
                      transition:"transform 140ms ease, color 160ms ease",
                      animation: srStick[i] ? "none" : `shimmerGray 1600ms ease-in-out ${i*70}ms infinite`,
                    }}
                  >
                    {ch===" " ? "\u00A0" : ch}
                  </span>
                ))}
              </h2>

              {/* Кружочки — ПОДНЯЛ ВЫШЕ и масштаб именно кнопки */}
              <div
                ref={circlesRef}
                style={{
                  position:"absolute", left:"50%", top:"0%",
                  transform: circlesVisible ? "translate(-50%, -160%)" : "translate(-50%, 0%)", // было -130%
                  opacity: circlesVisible ? 1 : 0,
                  transition:"transform 820ms cubic-bezier(.22,.9,.18,1), opacity 520ms ease",
                  display:"flex", gap:16, alignItems:"center", pointerEvents: circlesVisible ? "auto" : "none", zIndex:3
                }}
              >
                {[1,2,3].map((n,idx)=>{
                  const orderPos = circleOrder.indexOf(idx);
                  const delayMs = orderPos*baseStagger;
                  return (
                    <DotButton
                      key={n}
                      n={n}
                      animate={circlesVisible}
                      delayMs={delayMs}
                      onHoverSound={playDot}
                      onClick={()=>{ setVimeoId({1:"1118465522",2:"1118467509",3:"1001147905"}[n]); setPlayerOpen(true); }}
                    />
                  );
                })}
              </div>
            </div>

            {/* NAME — shimmer серого вне ховера */}
            <h1
              ref={nameRef}
              onMouseLeave={() => setNameStick(Array.from(latin).map(()=>false))}
              style={{ margin:0, fontSize:titleFS, letterSpacing:"0.02em", color:"#fff",
                       whiteSpace:"nowrap", userSelect:"none", textShadow:"0 1px 2px rgba(0,0,0,0.25)",
                       cursor: `url(${CURSOR_URL}) 10 10, default` }}
            >
              {Array.from(latin).map((ch,i)=>{
                const cyr = map[ch] || ch;
                const show = nameStick[i] ? (cyr===" " ? "\u00A0" : cyr) : (ch===" " ? "\u00A0" : ch);
                return (
                  <span
                    key={`n-${i}`}
                    onMouseEnter={async ()=>{ setNameStick(s=>{const a=[...s]; a[i]=true; return a;}); setNameColors(c=>{const a=[...c]; a[i]=randColor(); return a;}); await playHoverSoft(); }}
                    style={{
                      display:"inline-block", whiteSpace:"pre", cursor:"inherit",
                      color: nameStick[i] ? nameColors[i] : "#cfcfcf",
                      transform: nameStick[i] ? "scale(1.3)" : "scale(1)",
                      transition:"transform 140ms ease, color 160ms ease",
                      animation: nameStick[i] ? "none" : `shimmerGray 1600ms ease-in-out ${i*70}ms infinite`,
                    }}
                  >
                    {show}
                  </span>
                );
              })}
            </h1>

            {/* BIO — как было */}
            <div style={{ marginTop: Math.round(titleFS*0.9) }}>
              <BioWordPerLetter onOpen={()=>setBioOpen(true)} />
            </div>

            {/* Socials — звук как у кружков (playDot) */}
<div style={{ display:"flex", gap:14, justifyContent:"center", alignItems:"center", marginTop: Math.round(titleFS*0.6) }}>
  <IconLink
    href="https://instagram.com/rustamromanov.ru"
    label="Instagram"
    whiteSrc="/rustam-site/assents/icons/instagram-white.svg?v=3"
    colorSrc="/rustam-site/assents/icons/instagram-color.svg?v=3"
    onHoverSound={playDot}
  />
  <IconLink
    href="https://t.me/rustamromanov"
    label="Telegram"
    whiteSrc="/rustam-site/assents/icons/telegram-white.svg?v=3"
    colorSrc="/rustam-site/assents/icons/telegram-color.svg?v=3"
    onHoverSound={playDot}
  />
</div>


          </div>
        </div>
      </div>

      {/* Overlays */}
      <VideoOverlay open={playerOpen} onClose={()=>{ setPlayerOpen(false); setVimeoId(null); }} vimeoId={vimeoId}/>
      <BioOverlay   open={bioOpen}   onClose={()=>setBioOpen(false)} imageSrc="/rustam-site/assents/foto/bio.jpg"/>

      {/* keyframes */}
      <style>{`
        @keyframes cardPop { 0%{transform:scale(0.6);opacity:0} 60%{transform:scale(1.04);opacity:1} 100%{transform:scale(1);opacity:1} }
        @keyframes shimmerGray {
          0%,100% { color: #cfcfcf; }
          50%     { color: #7a7a7a; }
        }
      `}</style>
    </>
  );
}

/* ===== BIO per-letter (как было) ===== */
function BioWordPerLetter({ onOpen }) {
  const { playIcon } = useAudio();
  const latin=["B","I","O"]; const map={B:"Б",I:"И",O:"О"};
  const [stick,setStick]=useState(Array.from(latin).map(()=>false));
  const [colors,setColors]=useState(Array.from(latin).map(()=>"#ffffff"));
  return (
    <h2 onClick={onOpen} onMouseLeave={()=>setStick(Array.from(latin).map(()=>false))}
        style={{ margin:0, cursor:"pointer", fontSize:"clamp(12px,1.2vw,18px)", userSelect:"none", display:"inline-block", whiteSpace:"nowrap", letterSpacing:"0.08em" }}>
      {latin.map((ch,i)=>(
        <span key={`bio-${i}`}
          onMouseEnter={async ()=>{ setStick(s=>{const a=[...s]; a[i]=true; return a;}); setColors(c=>{const a=[...c]; a[i]=randColor(); return a;}); await playIcon(); }}
          style={{ display:"inline-block", transformOrigin:"50% 50%", transform: stick[i] ? "scale(1.35)" : "scale(1)", color: stick[i] ? colors[i] : "#ffffff", transition:"transform 140ms ease, color 160ms ease" }}>
          {stick[i] ? map[ch] : ch}
        </span>
      ))}
    </h2>
  );
}

/* ===== Vimeo overlay ===== */
function VideoOverlay({ open, onClose, vimeoId }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, zIndex:2147484500, background:"rgba(0,0,0,0.96)", display:"flex", alignItems:"center", justifyContent:"center", padding:"3vw" }}>
      <button aria-label="Close" onClick={onClose} style={{ position:"absolute", top:16, right:16, width:40, height:40, borderRadius:999, background:"rgba(0,0,0,0.55)", border:"1px solid rgba(255,255,255,0.35)", cursor:"pointer", display:"grid", placeItems:"center" }}>
        <svg width="18" height="18" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6l-12 12" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
      </button>
      <div onClick={(e)=>e.stopPropagation()} style={{ position:"relative", width:"60vw", maxWidth:1200, height:"60vh", borderRadius:12, overflow:"hidden", boxShadow:"0 20px 60px rgba(0,0,0,0.55)", background:"#000" }}>
        <iframe
          src={`https://player.vimeo.com/video/${vimeoId}?autoplay=1&muted=0&controls=1&playsinline=1&title=0&byline=0&portrait=0&transparent=0&autopause=1`}
          title="Vimeo player" frameBorder="0" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowFullScreen
          style={{ width:"100%", height:"100%", display:"block", background:"#000" }}
        />
      </div>
    </div>
  );
}

/* ===== Export ===== */
export default function CenterRevealCard() { return <DesktopCard/>; }
