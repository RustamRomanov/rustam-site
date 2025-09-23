// src/components/MosaicBackground.jsx
import React, { useEffect, useRef, useState, useCallback } from "react";

/* ===== СЕТКА / АНИМАЦИЯ ===== */
const BASE_TILE_W = 80, BASE_TILE_H = 45;
const WAVE_STEP = 90, WAVE_PERIOD_MIN = 5000, WAVE_PERIOD_MAX = 9000;
const FADE_MS = 800, RING_SCALES = [3, 2, 1.5, 1.2], LERP = 0.22;

/* ===== МОБИЛЬНЫЙ ЗУМ ===== */
const MOBILE_ZOOM_W_RATIO = 0.95; // 95% ширины экрана (поменяешь число — изменишь процент)

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

/* ===== ВУАЛЬ (тёмная пелена с «дыркой» у курсора) ===== */
const VEIL_ENABLED = true;
const VEIL_ALPHA   = 0.55;
const VEIL_HOLE_R  = 140;
const VEIL_FEATHER = 180;
const VEIL_MIN_R   = 90;
const VEIL_MAX_R   = 280;

/* ===== УТИЛИТЫ ===== */
const clamp = (v,min,max)=>Math.min(Math.max(v,min),max);
const clamp01 = (x)=>Math.max(0,Math.min(1,x));
const randInt = (min,max)=>Math.floor(min + Math.random()*(max-min+1));
const parseSeq = (url)=>{ const f=(url.split("/").pop()||"").toLowerCase(); const m=f.match(/(\d+)(?=\.(jpg|jpeg|png|webp)$)/i); return m?parseInt(m[1],10):Number.MAX_SAFE_INTEGER; };
const shuffle = (a)=>{ for(let i=a.length-1;i>0;i--){ const j=(Math.random()*(i+1))|0; [a[i],a[j]]=[a[j],a[i]]; } return a; };

