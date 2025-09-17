// src/components/MosaicBackground.jsx
import React, { useEffect, useRef, useState } from "react";

/** Базовая плотность сетки (ориентир 16:9) */
const BASE_TILE_W = 80;
const BASE_TILE_H = 45;

/** Анимация / волны / фейд */
const WAVE_STEP = 90;
const WAVE_PERIOD_MIN = 5000;
const WAVE_PERIOD_MAX = 9000;
const FADE_MS = 800;
const RING_SCALES = [3, 2, 1.5, 1.2];
const LERP = 0.22;

/** Масштаб под твои требования */
const HOVER_BOOST = 1.2;
const CENTER_15_PERCENT_LESS = 0.85; // центр на 15% меньше чем раньше
const CLICK_MULT = 2.0;               // клик → ×2 и заморозка

/** Мобильный режим */
const MOBILE_BREAKPOINT = 768;
const HOVER_BOOST_MOBILE = 1.10;
/** Сколько картинок прелоадим на мобайле максимум */
const MOBILE_MAX_IMAGES = 140;

/** Путь к изображениям */
const BASE = "/rustam-site/assents/images/";

/** Аудио лимит частоты триггера */
const SOUND_MIN_GAP_MS = 100;

/** img123.jpg -> 123 */
function parseSeq(url) {
  const f = (url.split("/").pop() || "").toLowerCase();
  const m = f.match(/(\d+)(?=\.(jpg|jpeg|png|webp)$)/i);
  return m ? parseInt(m[1], 10) : Number.MAX_SAFE_INTEGER;
}

