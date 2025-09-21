// src/components/MosaicBackground.jsx
import React, { useEffect, useRef, useState, useCallback } from "react";

/* ===== СЕТКА / АНИМАЦИЯ ===== */
const BASE_TILE_W = 80, BASE_TILE_H = 45;
const WAVE_STEP = 90, WAVE_PERIOD_MIN = 5000, WAVE_PERIOD_MAX = 9000;
const FADE_MS = 800, RING_SCALES = [3, 2, 1.5, 1.2], LERP = 0.22;

/* ===== ХОВЕР / КЛИК / ЗУМ ===== */
const HOVER_BOOST = 1.2, HOVER_BOOST_MOBILE = 1.10;
const CENTER_15_PERCENT_LESS = 0.85, CLICK_MULT = 2.0;
const ZOOM_NATIVE_FACTOR = 0.8, ZOOM_MAX_ROT = 0.12, ROT_SENS = 0.0022, ZOOM_RADIUS = 18;

/* ===== ПЛАТФОРМА ===== */
const MOBILE_BREAKPOINT = 768;

/* ===== ПУТИ ===== */
const DESKTOP_DIR = "/rustam-site/assents/images/";
const MOBILE_DIR  = "/rustam-site/assents/mobile/";

/* ===== АУДИО ===== */
const SOUND_MIN_GAP_MS = 100;

/* ===== СКАН КАТАЛОГА ===== */
const MISS_STREAK_LIMIT = 200;
const TRY_EXTS = ["jpg","jpeg","png","webp"];
const MAX_INDEX_SCAN = 10000;

/* ===== АНТИ-БЛИЗОСТЬ ===== */
const NEI_RADIUS = 10;
const NEI_DELTA  = 15;

/* ===== МОБИЛЬНЫЙ СКРОЛ-БУСТ ===== */
const SCROLL_CENTER_BOOST = 0.20; // +20% к центру во время движения пальца

/* ===== НАСТРОЙКИ МОБИЛЬНОГО РАСКРЫТИЯ ПО ТАПУ ===== */
const MOBILE_SIDE_MARGIN_FRAC = 0.04;  // 4% ширины — равные поля слева/справа
const MOBILE_MAX_BLOCK_FRAC   = 0.52;  // высота блока до ~52% экрана
const MOBILE_POP_RADIUS       = 16;    // скругление углов попапа
const MOBILE_POP_LERP         = 0.25;  // плавность анимации попапа
const TAP_MOVE_TOLERANCE_PX   = 8;     // допуск движения для «тапа»

/* ===== УТИЛИТЫ ===== */
const clamp = (v,min,max)=>Math.min(Math.max(v,min),max);
const clamp01 = (x)=>Math.max(0,Math.min(1,x));
const randInt = (min,max)=>Math.floor(min + Math.random()*(max-min+1));
const parseSeq = (url)=>{ const f=(url.split("/").pop()||"").toLowerCase(); const m=f.match(/(\d+)(?=\.(jpg|jpeg|png|webp)$)/i); return m?parseInt(m[1],10):Number.MAX_SAFE_INTEGER; };
const shuffle = (a)=>{ for(let i=a.length-1;i>0;i--){ const j=(Math.random()*(i+1))|0; [a[i],a[j]]=[a[j],a[i]]; } return a; };