export default function MosaicBackground() {
  const canvasRef = useRef(null), ctxRef = useRef(null);

  /* ===== Пулы изображений (3 этапа) ===== */
  const img1Ref        = useRef(null);
  const mobileUrlsRef  = useRef([]);
  const mobilePoolRef  = useRef([]);
  const mobileSeqRef   = useRef([]);
  const desktopUrlsRef = useRef([]);
  const desktopPoolRef = useRef([]);
  const desktopSeqRef  = useRef([]);

  /* ===== Текущая сетка/тайлы ===== */
  const tilesRef  = useRef([]);
  const gridRef   = useRef({ cols:0, rows:0, tileW:BASE_TILE_W, tileH:BASE_TILE_H });

  /* ===== Фазы и волны ===== */
  const rafRef    = useRef(0);
  const waveRef   = useRef({ nextWaveAt: 0 });
  const allowRandomRef = useRef(false);
  const phaseRef  = useRef("img1"); // img1 -> mobile -> desktop
  const doingWaveRef = useRef(false);
  const pendingPhasesRef = useRef([]); // очередь фаз: ["mobile","desktop"]

  /* Наведение / клик */
  const mouseRef = useRef({ x:-1e6, y:-1e6 });
  const prevMouseRef = useRef({ x:-1e6, y:-1e6 });
  const prevHoverIdRef = useRef(-1);
  const prevHoverColRef = useRef(-1);
  const prevHoverRowRef = useRef(-1);
  const clickedTileIdRef = useRef(-1);

  const readySentRef = useRef(false);
  const [isMobile, setIsMobile] = useState(
    typeof window!=="undefined" ? window.innerWidth<=MOBILE_BREAKPOINT : false
  );

  /* ===== AUDIO ===== */
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
  const playDirectionalAir = async (_strength = 1, _pan = 0, _dirX = 0, _v = 0.5, _dirY = 0) => {
    const strength = Number.isFinite(_strength) ? _strength : 1;
    const pan      = Number.isFinite(_pan)      ? _pan      : 0;
    const dirX     = Number.isFinite(_dirX)     ? _dirX     : 0;
    const v        = Number.isFinite(_v)        ? _v        : 0.5;
    const dirY     = Number.isFinite(_dirY)     ? _dirY     : 0;

    const nowMs = performance.now();
    if (nowMs - lastSoundAtRef.current < SOUND_MIN_GAP_MS) return;
    lastSoundAtRef.current = nowMs;

    const ctx = await getCtx(); if (!ctx) return;
    await ensureConvolver();
    const t0 = ctx.currentTime;

    const edgeBoost = 0.35 + 0.65 * Math.abs(pan);
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, t0);
    const peak = (0.2 + 0.1 * strength) * edgeBoost;
    master.gain.exponentialRampToValueAtTime(peak, t0 + 0.012);
    master.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.6);

    const vert = (v - 0.5) * 2;
    const baseHz = 1700 + 700 * Math.max(0, pan) + 200 * dirX * Math.abs(pan) + 600 * vert;

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

  /* ===== РАЗМЕР / СЕТКА ===== */
  useEffect(()=>{
    const onResize=()=>{ setIsMobile(window.innerWidth<=MOBILE_BREAKPOINT); tryScheduleNextPhase(); };
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
        cols=8;
        tileW=Math.floor(w/cols);
        tileH=Math.max(1,Math.floor(tileW*9/16));
        rows=Math.ceil(h/tileH)+1;
      }else{
        cols=Math.max(1,Math.ceil(w/BASE_TILE_W));
        rows=Math.max(1,Math.ceil(h/BASE_TILE_H));
        tileW=Math.ceil(w/cols);
        tileH=Math.ceil(h/rows);
      }
      gridRef.current={ cols, rows, tileW, tileH };
      initTiles();
      tryScheduleNextPhase();
    };

    resize();
    window.addEventListener("resize",resize);
    return ()=>window.removeEventListener("resize",resize);
  },[]);

  /* ===== Списки URL для mobile/desktop ===== */
  const fetchListForBase = useCallback(async (base)=>{
    try{
      const res = await fetch(`${base}manifest.json`, { cache:"no-store" });
      if(res.ok){
        const data = await res.json();
        const names = Array.isArray(data?.jpg) ? data.jpg : [];
        if(names.length) return names.map(n=>`${base}${n}`);
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
    return found;
  },[]);

  /* ===== Прелоад ===== */
  const loadImage = (url)=> new Promise((resolve)=>{
    const img = new Image(); img.decoding="async"; img.loading="eager";
    img.onload = ()=> resolve(img);
    img.onerror = ()=> resolve(null);
    img.src = url;
  });

  const preloadPool = async (urls, CONCURRENCY=14)=>{
    const pool=new Array(urls.length), seq=new Array(urls.length);
    let i=0, active=0;
    await new Promise(res=>{
      const next=()=>{
        while(active<CONCURRENCY && i<urls.length){
          const idx=i++; active++;
          loadImage(urls[idx]).then(img=>{
            pool[idx]=img;
            seq[idx]=parseSeq(urls[idx]);
          }).finally(()=>{
            active--; (i>=urls.length && active===0) ? res() : next();
          });
        }
      };
      next();
    });
    const okIndexes=[];
    for(let k=0;k<pool.length;k++) if(pool[k] && pool[k].width) okIndexes.push(k);
    const poolOk = okIndexes.map(k=>pool[k]);
    const seqOk  = okIndexes.map(k=>seq[k]);
    return { pool: poolOk, seq: seqOk };
  };

  /* ===== Инициализация загрузки и фаз ===== */
  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      // img1 (mobile приоритет)
      const tryImg1 = async (base)=>{
        for(const ext of TRY_EXTS){
          const url=`${base}img1.${ext}`;
          try{
            const h=await fetch(url,{method:"HEAD",cache:"no-store"});
            if(h.ok){ const im=await loadImage(url); if(im) return im; }
          }catch{}
        }
        return null;
      };
      img1Ref.current = (await tryImg1(MOBILE_DIR)) || (await tryImg1(DESKTOP_DIR));
      phaseRef.current = "img1";
      allowRandomRef.current = false;
      doingWaveRef.current = false;

      // параллельно тянем списки
      const [mobileUrls, desktopUrls] = await Promise.all([
        fetchListForBase(MOBILE_DIR),
        fetchListForBase(DESKTOP_DIR)
      ]);
      if(cancelled) return;
      mobileUrlsRef.current = mobileUrls||[];
      desktopUrlsRef.current = desktopUrls||[];

      // Старт rAF
      if(!rafRef.current) start();

      // Прелоад mobile → фаза mobile
      if((mobileUrlsRef.current?.length||0) > 0){
        const { pool, seq } = await preloadPool(mobileUrlsRef.current);
        if(cancelled) return;
        mobilePoolRef.current = pool; mobileSeqRef.current = seq;
        enqueuePhase("mobile");
      }

      // Прелоад desktop → фаза desktop
      if((desktopUrlsRef.current?.length||0) > 0){
        const { pool, seq } = await preloadPool(desktopUrlsRef.current);
        if(cancelled) return;
        desktopPoolRef.current = pool; desktopSeqRef.current = seq;
        enqueuePhase("desktop");
      }
    })();
    return ()=>{ cancelled=true; };
  },[]);

  function enqueuePhase(tag){
    const q = pendingPhasesRef.current;
    if(!q.includes(tag)) q.push(tag);
    tryScheduleNextPhase();
  }
  function tryScheduleNextPhase(){
    if(doingWaveRef.current) return;
    const { cols, rows } = gridRef.current;
    if(!cols || !rows) return;
    if(!tilesRef.current.length) return;
    const q = pendingPhasesRef.current;
    if(!q.length) return;

    const target = q.shift();
    if(target==="mobile" && !(mobilePoolRef.current?.length)) return;
    if(target==="desktop" && !(desktopPoolRef.current?.length)) return;
    schedulePhaseWave(target);
  }

  /* ===== Тайлы под img1 ===== */
  function initTiles(){
    const { cols, rows } = gridRef.current; if(!cols || !rows) return;
    if(!img1Ref.current) return; // ждём img1
    if(tilesRef.current.length) return;

    const total = cols*rows;
    const now = performance.now();

    const tiles = new Array(total);
    for(let id=0;id<total;id++){
      tiles[id] = {
        id, c:id%cols, r:Math.floor(id/cols),
        img: img1Ref.current, poolTag: "img1",
        prevImg:null, fading:false, fadeStart:0,
        scale:1, nextChange: now + 1e8, frozen:false,
        _seq: 1
      };
    }
    tilesRef.current = tiles;
  }

  /* ===== Управляемая волна ===== */
  function schedulePhaseWave(target){
    const { cols, rows } = gridRef.current; if(!cols||!rows) return;
    const tiles = tilesRef.current; if(!tiles.length) return;

    doingWaveRef.current = true;
    phaseRef.current = target;

    const oc = Math.floor(cols/2), or = Math.floor(rows/2);
    const t0 = performance.now() + 120;
    for(const tile of tiles){
      const ring=Math.max(Math.abs(tile.c-oc),Math.abs(tile.r-or));
      tile.nextChange = t0 + ring*WAVE_STEP + Math.random()*60;
      tile.targetTag = target;
      tile.fading = false;
    }

    const waveTime = WAVE_STEP * Math.max(cols, rows) + 2200;
    setTimeout(()=>{
      doingWaveRef.current = false;
      if(target==="desktop"){
        allowRandomRef.current = true;
      }
      tryScheduleNextPhase();
    }, waveTime);
  }

  /* ===== Анти-близость и гарантированная смена ===== */
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
  function penaltyForImg(candidateImg, candidateSeq, id, tiles, cols, rows){
    let pen=0;
    for(const j of neighborsOf(id, cols, rows)){
      const t=tiles[j]; if(!t) continue;
      const a = t.fading ? (t.img || t.prevImg) : t.img;
      if(!a) continue;
      if(a === candidateImg){ pen += 10000; continue; }
      const neighborSeq = t._seq;
      if(neighborSeq!=null && candidateSeq!=null && Math.abs(neighborSeq - candidateSeq) <= NEI_DELTA) pen += 1;
    }
    return pen;
  }
  function pickFromPoolFor(id, targetTag, excludeImg){
    const pool = targetTag==="mobile" ? mobilePoolRef.current : desktopPoolRef.current;
    const seq  = targetTag==="mobile" ? mobileSeqRef.current  : desktopSeqRef.current;
    if(!pool?.length) return {img:null, seq:null};

    const candIdx=[];
    for(let i=0;i<pool.length;i++){
      const im = pool[i];
      if(!im) continue;
      if(excludeImg && im === excludeImg) continue;
      candIdx.push(i);
    }
    if(!candIdx.length){
      for(let i=0;i<pool.length;i++){ if(pool[i] && pool[i]!==excludeImg){ candIdx.push(i); break; } }
      if(!candIdx.length) return {img:null, seq:null};
    }

    let best=[], bestPen=Infinity;
    const tiles=tilesRef.current, { cols, rows } = gridRef.current;
    for(const i of candIdx){
      const img=pool[i];
      const p = penaltyForImg(img, seq[i], id, tiles, cols, rows);
      if(p < bestPen){ bestPen = p; best = [i]; }
      else if(p === bestPen){ best.push(i); }
    }
    const idx = best[(Math.random()*best.length)|0];
    return { img: pool[idx], seq: seq[idx] ?? null };
  }

  /* ===== Рендер ===== */
  function start(){
    if(rafRef.current) return;
    const step=(t)=>{
      rafRef.current = requestAnimationFrame(step);
      try { draw(t); } catch(e){ /* no-op */ }
    };
    rafRef.current = requestAnimationFrame(step);
  }
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
    ctx.moveTo(x+rr,y); ctx.lineTo(x+w-rr,y); ctx.quadraticCurveTo(x+w,y,x+w,y+rr);
    ctx.lineTo(x+w,y+h-rr); ctx.quadraticCurveTo(x+w,y+h,x+w-rr,y+h);
    ctx.lineTo(x+rr,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-rr);
    ctx.lineTo(x,y+rr); ctx.quadraticCurveTo(x,y,x+rr,y); ctx.closePath();
  }
  function drawCoverRounded(ctx,img,dx,dy,dw,dh,s=1){
    if(!img||!img.width||!img.height) return;
    const cx=dx+dw/2, cy=dy+dh/2;
    const drawW=dw*s, drawH=dh*s;
    const scale=Math.max(drawW/img.width, drawH/img.height);
    const sw=drawW/scale, sh=drawH/scale;
    const sx=(img.width-sw)*0.5, sy=(img.height-sh)*0.5;
    const radius = s>1.01 ? Math.min(12*(s/3),18) : 0;
    if(radius>0){ ctx.save(); roundedRect(ctx,cx-drawW/2,cy-drawH/2,drawW,drawH,radius); ctx.clip(); ctx.drawImage(img,sx,sy,sw,sh,cx-drawW/2,cy-drawH/2,drawW,drawH); ctx.restore(); }
    else ctx.drawImage(img,sx,sy,sw,sh,cx-drawW/2,cy-drawH/2,drawW,drawH);
  }

  function drawVeil(ctx){
    if(!VEIL_ENABLED) return;
    const w = window.innerWidth, h = window.innerHeight;
    const mx = mouseRef.current.x, my = mouseRef.current.y;
    const noPointer = !(mx > -1e5 && my > -1e5);
    if(noPointer){
      ctx.globalAlpha = VEIL_ALPHA;
      ctx.fillStyle = "#000";
      ctx.fillRect(0,0,w,h);
      ctx.globalAlpha = 1;
      return;
    }
    const r = clamp(VEIL_HOLE_R, VEIL_MIN_R, VEIL_MAX_R);
    const outer = r + VEIL_FEATHER;
    const g = ctx.createRadialGradient(mx, my, Math.max(1, r*0.3), mx, my, outer);
    const innerStop = r / outer;
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(clamp01(innerStop), "rgba(0,0,0,0)");
    g.addColorStop(1, `rgba(0,0,0,${VEIL_ALPHA})`);
    ctx.fillStyle = g;
    ctx.fillRect(0,0,w,h);
  }

  function draw(t){
    const ctx=ctxRef.current; if(!ctx) return;
    const w=window.innerWidth,h=window.innerHeight;
    ctx.clearRect(0,0,w,h); ctx.fillStyle="#000"; ctx.fillRect(0,0,w,h);

    if(!tilesRef.current.length) initTiles();

    const tiles=tilesRef.current;
    if(!tiles.length){ drawVeil(ctx); return; }

    if(!readySentRef.current && (mobilePoolRef.current.length || desktopPoolRef.current.length)){
      readySentRef.current=true;
      setTimeout(()=>window.dispatchEvent(new Event("mosaic:ready")),0);
    }

    const { tileW,tileH,cols,rows } = gridRef.current;

    // звук при входе в новый тайл
    const mc=Math.floor(mouseRef.current.x/tileW), mr=Math.floor(mouseRef.current.y/tileH);
    const hoveredId=(mc>=0 && mr>=0) ? (mr*cols + mc) : -1;
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

      try { playDirectionalAir(strength, pan, dirX, v, dirY); } catch {}
      prevHoverIdRef.current=hoveredId;
    }

    // масштаб
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

      if(tile.frozen) target*=CLICK_MULT;
      tile.scale += (target - tile.scale)*LERP;

      // подмена по расписанию
      if(t>=tile.nextChange){
        const tag = tile.targetTag || phaseRef.current;
        if(tag==="mobile" || tag==="desktop"){
          const { img, seq } = pickFromPoolFor(tile.id, tag, tile.img);
          if(img && img !== tile.img){
            tile.prevImg = tile.img;
            tile.img = img;
            tile._seq = seq;
            tile.fading = true; tile.fadeStart = t;
            tile.poolTag = tag;
            tile.nextChange = (allowRandomRef.current && tag==="desktop")
              ? t + randInt(2500,5500) + (tile.c+tile.r)*5
              : t + 1e8;
          } else {
            tile.nextChange = t + 120 + Math.random()*60;
          }
        } else {
          tile.nextChange = t + 1e8;
        }
      }
    }
    order.sort((a,b)=>b.ring - a.ring);

    // рисуем
    for(const o of order){
      const tile=tiles[o.idx]; if(!tile.img) continue;
      const dx=tile.c*tileW, dy=tile.r*tileH;
      if(o.idx===clickedTileIdRef.current) continue;
      if(tile.fading){
        const p=Math.min(1,(t - tile.fadeStart)/FADE_MS);
        if(tile.prevImg){ ctx.globalAlpha=1-p; drawCoverRounded(ctx,tile.prevImg,dx,dy,tileW,tileH,tile.scale); }
        ctx.globalAlpha=p; drawCoverRounded(ctx,tile.img,dx,dy,tileW,tileH,tile.scale); ctx.globalAlpha=1;
        if(p>=1){ tile.fading=false; }
      } else {
        drawCoverRounded(ctx,tile.img,dx,dy,tileW,tileH,tile.scale);
      }
    }

    // клик-зум
    const ct=clickedTileIdRef.current;
    if(ct>=0){
      const tile=tiles[ct]; if(tile && tile.img){
        const img=tile.img;
        const mx=mouseRef.current.x, my=mouseRef.current.y;
        const pm=prevMouseRef.current; const dmx=isFinite(pm.x)?(mx-pm.x):0; prevMouseRef.current={x:mx,y:my};

        // >>>>>>> МОБИЛЬНОЕ ПОВЕДЕНИЕ: ширина во весь экран, якорение по верх/низ <<<<<<<
if (isMobile) {
  // Отступы
  const marginX = w * 0.05; // слева/справа
  const marginY = h * 0.05; // сверху/снизу

  // Доступная ширина
  const availW = w - marginX * 2;

  // Масштаб по ширине
  const scale = availW / img.width;
  const drawW = availW;
  const drawH = Math.floor(img.height * scale);

  // X — центрируем по горизонтали с учётом отступов
  const drawX = Math.floor((w - drawW) / 2);

  // Y — если картинка в верхней половине, то отступ сверху, иначе снизу
  const tileCenterY = tile.r * tileH + tileH / 2;
  const anchorTop = tileCenterY < (h / 2);
  const drawY = anchorTop
    ? Math.floor(marginY)              // сверху 5%
    : Math.floor(h - drawH - marginY); // снизу 5%

  ctx.save();
  roundedRect(ctx, drawX, drawY, drawW, drawH, ZOOM_RADIUS);
  ctx.clip();
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(img, 0, 0, img.width, img.height, drawX, drawY, drawW, drawH);
  ctx.restore();
} else {
  // (десктоп без изменений)
  const { tileW, tileH } = gridRef.current;
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
    }
    if(ct>=0 && ct!==hoveredId) clickedTileIdRef.current=-1;

    // «живая» случайная жизнь — только после desktop-фазы
    if(allowRandomRef.current && !doingWaveRef.current && t>=waveRef.current.nextWaveAt){
      const oc=randInt(0,cols-1), or=randInt(0,rows-1);
      const start=t;
      for(const tile of tiles){
        const ring=Math.max(Math.abs(tile.c-oc),Math.abs(tile.r-or));
        tile.nextChange = start + ring*WAVE_STEP + Math.random()*120;
        tile.targetTag = "desktop";
      }
      waveRef.current.nextWaveAt = t + randInt(WAVE_PERIOD_MIN, WAVE_PERIOD_MAX);
    }

    drawVeil(ctx);
  }

  /* ===== События ===== */
  const updateMouse = (clientX, clientY) => {
    const r=canvasRef.current.getBoundingClientRect();
    mouseRef.current={ x:clientX-r.left, y:clientY-r.top };
  };
  const onMouseMove=(e)=> updateMouse(e.clientX, e.clientY);
  const onMouseLeave=()=>{ mouseRef.current={x:-1e6,y:-1e6}; clickedTileIdRef.current=-1; prevHoverIdRef.current=-1; prevHoverColRef.current=-1; };
  const onClick=()=>{ const { cols,tileW,tileH }=gridRef.current; const mc=Math.floor(mouseRef.current.x/tileW), mr=Math.floor(mouseRef.current.y/tileH); if(mc<0||mr<0) return; const id=mr*cols+mc; const t=tilesRef.current[id]; if(!t||!t.img) return; clickedTileIdRef.current=id; };
  const pointerActiveRef=useRef(false);
  const onPointerDown=(e)=>{ updateMouse(e.clientX, e.clientY); pointerActiveRef.current=true; canvasRef.current.setPointerCapture?.(e.pointerId); onClick(); };
  const onPointerMove=(e)=>{ if(isMobile && pointerActiveRef.current && e.cancelable) e.preventDefault(); updateMouse(e.clientX, e.clientY); };
  const onPointerUp=()=>{ pointerActiveRef.current=false; clickedTileIdRef.current=-1; };

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
   МОБИЛЬНАЯ ВЕРСИЯ — быстрые правки тут:
=========================================================== */
export const MOSAIC_MOBILE_BREAKPOINT = MOBILE_BREAKPOINT; // 768
export const MOSAIC_MOBILE_COLS = 8; // менять при необходимости
export const MOSAIC_MOBILE_DIR = MOBILE_DIR; // "/rustam-site/assents/mobile/"
export const MOSAIC_MOBILE_HOVER = HOVER_BOOST_MOBILE; // 1.10
export const MOSAIC_CLICK_MULT    = CLICK_MULT;        // 2.0
export const MOSAIC_MOBILE_ZOOM_RATIO = MOBILE_ZOOM_W_RATIO; // 0.95