export default function MosaicBackground() {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);

  const [urls, setUrls] = useState([]);

  const poolRef   = useRef([]);
  const seqRef    = useRef([]);
  const tilesRef  = useRef([]);
  const rafRef    = useRef(0);

  const gridRef   = useRef({ cols: 0, rows: 0, tileW: BASE_TILE_W, tileH: BASE_TILE_H });
  const mouseRef  = useRef({ x: -1e6, y: -1e6 });
  const waveRef   = useRef({ nextWaveAt: 0 });
  const ptrRef    = useRef(0);

  const hoveredTileIdRef = useRef(-1);
  const prevHoverIdRef   = useRef(-1);
  const prevHoverColRef  = useRef(-1); // для направления движения по колонкам
  const clickedTileIdRef = useRef(-1);

  const readySentRef = useRef(false);

  /** ======== MOBILE FLAG + body scroll lock ======== */
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth <= MOBILE_BREAKPOINT : false);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  useEffect(() => {
    if (!isMobile) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [isMobile]);

  /* ===================== AUDIO: направленный «ш-ш-ш» с эхом ===================== */
  const audioCtxRef    = useRef(null);
  const convolverRef   = useRef(null);
  const masterCompRef  = useRef(null);
  const lastSoundAtRef = useRef(0);

  const getCtx = async () => {
    try {
      if (!audioCtxRef.current) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return null;
        const ctx = new Ctx();

        // Лёгкий мастер-компрессор — плотнее и без клипа
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.setValueAtTime(-22, ctx.currentTime);
        comp.knee.setValueAtTime(22, ctx.currentTime);
        comp.ratio.setValueAtTime(3.2, ctx.currentTime);
        comp.attack.setValueAtTime(0.004, ctx.currentTime);
        comp.release.setValueAtTime(0.18, ctx.currentTime);
        comp.connect(ctx.destination);
        masterCompRef.current = comp;

        audioCtxRef.current = ctx;
      }
      if (audioCtxRef.current.state === "suspended") {
        await audioCtxRef.current.resume().catch(() => {});
      }
      return audioCtxRef.current;
    } catch {
      return null;
    }
  };

  // Импульс реверба
  const makeReverbIR = (ctx, seconds = 2.8, decay = 3.3) => {
    const rate = ctx.sampleRate;
    const length = Math.max(1, Math.floor(seconds * rate));
    const ir = ctx.createBuffer(2, length, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = ir.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        const t = i / length;
        const g = (Math.random() * 2 - 1) * (1 - 0.1 * Math.random());
        data[i] = g * Math.pow(1 - t, decay);
      }
    }
    return ir;
  };

  const ensureConvolver = async () => {
    const ctx = await getCtx();
    if (!ctx) return null;
    if (!convolverRef.current) {
      const conv = ctx.createConvolver();
      conv.buffer = makeReverbIR(ctx, 2.8, 3.3);
      convolverRef.current = conv;
    }
    return convolverRef.current;
  };

  const primeSound = async () => {
    try {
      const ctx = await getCtx(); if (!ctx) return false;
      if (ctx.state !== "running") await ctx.resume().catch(() => {});
      // микро-импульс для разблокировки
      const o = ctx.createOscillator(); const g = ctx.createGain();
      g.gain.setValueAtTime(0.00001, ctx.currentTime);
      o.connect(g).connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.01);
      await ensureConvolver();
      return true;
    } catch { return false; }
  };

  useEffect(() => {
    let armed = true;
    const tryPrime = async () => {
      if (!armed) return;
      const ok = await primeSound();
      if (ok) {
        armed = false;
        window.removeEventListener("pointerdown", tryPrime, true);
        window.removeEventListener("touchstart", tryPrime, true);
        window.removeEventListener("click", tryPrime, true);
        window.removeEventListener("keydown", tryPrime, true);
      }
    };
    window.addEventListener("pointerdown", tryPrime, true);
    window.addEventListener("touchstart", tryPrime, true);
    window.addEventListener("click", tryPrime, true);
    window.addEventListener("keydown", tryPrime, true);

    const onFirstMove = async () => { await primeSound(); document.removeEventListener("mousemove", onFirstMove, true); };
    document.addEventListener("mousemove", onFirstMove, true);

    const onVis = () => { if (!document.hidden) primeSound(); };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      window.removeEventListener("pointerdown", tryPrime, true);
      window.removeEventListener("touchstart", tryPrime, true);
      window.removeEventListener("click", tryPrime, true);
      window.removeEventListener("keydown", tryPrime, true);
      document.removeEventListener("mousemove", onFirstMove, true);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  /**
   * Звук: «шипящая вспышка» + ping-pong delay + реверб, с панорамой по колонке
   */
  const playDirectionalAir = async (strength = 1, pan = 0, dir = 0) => {
    const nowMs = performance.now();
    if (nowMs - lastSoundAtRef.current < SOUND_MIN_GAP_MS) return;
    lastSoundAtRef.current = nowMs;

    const ctx = await getCtx(); if (!ctx) return;
    const conv = await ensureConvolver();
    const comp = masterCompRef.current;
    const t0 = ctx.currentTime;

    const edgeBoost = 0.35 + 0.65 * Math.abs(pan);
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, t0);
    const peak = (0.6 + 0.35 * strength) * edgeBoost;
    master.gain.exponentialRampToValueAtTime(peak, t0 + 0.012);
    master.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.6);

    const baseHz = 1700 + 700 * Math.max(0, pan) + 200 * dir * Math.abs(pan);
    const ping = ctx.createOscillator();
    ping.type = "sine";
    ping.frequency.setValueAtTime(baseHz + 350, t0);
    ping.frequency.exponentialRampToValueAtTime(Math.max(400, baseHz), t0 + 0.12);

    const sparkle = ctx.createOscillator();
    sparkle.type = "sine";
    sparkle.frequency.setValueAtTime((baseHz * 2.02), t0);
    sparkle.frequency.exponentialRampToValueAtTime((baseHz * 1.6), t0 + 0.09);

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

    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.setValueAtTime(baseHz, t0);
    bp.Q.setValueAtTime(12, t0);

    const hitGain = ctx.createGain();
    hitGain.gain.setValueAtTime(0.0001, t0);
    hitGain.gain.exponentialRampToValueAtTime(0.35, t0 + 0.004);
    hitGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.08);

    const hs = ctx.createBiquadFilter();
    hs.type = "highshelf";
    hs.frequency.setValueAtTime(6000, t0);
    hs.gain.setValueAtTime(7 + 3 * Math.abs(pan), t0);

    const pannerDry = ctx.createStereoPanner();
    pannerDry.pan.setValueAtTime(pan * 0.95, t0);

    const delayL = ctx.createDelay(2.5);
    const delayR = ctx.createDelay(2.5);
    const baseL = 0.24 + 0.04 * (dir < 0 ? 1 : 0);
    const baseR = 0.32 + 0.04 * (dir > 0 ? 1 : 0);
    delayL.delayTime.setValueAtTime(baseL, t0);
    delayR.delayTime.setValueAtTime(baseR, t0);

    const fbL = ctx.createGain();
    const fbR = ctx.createGain();
    const sideBoostL = 0.55 + 0.18 * Math.max(0, -pan);
    const sideBoostR = 0.55 + 0.18 * Math.max(0,  pan);
    fbL.gain.setValueAtTime(sideBoostL, t0);
    fbR.gain.setValueAtTime(sideBoostR, t0);

    const lpL = ctx.createBiquadFilter();
    lpL.type = "lowpass"; lpL.frequency.setValueAtTime(7500, t0);
    const lpR = ctx.createBiquadFilter();
    lpR.type = "lowpass"; lpR.frequency.setValueAtTime(7500, t0);

    const panWetL = ctx.createStereoPanner();
    const panWetR = ctx.createStereoPanner();
    panWetL.pan.setValueAtTime(-0.65 + 0.25 * pan, t0);
    panWetR.pan.setValueAtTime( 0.65 + 0.25 * pan, t0);

    const dryGain = ctx.createGain();
    dryGain.gain.setValueAtTime(0.7, t0);
    const wetGain = ctx.createGain();
    wetGain.gain.setValueAtTime(0.62, t0);

    let revMix = null;
    if (convolverRef.current) {
      revMix = ctx.createGain();
      revMix.gain.setValueAtTime(0.28 + 0.12 * Math.abs(pan), t0);
      convolverRef.current.connect(revMix).connect(master);
    }

    // маршрутизация
    const srcSum = ctx.createGain();

    ping.connect(pingGain).connect(srcSum);
    sparkle.connect(sparkGain).connect(srcSum);
    noise.connect(bp).connect(hitGain).connect(srcSum);

    srcSum.connect(hs).connect(pannerDry).connect(dryGain).connect(master);

    srcSum.connect(delayL);
    srcSum.connect(delayR);
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

    if (comp) master.connect(comp); else master.connect(ctx.destination);

    ping.start(t0);
    sparkle.start(t0 + 0.002);
    noise.start(t0);

    ping.stop(t0 + 0.24);
    sparkle.stop(t0 + 0.16);
    noise.stop(t0 + 0.08);
  };

  /* ===================== 1) Список файлов ===================== */
  useEffect(() => {
    let stop = false;
    (async () => {
      try {
        const res = await fetch(`${BASE}manifest.json?ts=${Date.now()}`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data?.jpg) ? data.jpg : [];
          // ограничим пул на мобилке
          const sliced = (window.innerWidth <= MOBILE_BREAKPOINT)
            ? list.slice(0, MOBILE_MAX_IMAGES)
            : list;
          const found = sliced.map((n) => `${BASE}${n}`);
          if (!stop) { setUrls(found); return; }
        }
      } catch {}
      // Фоллбек: img1.jpg.. пока не 404 (с ограничением на мобайле)
      const found = [];
      const limit = (window.innerWidth <= MOBILE_BREAKPOINT) ? MOBILE_MAX_IMAGES : 2000;
      for (let i = 1; i <= limit && !stop; i++) {
        const u = `${BASE}img${i}.jpg`;
        try {
          const head = await fetch(u, { method: "HEAD", cache: "no-store" });
          if (head.ok) found.push(u);
          else break;
        } catch { break; }
      }
      if (!stop) setUrls(found);
    })();
    return () => { stop = true; };
  }, []);

  /* ===================== 2) Canvas + сетка ===================== */
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    ctxRef.current = ctx;

    const resize = () => {
      // На мобилке — DPR=1 (меньше пикселей -> легче рендер/память)
      const wantDpr = (window.innerWidth <= MOBILE_BREAKPOINT) ? 1 : Math.max(1, Math.min(3, window.devicePixelRatio || 1));
      const w = window.innerWidth, h = window.innerHeight;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      canvas.width = Math.floor(w * wantDpr);
      canvas.height = Math.floor(h * wantDpr);
      ctx.setTransform(wantDpr, 0, 0, wantDpr, 0, 0);

      let cols, rows, tileW, tileH;

      if (window.innerWidth <= MOBILE_BREAKPOINT) {
        // === МОБИЛЬНАЯ СЕТКА: 8 колонок, высота из 16:9, рядов — сколько влезет ===
        cols = 8;
        tileW = Math.floor(w / cols);
        tileH = Math.max(1, Math.floor(tileW * 9 / 16));
        rows = Math.ceil(h / tileH) + 1;
      } else {
        // === ДЕСКТОП: как было (адаптивно) ===
        cols = Math.max(1, Math.ceil(w / BASE_TILE_W));
        rows = Math.max(1, Math.ceil(h / BASE_TILE_H));
        tileW = Math.ceil(w / cols);
        tileH = Math.ceil(h / rows);
      }

      gridRef.current = { cols, rows, tileW, tileH };
      initTiles(true);
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  /* ===================== 3) Прелоад изображений ===================== */
  useEffect(() => {
    if (!urls.length) return;

    const ordered = [...urls].sort((a, b) => parseSeq(a) - parseSeq(b));
    poolRef.current = new Array(ordered.length);
    seqRef.current  = new Array(ordered.length);

    let loaded = 0, cancelled = false;

    ordered.forEach((u, k) => {
      const img = new Image();
      img.decoding = "async";
      img.loading = "eager";
      img.onload = () => {
        if (cancelled) return;
        poolRef.current[k] = img;
        seqRef.current[k]  = parseSeq(u);
        loaded++;
        if (loaded === ordered.length) {
          initTiles(true);
          if (!rafRef.current) start();
          setTimeout(() => {
            if (!readySentRef.current) {
              readySentRef.current = true;
              window.dispatchEvent(new Event("mosaic:ready"));
            }
          }, 0);
        }
      };
      img.onerror = () => {
        if (cancelled) return;
        loaded++;
        if (loaded === ordered.length) {
          initTiles(true);
          if (!rafRef.current) start();
          setTimeout(() => {
            if (!readySentRef.current) {
              readySentRef.current = true;
              window.dispatchEvent(new Event("mosaic:ready"));
            }
          }, 0);
        }
      };
      // кэш-брейкер
      img.src = u + (u.includes("?") ? "&" : "?") + "v=" + Date.now();
    });

    if (!rafRef.current) start();
    return () => { cancelled = true; };
  }, [urls]);

  /* ===================== 4) Инициализация тайлов ===================== */
  function initTiles(force = false) {
    const { cols, rows } = gridRef.current;
    if (!cols || !rows) return;

    const now = performance.now();
    const total = cols * rows;
    const tiles = new Array(total);

    const dirs = [
      [-1,-1],[0,-1],[1,-1],
      [-1, 0],       [1, 0],
      [-1, 1],[0, 1],[1, 1],
    ];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const id = r * cols + c;
        const nei = [];
        for (const [dx, dy] of dirs) {
          const nc = c + dx, nr = r + dy;
          if (nc >= 0 && nc < cols && nr >= 0 && nr < rows) nei.push(nr * cols + nc);
        }
        tiles[id] = {
          id, c, r, nei,
          imgIdx: -1, prevIdx: -1,
          fading: false, fadeStart: 0,
          scale: 1,
          nextChange: now + (c + r) * 35 + Math.random() * 120,
          frozen: false,
        };
      }
    }

    const pool = poolRef.current;

    if (pool.length && (force || !tilesRef.current.length)) {
      const order = [];
      for (let p = 0; p < 2; p++)
        for (let i = 0; i < tiles.length; i++)
          if (((tiles[i].c + tiles[i].r) & 1) === p) order.push(i);

      for (const id of order) {
        const t = tiles[id];
        t.imgIdx = chooseIdxForTile(t, tiles);
        if (t.imgIdx < 0 && pool.length) t.imgIdx = (ptrRef.current++) % pool.length;
      }
    } else if (tilesRef.current.length) {
      tilesRef.current.forEach((old, i) => { if (i < tiles.length) Object.assign(tiles[i], old); });
      for (let i = 0; i < tiles.length; i++) {
        if (tiles[i].imgIdx < 0) {
          const idx = chooseIdxForTile(tiles[i], tiles);
          tiles[i].imgIdx = idx >= 0 ? idx : tiles[i].imgIdx;
        }
      }
    }

    tilesRef.current = tiles;
    scheduleNextWave(performance.now());
  }

  function scheduleNextWave(now) {
    waveRef.current.nextWaveAt = now + randInt(WAVE_PERIOD_MIN, WAVE_PERIOD_MAX);
  }

  /* ===================== 5) Подбор индексов ===================== */
  function neighborSets(tile, tiles) {
    const idxSet = new Set();
    const seqSet = new Set();
    const pool = poolRef.current;
    const add = (i) => {
      if (typeof i === "number" && i >= 0 && pool[i]) {
        idxSet.add(i);
        const s = seqRef.current[i];
        if (typeof s === "number") seqSet.add(s);
      }
    };
    for (const nId of tile.nei) {
      const n = tiles[nId]; if (!n) continue;
      add(n.imgIdx);
      if (n.fading && n.prevIdx >= 0) add(n.prevIdx);
    }
    return { idxSet, seqSet };
  }

  function chooseIdxForTile(tile, tiles) {
    const pool = poolRef.current;
    if (!pool.length) return -1;

    const { idxSet, seqSet } = neighborSets(tile, tiles);
    const start = ptrRef.current % pool.length;

    for (let step = 0; step < pool.length; step++) {
      const i = (start + step) % pool.length;
      if (!pool[i] || !pool[i].width) continue;
      if (idxSet.has(i)) continue;
      const s = seqRef.current[i];
      if (seqSet.has(s - 1) || seqSet.has(s + 1)) continue;
      ptrRef.current = i + 1;
      return i;
    }
    for (let step = 0; step < pool.length; step++) {
      const i = (start + step) % pool.length;
      if (!pool[i] || !pool[i].width) continue;
      if (idxSet.has(i)) continue;
      ptrRef.current = i + 1;
      return i;
    }
    return -1;
  }

  /* ===================== 6) Рендер-цикл ===================== */
  function start() {
    if (rafRef.current) return;
    const step = (t) => { draw(t); rafRef.current = requestAnimationFrame(step); };
    rafRef.current = requestAnimationFrame(step);
  }
  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  function draw(t) {
    const ctx = ctxRef.current; if (!ctx) return;

    const w = window.innerWidth, h = window.innerHeight;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);

    const pool = poolRef.current;
    const tiles = tilesRef.current;
    if (!pool.length || !tiles.length) return;

    if (!readySentRef.current) {
      readySentRef.current = true;
      setTimeout(() => window.dispatchEvent(new Event("mosaic:ready")), 0);
    }

    // новая волна
    if (t >= waveRef.current.nextWaveAt) {
      const { cols, rows } = gridRef.current;
      const oc = randInt(0, cols - 1), or = randInt(0, rows - 1);
      const start = t;
      for (const tile of tiles) {
        const ring = Math.max(Math.abs(tile.c - oc), Math.abs(tile.r - or));
        tile.nextChange = start + ring * WAVE_STEP + Math.random() * 120;
      }
      scheduleNextWave(t);
    }

    const { tileW, tileH, cols } = gridRef.current;
    const mc = Math.floor(mouseRef.current.x / tileW);
    const mr = Math.floor(mouseRef.current.y / tileH);
    const hoveredId = (mc >= 0 && mr >= 0) ? (mr * cols + mc) : -1;
    hoveredTileIdRef.current = hoveredId;

    // НАПРАВЛЕННЫЙ ЗВУК: при смене центрального тайла
    if (hoveredId !== prevHoverIdRef.current && hoveredId >= 0) {
      const pan = cols > 1 ? ((mc / (cols - 1)) * 2 - 1) : 0;
      const prevCol = prevHoverColRef.current >= 0 ? prevHoverColRef.current : mc;
      const dir = Math.max(-1, Math.min(1, mc - prevCol));
      prevHoverColRef.current = mc;

      const tx = (hoveredId % cols) * tileW + tileW / 2;
      const ty = Math.floor(hoveredId / cols) * tileH + tileH / 2;
      const dx = Math.abs(mouseRef.current.x - tx) / (tileW / 2);
      const dy = Math.abs(mouseRef.current.y - ty) / (tileH / 2);
      const dist = Math.min(1, Math.hypot(dx, dy));
      const strength = 1 - 0.6 * dist;

      playDirectionalAir(strength, pan, dir);
      prevHoverIdRef.current = hoveredId;
    }

    // масштаб + смены
    const HOVER_MUL = isMobile ? HOVER_BOOST_MOBILE : HOVER_BOOST;
    const order = new Array(tiles.length);

    for (let i = 0; i < tiles.length; i++) {
      const tile = tiles[i];

      const ring = (hoveredId >= 0)
        ? Math.max(Math.abs(tile.c - mc), Math.abs(tile.r - mr))
        : 9999;
      order[i] = { idx: i, ring };

      let target = 1;
      if (ring === 0)       target = (RING_SCALES[0] * HOVER_MUL) * CENTER_15_PERCENT_LESS;
      else if (ring === 1)  target = RING_SCALES[1];
      else if (ring === 2)  target = RING_SCALES[2];
      else if (ring === 3)  target = RING_SCALES[3];

      if (tile.frozen) target *= CLICK_MULT;

      tile.scale += (target - tile.scale) * LERP;

      if (!tile.frozen && !tile.fading && t >= tile.nextChange) {
        const nextIdx = chooseIdxForTile(tile, tiles);
        const useIdx = nextIdx >= 0 ? nextIdx : tile.imgIdx;
        tile.prevIdx = tile.imgIdx >= 0 ? tile.imgIdx : useIdx;
        tile.imgIdx = useIdx;
        tile.fading = true;
        tile.fadeStart = t;
      }
    }

    // дальние кольца раньше
    order.sort((a, b) => b.ring - a.ring);

    for (let k = 0; k < order.length; k++) {
      const tile = tiles[order[k].idx];
      const dx = tile.c * tileW;
      const dy = tile.r * tileH;

      if (tile.fading) {
        const p = Math.min(1, (t - tile.fadeStart) / FADE_MS);
        ctx.globalAlpha = 1 - p;
        drawCoverRounded(ctx, pool[tile.prevIdx], dx, dy, tileW, tileH, tile.scale);
        ctx.globalAlpha = p;
        drawCoverRounded(ctx, pool[tile.imgIdx], dx, dy, tileW, tileH, tile.scale);
        ctx.globalAlpha = 1;

        if (p >= 1) {
          tile.fading = false;
          tile.nextChange = t + randInt(2500, 5500) + (tile.c + tile.r) * 5;
        }
      } else {
        drawCoverRounded(ctx, pool[tile.imgIdx], dx, dy, tileW, tileH, tile.scale);
      }
    }

    // курсор ушёл — разморозить кликнутый
    const ct = clickedTileIdRef.current;
    if (ct >= 0 && ct !== hoveredId) {
      const tTile = tiles[ct];
      if (tTile) tTile.frozen = false;
      clickedTileIdRef.current = -1;
    }
  }

  /* ===================== helpers ===================== */
  function randInt(min, max) {
    return Math.floor(min + Math.random() * (max - min + 1));
  }

  function drawCoverRounded(ctx, img, dx, dy, dw, dh, s = 1) {
    if (!img || !img.width || !img.height) return;

    const cx = dx + dw / 2;
    const cy = dy + dh / 2;
    const drawW = dw * s;
    const drawH = dh * s;

    const scale = Math.max(drawW / img.width, drawH / img.height);
    const sw = drawW / scale;
    const sh = drawH / scale;
    const sx = (img.width - sw) * 0.5;
    const sy = (img.height - sh) * 0.5;

    const radius = s > 1.01 ? Math.min(12 * (s / 3), 18) : 0;
    if (radius > 0) {
      ctx.save();
      roundedRect(ctx, cx - drawW / 2, cy - drawH / 2, drawW, drawH, radius);
      ctx.clip();
      ctx.drawImage(img, sx, sy, sw, sh, cx - drawW / 2, cy - drawH / 2, drawW, drawH);
      ctx.restore();
    } else {
      ctx.drawImage(img, sx, sy, sw, sh, cx - drawW / 2, cy - drawH / 2, drawW, drawH);
    }
  }

  function roundedRect(ctx, x, y, w, h, r) {
    const rr = Math.max(0, Math.min(r, Math.min(w, h) / 2));
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.lineTo(x + w - rr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
    ctx.lineTo(x + w, y + h - rr);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
    ctx.lineTo(x + rr, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
    ctx.lineTo(x, y + rr);
    ctx.quadraticCurveTo(x, y, x + rr, y);
    ctx.closePath();
  }

  /* ===================== события мыши (десктоп) ===================== */
  const onMouseMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onMouseLeave = () => {
    // курсор ушёл — «ховер» сбрасываем
    mouseRef.current = { x: -1e6, y: -1e6 };
    const ct = clickedTileIdRef.current;
    if (ct >= 0) {
      const t = tilesRef.current[ct];
      if (t) t.frozen = false;
      clickedTileIdRef.current = -1;
    }
    prevHoverIdRef.current = -1;
    prevHoverColRef.current = -1;
  };

  // Клик — увеличить текущий тайл и заморозить (десктоп)
  const onClick = () => {
    const tiles = tilesRef.current;
    const { cols, tileW, tileH } = gridRef.current;
    const mc = Math.floor(mouseRef.current.x / tileW);
    const mr = Math.floor(mouseRef.current.y / tileH);
    if (mc < 0 || mr < 0) return;
    const id = mr * cols + mc;
    const t = tiles[id];
    if (!t) return;

    if (!t.frozen) {
      const prev = clickedTileIdRef.current;
      if (prev >= 0 && tiles[prev]) tiles[prev].frozen = false;
      t.frozen = true;
      t.fading = false;
      clickedTileIdRef.current = id;
    }
  };

  /* ===================== pointer (палец на мобиле) ===================== */
  const pointerActiveRef = useRef(false);

  const onPointerDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    pointerActiveRef.current = true;
    canvasRef.current.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (isMobile && pointerActiveRef.current && e.cancelable) e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerUp = () => {
    pointerActiveRef.current = false;
    // === КЛЮЧЕВАЯ ПРАВКА: палец убран — ховер сбрасываем,
    // плитки плавно возвращаются к масштабу 1
    mouseRef.current = { x: -1e6, y: -1e6 };
    prevHoverIdRef.current = -1;
    prevHoverColRef.current = -1;
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