export default function MosaicBackground() {
  const canvasRef = useRef(null), ctxRef = useRef(null);

  /* Пул / сетка */
  const [urls, setUrls] = useState([]);
  const poolRef   = useRef([]);     // Image[]
  const seqRef    = useRef([]);     // числовые суффиксы
  const useCntRef = useRef([]);     // текущие использования
  const tilesRef  = useRef([]);     // тайлы
  const gridRef   = useRef({ cols:0, rows:0, tileW:BASE_TILE_W, tileH:BASE_TILE_H });

  const quotaRef  = useRef(1);

  /* Волны / рендер */
  const rafRef  = useRef(0);
  const waveRef = useRef({ nextWaveAt: 0 });

  /* Наведение / клик */
  const mouseRef = useRef({ x:-1e6, y:-1e6 });
  const prevMouseRef = useRef({ x:-1e6, y:-1e6 });
  const prevHoverIdRef = useRef(-1);
  const prevHoverColRef = useRef(-1);
  const prevHoverRowRef = useRef(-1);
  const clickedTileIdRef = useRef(-1); // для десктопного клик-зума

  /* ===== МОБИЛЬНОЕ СОСТОЯНИЕ ===== */
  const pointerActiveRef = useRef(false);
  const lastMoveAtRef = useRef(0);
  const scrollBoostRef = useRef(0); // 0..SCROLL_CENTER_BOOST

  // попап по тапу (моб.)
  const mobilePopRef = useRef({
    active: false,
    topHalf: true,
    imgIdx: -1,
    anim: 0,  // 0..1
  });

  // распознавание «тапа»
  const tapTrackRef = useRef({ downX:0, downY:0, downAt:0 });

  /* Прочее */
  const readySentRef = useRef(false);

  const [isMobile, setIsMobile] = useState(
    typeof window!=="undefined" ? window.innerWidth<=MOBILE_BREAKPOINT : false
  );
  const basePathRef = useRef(isMobile ? MOBILE_DIR : DESKTOP_DIR);

  useEffect(()=>{
    const onResize=()=>setIsMobile(window.innerWidth<=MOBILE_BREAKPOINT);
    window.addEventListener("resize",onResize);
    window.addEventListener("orientationchange",onResize);
    return ()=>{
      window.removeEventListener("resize",onResize);
      window.removeEventListener("orientationchange",onResize);
    };
  },[]);
  useEffect(()=>{
    if(!isMobile) return;
    const prev=document.body.style.overflow;
    document.body.style.overflow="hidden";
    return ()=>{ document.body.style.overflow=prev; };
  },[isMobile]);

  /* ===== АУДИО ===== */
  const audioCtxRef    = useRef(null);
  const convolverRef   = useRef(null);
  const masterCompRef  = useRef(null);
  const lastSoundAtRef = useRef(0);

  const getCtx = async ()=>{
    try{
      if(!audioCtxRef.current){
        const Ctx=window.AudioContext||window.webkitAudioContext; if(!Ctx) return null;
        const ctx=new Ctx();
        const comp=ctx.createDynamicsCompressor();
        comp.threshold.setValueAtTime(-22,ctx.currentTime);
        comp.knee.setValueAtTime(22,ctx.currentTime);
        comp.ratio.setValueAtTime(3.2,ctx.currentTime);
        comp.attack.setValueAtTime(0.004,ctx.currentTime);
        comp.release.setValueAtTime(0.18,ctx.currentTime);
        comp.connect(ctx.destination);
        masterCompRef.current=comp; audioCtxRef.current=ctx;
      }
      if(audioCtxRef.current.state==="suspended") await audioCtxRef.current.resume().catch(()=>{});
      return audioCtxRef.current;
    }catch{ return null; }
  };
  const makeReverbIR=(ctx,seconds=2.8,decay=3.3)=>{
    const rate=ctx.sampleRate, len=Math.max(1,Math.floor(seconds*rate));
    const ir=ctx.createBuffer(2,len,rate);
    for(let ch=0;ch<2;ch++){
      const d=ir.getChannelData(ch);
      for(let i=0;i<len;i++){ const t=i/len; const g=(Math.random()*2-1)*(1-0.1*Math.random()); d[i]=g*Math.pow(1-t,decay); }
    }
    return ir;
  };
  const ensureConvolver=async()=>{ const ctx=await getCtx(); if(!ctx) return null; if(!convolverRef.current){ const conv=ctx.createConvolver(); conv.buffer=makeReverbIR(ctx,2.8,3.3); convolverRef.current=conv; } return convolverRef.current; };
  const primeSound=async()=>{ try{ const ctx=await getCtx(); if(!ctx) return false; if(ctx.state!=="running") await ctx.resume().catch(()=>{}); const o=ctx.createOscillator(); const g=ctx.createGain(); g.gain.setValueAtTime(0.00001,ctx.currentTime); o.connect(g).connect(ctx.destination); o.start(); o.stop(ctx.currentTime+0.01); await ensureConvolver(); return true; }catch{ return false; } };
  useEffect(()=>{
    let armed=true;
    const tryPrime=async()=>{ if(!armed) return; const ok=await primeSound(); if(ok){ armed=false; window.removeEventListener("pointerdown",tryPrime,true); window.removeEventListener("touchstart",tryPrime,true); window.removeEventListener("click",tryPrime,true); window.removeEventListener("keydown",tryPrime,true); } };
    window.addEventListener("pointerdown",tryPrime,true);
    window.addEventListener("touchstart",tryPrime,true);
    window.addEventListener("click",tryPrime,true);
    window.addEventListener("keydown",tryPrime,true);
    const onFirstMove=async()=>{ await primeSound(); document.removeEventListener("mousemove",onFirstMove,true); };
    document.addEventListener("mousemove",onFirstMove,true);
    const onVis=()=>{ if(!document.hidden) primeSound(); };
    document.addEventListener("visibilitychange",onVis);
    return ()=>{
      window.removeEventListener("pointerdown",tryPrime,true);
      window.removeEventListener("touchstart",tryPrime,true);
      window.removeEventListener("click",tryPrime,true);
      window.removeEventListener("keydown",tryPrime,true);
      document.removeEventListener("mousemove",onFirstMove,true);
      document.removeEventListener("visibilitychange",onVis);
    };
  },[]);

  // звук
  const playDirectionalAir = async (strength = 1, pan = 0, dirX = 0, v = 0.5, dirY = 0) => {
    const nowMs = performance.now();
    if (nowMs - lastSoundAtRef.current < SOUND_MIN_GAP_MS) return;
    lastSoundAtRef.current = nowMs;

    const ctx = await getCtx(); if (!ctx) return;
    await ensureConvolver();
    const t0 = ctx.currentTime;

    const edgeBoost = 0.35 + 0.65 * Math.abs(pan);
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, t0);
    const peak = (0.6 + 0.35 * strength) * edgeBoost;
    master.gain.exponentialRampToValueAtTime(peak, t0 + 0.012);
    master.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.6);

    const vert = (v - 0.5) * 2;
    const baseHz = 1700 + 700*Math.max(0,pan) + 200*dirX*Math.abs(pan) + 600*vert;

    const ping = ctx.createOscillator(); ping.type = "sine";
    ping.frequency.setValueAtTime(baseHz + 350, t0);
    ping.frequency.exponentialRampToValueAtTime(Math.max(400, baseHz), t0 + 0.12);

    const sparkle = ctx.createOscillator(); sparkle.type="sine";
    sparkle.frequency.setValueAtTime(baseHz * 2.02, t0);
    sparkle.frequency.exponentialRampToValueAtTime(baseHz * 1.6, t0 + 0.09);

    const pingGain = ctx.createGain();
    pingGain.gain.setValueAtTime(0.0001, t0);
    pingGain.gain.exponentialRampToValueAtTime(1.0, t0 + 0.008);
    pingGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);

    const sparkGain = ctx.createGain();
    sparkGain.gain.setValueAtTime(0.0001, t0);
    sparkGain.gain.exponentialRampToValueAtTime(0.45, t0 + 0.006);
    sparkGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.12);

    const noise = ctx.createBufferSource();
    const nLen = Math.floor(ctx.sampleRate * 0.06);
    const nBuf = ctx.createBuffer(1, nLen, ctx.sampleRate);
    const nd = nBuf.getChannelData(0);
    for (let i = 0; i < nLen; i++) nd[i] = (Math.random()*2-1) * (1 - i / nLen);
    noise.buffer = nBuf;

    const bp = ctx.createBiquadFilter(); bp.type="bandpass";
    bp.frequency.setValueAtTime(baseHz, t0); bp.Q.setValueAtTime(12, t0);

    const hitGain = ctx.createGain();
    hitGain.gain.setValueAtTime(0.0001, t0);
    hitGain.gain.exponentialRampToValueAtTime(0.35, t0 + 0.004);
    hitGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.08);

    const hs = ctx.createBiquadFilter(); hs.type="highshelf";
    hs.frequency.setValueAtTime(6000, t0);
    hs.gain.setValueAtTime(7 + 3 * Math.abs(pan), t0);

    const pannerDry = ctx.createStereoPanner();
    pannerDry.pan.setValueAtTime(pan * 0.95, t0);

    const delayL = ctx.createDelay(2.5), delayR = ctx.createDelay(2.5);
    delayL.delayTime.setValueAtTime(0.24 + 0.04 * (dirX < 0 ? 1 : 0), t0);
    delayR.delayTime.setValueAtTime(0.32 + 0.04 * (dirX > 0 ? 1 : 0), t0);

    const fbL = ctx.createGain(), fbR = ctx.createGain();
    fbL.gain.setValueAtTime(0.55 + 0.18 * Math.max(0, -pan), t0);
    fbR.gain.setValueAtTime(0.55 + 0.18 * Math.max(0,  pan), t0);

    const lpL = ctx.createBiquadFilter(), lpR = ctx.createBiquadFilter();
    lpL.type="lowpass"; lpR.type="lowpass";
    lpL.frequency.setValueAtTime(7500, t0);
    lpR.frequency.setValueAtTime(7500, t0);

    const panWetL = ctx.createStereoPanner(), panWetR = ctx.createStereoPanner();
    panWetL.pan.setValueAtTime(-0.65 + 0.25 * pan, t0);
    panWetR.pan.setValueAtTime( 0.65 + 0.25 * pan, t0);

    const dryGain = ctx.createGain();  dryGain.gain.setValueAtTime(0.7, t0);
    const wetGain = ctx.createGain();  wetGain.gain.setValueAtTime(0.62, t0);

    let revMix = null;
    if (convolverRef.current) {
      revMix = ctx.createGain();
      revMix.gain.setValueAtTime(0.28 + 0.12 * Math.abs(pan), t0);
      convolverRef.current.connect(revMix).connect(master);
    }

    const srcSum = ctx.createGain();
    ping.connect(pingGain).connect(srcSum);
    sparkle.connect(sparkGain).connect(srcSum);
    noise.connect(bp).connect(hitGain).connect(srcSum);

    srcSum.connect(hs).connect(pannerDry).connect(dryGain).connect(master);
    srcSum.connect(delayL); srcSum.connect(delayR);
    delayL.connect(lpL).connect(fbL).connect(delayR);
    delayR.connect(lpR).connect(fbR).connect(delayL);
    delayL.connect(panWetL).connect(wetGain);
    delayR.connect(panWetR).connect(wetGain);
    wetGain.connect(master);

    if (convolverRef.current && revMix) {
      srcSum.connect(convolverRef.current);
      delayL.connect(convolverRef.current);
      delayR.connect(convolverRef.current);
    }

    if (masterCompRef.current) master.connect(masterCompRef.current); else master.connect(ctx.destination);

    ping.start(t0); sparkle.start(t0+0.002); noise.start(t0);
    ping.stop(t0+0.24); sparkle.stop(t0+0.16); noise.stop(t0+0.08);
  };

  /* ===== 1) СПИСОК ФАЙЛОВ ===== */
  const fetchImageList = useCallback(async ()=>{
    const base = basePathRef.current = (window.innerWidth<=MOBILE_BREAKPOINT) ? MOBILE_DIR : DESKTOP_DIR;

    try{
      const res = await fetch(`${base}manifest.json?ts=${Date.now()}`, { cache:"no-store" });
      if(res.ok){
        const data = await res.json();
        const names = Array.isArray(data?.jpg) ? data.jpg : [];
        const list  = names.map(n=>`${base}${n}`);
        if(list.length){ setUrls(list); return; }
      }
    }catch{}

    const found=[]; let misses=0;
    for(let i=1;i<=MAX_INDEX_SCAN;i++){
      let hit=false;
      for(const ext of TRY_EXTS){
        const u=`${base}img${i}.${ext}`;
        try{ const h=await fetch(u,{method:"HEAD",cache:"no-store"}); if(h.ok){ found.push(u); hit=true; break; } }catch{}
      }
      if(hit) misses=0; else { misses++; if(misses>=MISS_STREAK_LIMIT) break; }
    }
    setUrls(found);
  },[]);
  useEffect(()=>{ fetchImageList(); },[fetchImageList]);
  useEffect(()=>{ fetchImageList(); },[isMobile,fetchImageList]);

  /* ===== 2) CANVAS / GRID ===== */
  useEffect(()=>{
    const canvas=canvasRef.current; if(!canvas) return;
    const ctx=canvas.getContext("2d",{alpha:false}); if(!ctx) return;
    ctxRef.current=ctx;

    const resize=()=>{
      const dpr=(window.innerWidth<=MOBILE_BREAKPOINT)?1:Math.max(1,Math.min(3,window.devicePixelRatio||1));
      const w=window.innerWidth, h=window.innerHeight;
      canvas.style.width=`${w}px`; canvas.style.height=`${h}px`;
      canvas.width=Math.floor(w*dpr); canvas.height=Math.floor(h*dpr);
      ctx.setTransform(dpr,0,0,dpr,0,0);

      let cols, rows, tileW, tileH;
      if(window.innerWidth<=MOBILE_BREAKPOINT){
        cols=8; // фикс 8 по горизонтали
        tileW=Math.floor(w/cols);
        tileH=Math.max(1,Math.floor(tileW*9/16)); // 16:9
        rows=Math.ceil(h/tileH)+1;
      }else{
        cols=Math.max(1,Math.ceil(w/BASE_TILE_W));
        rows=Math.max(1,Math.ceil(h/BASE_TILE_H));
        tileW=Math.ceil(w/cols);
        tileH=Math.ceil(h/rows);
      }
      gridRef.current={ cols, rows, tileW, tileH };
      initTiles(true);
    };

    resize();
    window.addEventListener("resize",resize);
    return ()=>window.removeEventListener("resize",resize);
  },[]);

  /* ===== 3) PRELOAD ===== */
  useEffect(()=>{
    if(!urls.length) return;

    const ordered=[...urls].sort((a,b)=>parseSeq(a)-parseSeq(b));
    poolRef.current=new Array(ordered.length);
    seqRef.current =new Array(ordered.length);
    useCntRef.current=new Array(ordered.length).fill(0);

    let loaded=0,cancelled=false;
    const onDone=()=>{
      initTiles(true);
      if(!rafRef.current) start();
      if(!readySentRef.current){ readySentRef.current=true; setTimeout(()=>window.dispatchEvent(new Event("mosaic:ready")),0); }
    };

    ordered.forEach((u,k)=>{
      const img=new Image(); img.decoding="async"; img.loading="eager";
      img.onload =()=>{ if(cancelled) return; poolRef.current[k]=img; seqRef.current[k]=parseSeq(u); if(++loaded===ordered.length) onDone(); };
      img.onerror=()=>{ if(cancelled) return; if(++loaded===ordered.length) onDone(); };
      img.src = u + (u.includes("?")?"&":"?") + "v=" + Date.now();
    });

    if(!rafRef.current) start();
    return ()=>{ cancelled=true; };
  },[urls]);

  /* ===== 4) СОСЕДИ/ОЦЕНКА/ВЫБОР ===== */
  function neighborsOf(id, cols, rows){
    const r=Math.floor(id/cols), c=id%cols;
    const list=[];
    for(let rr=Math.max(0,r-NEI_RADIUS); rr<=Math.min(rows-1,r+NEI_RADIUS); rr++){
      for(let cc=Math.max(0,c-NEI_RADIUS); cc<=Math.min(cols-1,c+NEI_RADIUS); cc++){
        const j=rr*cols+cc;
        if(j!==id && Math.max(Math.abs(cc-c),Math.abs(rr-r))<=NEI_RADIUS) list.push(j);
      }
    }
    return list;
  }

  function penaltyFor(idx, id, tiles, cols, rows){
    const si=seqRef.current[idx];
    let pen=0;

    const r0=Math.floor(id/cols), c0=id%cols;

    for(const j of neighborsOf(id, cols, rows)){
      const t=tiles[j]; if(!t) continue;
      const a=t.fading ? (t.imgIdx>=0 ? t.imgIdx : t.prevIdx) : t.imgIdx;
      if(a<0) continue;

      if(a===idx){ pen += 10000; continue; } // полный запрет точного повтора

      const sj=seqRef.current[a];
      if(sj!=null && si!=null){
        const rr=Math.floor(j/cols), cc=j%cols;
        const ringDist = Math.max(Math.abs(cc-c0), Math.abs(rr-r0));
        const isSeqClose = Math.abs(sj - si) <= NEI_DELTA;

        // 🚫 Для всех платформ: сильный запрет близких номеров в радиусе ≤ 3
        if(isSeqClose && ringDist <= 3){
          pen += 1000;
        } else if(isSeqClose){
          pen += 1;    // мягкий штраф для дальних соседей
        }
      }
    }

    // равномерность использования
    pen += useCntRef.current[idx]*0.001;
    return pen;
  }

  function pickIndexFor(id, tiles, cols, rows, hardUnique, maxUse){
    const pool=poolRef.current; if(!pool.length) return -1;
    let cands=[];
    for(let i=0;i<pool.length;i++){
      if(!pool[i] || !pool[i].width) continue;
      if(useCntRef.current[i] >= maxUse) continue;
      cands.push(i);
    }
    if(!cands.length) return -1;

    if(hardUnique){
      const zero = cands.filter(i=>useCntRef.current[i]===0);
      if(zero.length) cands = zero;
    }

    let best = [], bestPen = Infinity;
    for(const i of cands){
      const p = penaltyFor(i, id, tiles, cols, rows);
      if(p < bestPen){ bestPen = p; best = [i]; }
      else if(p === bestPen){ best.push(i); }
      if(bestPen===0 && hardUnique && useCntRef.current[i]===0){
        return i;
      }
    }
    let minCnt = Infinity, bag=[];
    for(const i of best){ const u=useCntRef.current[i]; if(u<minCnt){ minCnt=u; bag=[i]; } else if(u===minCnt) bag.push(i); }
    return bag[(Math.random()*bag.length)|0];
  }

  /* ===== 5) ИНИЦИАЛИЗАЦИЯ ===== */
  function initTiles(){
    const { cols, rows } = gridRef.current; if(!cols || !rows) return;
    const total = cols*rows, poolN = poolRef.current.length;
    const now = performance.now();

    quotaRef.current = poolN ? Math.ceil(total / poolN) : 1;
    useCntRef.current = new Array(poolN).fill(0);

    const tiles = new Array(total);
    for(let id=0;id<total;id++){
      tiles[id] = { id, c:id%cols, r:Math.floor(id/cols),
        imgIdx:-1, prevIdx:-1, fading:false, fadeStart:0,
        scale:1, nextChange: now + (id%cols + Math.floor(id/cols))*35 + Math.random()*120, frozen:false };
    }

    const order = shuffle(Array.from({length:total}, (_,i)=>i));
    const hardUnique = poolN >= total;
    const maxUse = hardUnique ? 1 : quotaRef.current;

    for(const id of order){
      const idx = pickIndexFor(id, tiles, cols, rows, hardUnique, maxUse);
      tiles[id].imgIdx = idx>=0 ? idx : 0;
      if(idx>=0) useCntRef.current[idx] += 1;
    }

    tilesRef.current = tiles;
    scheduleNextWave(performance.now());
  }

  function scheduleNextWave(now){ waveRef.current.nextWaveAt = now + randInt(WAVE_PERIOD_MIN, WAVE_PERIOD_MAX); }

  /* ===== 6) РЕНДЕР ===== */
  function start(){ if(rafRef.current) return; const step=(t)=>{ draw(t); rafRef.current=requestAnimationFrame(step); }; rafRef.current=requestAnimationFrame(step); }
  useEffect(()=>()=>cancelAnimationFrame(rafRef.current),[]);

  function computeCover(imgW,imgH,dw,dh,s=1){
    const drawW=dw*s, drawH=dh*s;
    const scale=Math.max(drawW/imgW, drawH/imgH);
    const sw=drawW/scale, sh=drawH/scale;
    const sx=(imgW-sw)*0.5, sy=(imgH-sh)*0.5;
    return { drawW, drawH, sx, sy, sw, sh };
  }
  function roundedRect(ctx,x,y,w,h,r){
    const rr=Math.max(0,Math.min(r,Math.min(w,h)/2));
    ctx.beginPath();
    ctx.moveTo(x+rr,y);
    ctx.lineTo(x+w-rr,y);
    ctx.quadraticCurveTo(x+w,y,x+w,y+rr);
    ctx.lineTo(x+w,y+h-rr);
    ctx.quadraticCurveTo(x+w,y+h,x+w-rr,y+h);
    ctx.lineTo(x+rr,y+h);
    ctx.quadraticCurveTo(x,y+h,x,y+h-rr);
    ctx.lineTo(x,y+rr);
    ctx.quadraticCurveTo(x,y,x+rr,y);
    ctx.closePath();
  }
  function drawCoverRounded(ctx,img,dx,dy,dw,dh,s=1){
    if(!img||!img.width||!img.height) return;
    const cx=dx+dw/2, cy=dy+dh/2;
    const drawW=dw*s, drawH=dh*s;
    const scale=Math.max(drawW/img.width, drawH/img.height);
    const sw=drawW/scale, sh=drawH/scale;
    const sx=(img.width-sw)*0.5, sy=(img.height-sh)*0.5;
    const radius = s>1.01 ? Math.min(12*(s/3),18) : 0;
    if(radius>0){
      ctx.save();
      roundedRect(ctx,cx-drawW/2,cy-drawH/2,drawW,drawH,radius);
      ctx.clip();
      ctx.drawImage(img,sx,sy,sw,sh,cx-drawW/2,cy-drawH/2,drawW,drawH);
      ctx.restore();
    } else {
      ctx.drawImage(img,sx,sy,sw,sh,cx-drawW/2,cy-drawH/2,drawW,drawH);
    }
  }

  function draw(t){
    const ctx=ctxRef.current; if(!ctx) return;
    const w=window.innerWidth,h=window.innerHeight;
    ctx.clearRect(0,0,w,h); ctx.fillStyle="#000"; ctx.fillRect(0,0,w,h);

    const pool=poolRef.current, tiles=tilesRef.current; if(!pool.length || !tiles.length) return;

    if(!readySentRef.current){ readySentRef.current=true; setTimeout(()=>window.dispatchEvent(new Event("mosaic:ready")),0); }

    // волны
    if(t>=waveRef.current.nextWaveAt){
      const { cols, rows } = gridRef.current;
      const oc=randInt(0,cols-1), or=randInt(0,rows-1);
      const start=t;
      for(const tile of tiles){
        const ring=Math.max(Math.abs(tile.c-oc),Math.abs(tile.r-or));
        tile.nextChange = start + ring*WAVE_STEP + Math.random()*120;
      }
      scheduleNextWave(t);
    }

    const { tileW,tileH,cols,rows } = gridRef.current;
    const mc=Math.floor(mouseRef.current.x/tileW), mr=Math.floor(mouseRef.current.y/tileH);
    const hoveredId=(mc>=0 && mr>=0) ? (mr*cols + mc) : -1;

    // звук при входе в новый тайл
    if(hoveredId!==prevHoverIdRef.current && hoveredId>=0){
      const pan = cols>1 ? ((mc/(cols-1))*2 - 1) : 0;
      const prevCol = prevHoverColRef.current>=0 ? prevHoverColRef.current : mc;
      const dirX = Math.max(-1,Math.min(1, mc - prevCol));
      prevHoverColRef.current = mc;

      const v = rows>1 ? (1 - mr/(rows-1)) : 0.5;
      const prevRow = prevHoverRowRef.current>=0 ? prevHoverRowRef.current : mr;
      const dirY = Math.max(-1, Math.min(1, mr - prevRow));
      prevHoverRowRef.current = mr;

      const tx=(hoveredId%cols)*tileW + tileW/2;
      const ty=Math.floor(hoveredId/cols)*tileH + tileH/2;
      const dx=Math.abs(mouseRef.current.x - tx)/(tileW/2);
      const dy=Math.abs(mouseRef.current.y - ty)/(tileH/2);
      const dist=Math.min(1,Math.hypot(dx,dy));
      const strength=1 - 0.6*dist;

      playDirectionalAir(strength, pan, dirX, v, dirY);
      prevHoverIdRef.current=hoveredId;
    }

    const HOVER_MUL = isMobile ? HOVER_BOOST_MOBILE : HOVER_BOOST;

    const order=new Array(tiles.length);
    for(let i=0;i<tiles.length;i++){
      const tile=tiles[i];
      const ring=(hoveredId>=0)?Math.max(Math.abs(tile.c-mc),Math.abs(tile.r-mr)):9999;
      order[i]={ idx:i, ring };

      let target=1;
      if(ring===0)      target=(RING_SCALES[0]*HOVER_MUL)*CENTER_15_PERCENT_LESS;
      else if(ring===1) target=RING_SCALES[1];
      else if(ring===2) target=RING_SCALES[2];
      else if(ring===3) target=RING_SCALES[3];

      // моб. дополнительный буст к центру во время скролла
      if(isMobile && ring===0) target *= (1 + scrollBoostRef.current);

      if(tile.frozen) target*=CLICK_MULT;
      tile.scale += (target - tile.scale)*LERP;

      if(!tile.frozen && !tile.fading && t>=tile.nextChange){
        const hardUnique = pool.length >= tiles.length;
        const maxUse = hardUnique ? 1 : quotaRef.current;
        const nextIdx = pickIndexFor(tile.id, tiles, cols, rows, hardUnique, maxUse);

        if(nextIdx>=0 && nextIdx!==tile.imgIdx){
          const prev = tile.imgIdx;
          tile.prevIdx = prev>=0 ? prev : nextIdx;
          if(prev>=0) useCntRef.current[prev]=Math.max(0,useCntRef.current[prev]-1);
          useCntRef.current[nextIdx]+=1;

          tile.imgIdx = nextIdx;
          tile.fading = true;
          tile.fadeStart = t;
        } else {
          tile.nextChange = t + randInt(2500,5500);
        }
      }
    }
    order.sort((a,b)=>b.ring - a.ring);

    // базовая отрисовка
    for(const o of order){
      const tile=tiles[o.idx]; if(tile.imgIdx<0) continue;
      const dx=tile.c*tileW, dy=tile.r*tileH;
      if(o.idx===clickedTileIdRef.current && !isMobile) continue; // десктопный зум рисуем отдельно
      if(tile.fading){
        const p=Math.min(1,(t - tile.fadeStart)/FADE_MS);
        if(tile.prevIdx>=0){ ctx.globalAlpha=1-p; drawCoverRounded(ctx,pool[tile.prevIdx],dx,dy,tileW,tileH,tile.scale); }
        ctx.globalAlpha=p; drawCoverRounded(ctx,pool[tile.imgIdx],dx,dy,tileW,tileH,tile.scale); ctx.globalAlpha=1;
        if(p>=1){ tile.fading=false; tile.nextChange = t + randInt(2500,5500) + (tile.c+tile.r)*5; }
      } else {
        drawCoverRounded(ctx,pool[tile.imgIdx],dx,dy,tileW,tileH,tile.scale);
      }
    }

    /* ===== МОБИЛЬНЫЙ ПОПАП ПО ТАПУ ===== */
    if(isMobile){
      // затухание буста после остановки
      const idle = performance.now() - lastMoveAtRef.current;
      const targetBoost = idle > 120 ? 0 : SCROLL_CENTER_BOOST;
      scrollBoostRef.current += (targetBoost - scrollBoostRef.current) * 0.18;

      // анимация попапа
      const pop = mobilePopRef.current;
      const targetAnim = pop.active ? 1 : 0;
      pop.anim += (targetAnim - pop.anim) * MOBILE_POP_LERP;

      if(pop.anim > 0.001 && pop.imgIdx>=0){
        const img = pool[pop.imgIdx];
        if(img && img.width){
          const sideMargin = Math.max(8, Math.floor(w * MOBILE_SIDE_MARGIN_FRAC));
          const availW = w - sideMargin*2;

          const targetW = availW;
          const targetH_byAspect = Math.floor(targetW * (img.height / img.width));
          const maxBlockH = Math.floor(h * MOBILE_MAX_BLOCK_FRAC);
          const targetH = Math.min(targetH_byAspect, maxBlockH);

          const targetX = sideMargin;
          const targetY = pop.topHalf ? sideMargin : (h - sideMargin - targetH);

          // лёгкое затемнение
          ctx.save();
          ctx.globalAlpha = 0.18 * pop.anim;
          ctx.fillStyle = "#000";
          ctx.fillRect(0,0,w,h);
          ctx.restore();

          // масштаб от 0.92 -> 1.0
          const k = 0.92 + 0.08 * clamp01(pop.anim);
          const drawW = Math.floor(targetW * k);
          const drawH = Math.floor(targetH * k);
          const drawX = Math.floor(targetX + (targetW - drawW)/2);
          const drawY = Math.floor(targetY + (targetH - drawH)/2);

          ctx.save();
          roundedRect(ctx, drawX, drawY, drawW, drawH, MOBILE_POP_RADIUS);
          ctx.clip();
          ctx.imageSmoothingEnabled = true;
          ctx.drawImage(img, 0,0,img.width,img.height, drawX,drawY, drawW,drawH);
          ctx.restore();
        }
      }
    }

    /* ===== ДЕСКТОПНЫЙ КЛИК-ЗУМ ===== */
    if(!isMobile){
      const ct=clickedTileIdRef.current;
      if(ct>=0){
        const tile=tiles[ct]; if(tile && tile.imgIdx>=0){
          const img=pool[tile.imgIdx];
          const mx=mouseRef.current.x, my=mouseRef.current.y;
          const pm=prevMouseRef.current; const dmx=isFinite(pm.x)?(mx-pm.x):0; prevMouseRef.current={x:mx,y:my};
          const dx=tile.c*tileW, dy=tile.r*tileH;
          const cover=computeCover(img.width,img.height,tileW,tileH,tile.scale);
          const left=dx+(tileW-cover.drawW)/2, top=dy+(tileH-cover.drawH)/2;
          const u=clamp01((mx-left)/cover.drawW), v=clamp01((my-top)/cover.drawH);
          const imgX=cover.sx + u*cover.sw, imgY=cover.sy + v*cover.sh;
          const drawW=Math.floor(img.width*ZOOM_NATIVE_FACTOR), drawH=Math.floor(img.height*ZOOM_NATIVE_FACTOR);
          const drawX=mx - imgX*ZOOM_NATIVE_FACTOR, drawY=my - imgY*ZOOM_NATIVE_FACTOR;
          const angle=clamp(-dmx*ROT_SENS, -ZOOM_MAX_ROT, ZOOM_MAX_ROT);

          ctx.save();
          ctx.beginPath(); roundedRect(ctx,Math.floor(drawX),Math.floor(drawY),drawW,drawH,ZOOM_RADIUS); ctx.clip();
          ctx.translate(mx,my); ctx.rotate(angle); ctx.translate(-mx,-my);
          ctx.imageSmoothingEnabled=true;
          ctx.drawImage(img,0,0,img.width,img.height,Math.floor(drawX),Math.floor(drawY),drawW,drawH);
          ctx.restore();
        }
      }
      if(clickedTileIdRef.current>=0 && clickedTileIdRef.current!==hoveredId) clickedTileIdRef.current=-1;
    }
  }

  /* ===== 7) СОБЫТИЯ ===== */
  const onMouseMove=(e)=>{ const r=canvasRef.current.getBoundingClientRect(); mouseRef.current={ x:e.clientX-r.left, y:e.clientY-r.top }; };
  const onMouseLeave=()=>{ 
    mouseRef.current={x:-1e6,y:-1e6}; 
    if(!isMobile) clickedTileIdRef.current=-1; 
    prevHoverIdRef.current=-1; 
    prevHoverColRef.current=-1; 
    prevHoverRowRef.current=-1; 
  };

  // десктопный клик
  const onClick=()=>{ 
    if(isMobile) return; 
    const { cols,tileW,tileH }=gridRef.current; 
    const mc=Math.floor(mouseRef.current.x/tileW), mr=Math.floor(mouseRef.current.y/tileH); 
    if(mc<0||mr<0) return; 
    const id=mr*cols+mc; 
    const t=tilesRef.current[id]; 
    if(!t||t.imgIdx<0) return; 
    clickedTileIdRef.current=id; 
  };

  // pointer-обработчики
  const onPointerDown=(e)=>{
    const r=canvasRef.current.getBoundingClientRect();
    const x=e.clientX-r.left, y=e.clientY-r.top;
    mouseRef.current={ x, y };
    pointerActiveRef.current=true;
    canvasRef.current.setPointerCapture?.(e.pointerId);

    tapTrackRef.current.downX = x;
    tapTrackRef.current.downY = y;
    tapTrackRef.current.downAt = performance.now();

    if(!isMobile){
      onClick();
    }
  };

  const onPointerMove=(e)=>{
    if(isMobile && pointerActiveRef.current && e.cancelable) e.preventDefault();
    const r=canvasRef.current.getBoundingClientRect();
    const x=e.clientX-r.left, y=e.clientY-r.top;
    mouseRef.current={ x, y };

    if(isMobile && pointerActiveRef.current){
      lastMoveAtRef.current = performance.now();
      // при движении закрываем попап
      if(mobilePopRef.current.active){
        mobilePopRef.current.active=false;
      }
    }
  };

  const onPointerUp=()=>{
    if(isMobile){
      const { cols,tileW,tileH }=gridRef.current;
      const mc=Math.floor(mouseRef.current.x/tileW), mr=Math.floor(mouseRef.current.y/tileH);
      if(mc>=0 && mr>=0){
        const dx = mouseRef.current.x - tapTrackRef.current.downX;
        const dy = mouseRef.current.y - tapTrackRef.current.downY;
        const dist2 = dx*dx + dy*dy;
        if(dist2 <= TAP_MOVE_TOLERANCE_PX*TAP_MOVE_TOLERANCE_PX) {
          // «тап» — переключаем попап
          if(mobilePopRef.current.active){
            mobilePopRef.current.active = false;
          }else{
            const id = mr*cols + mc;
            const t = tilesRef.current[id];
            if(t && t.imgIdx>=0){
              mobilePopRef.current.imgIdx = t.imgIdx;
              mobilePopRef.current.topHalf = (mouseRef.current.y < (window.innerHeight/2));
              mobilePopRef.current.active = true;
              mobilePopRef.current.anim = 0;
            }
          }
        }
      }
      // 🔁 СБРОС СОСТОЯНИЯ ПОСЛЕ ОТПУСКАНИЯ ПАЛЬЦА
      lastMoveAtRef.current = -1e9;
      scrollBoostRef.current = 0;
      mouseRef.current={ x:-1e6, y:-1e6 };
      prevHoverIdRef.current=-1; 
      prevHoverColRef.current=-1; 
      prevHoverRowRef.current=-1;
    }
    pointerActiveRef.current=false;
    if(!isMobile) clickedTileIdRef.current=-1;
  };

  return (
    <canvas
      ref={canvasRef}
      className="mosaic-canvas absolute top-0 left-0 w-full h-full z-10"
      style={{ touchAction: isMobile ? "none" : "auto" }}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    />
  );
}

/* ===========================================================
   МОБИЛЬНАЯ ВЕРСИЯ — быстрые настройки:
   - MOBILE_BREAKPOINT (768)
   - кол-во колонок (resize: cols=8)
   - директория мобильных картинок (MOBILE_DIR)
   - скролл-буст/поля/радиус попапа (константы выше)
=========================================================== */
export const MOSAIC_MOBILE_BREAKPOINT = MOBILE_BREAKPOINT;
export const MOSAIC_MOBILE_DIR = MOBILE_DIR;
export const MOSAIC_MOBILE_COLS = 8;
