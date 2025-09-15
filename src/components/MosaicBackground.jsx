// src/components/MosaicBackground.jsx
import React, { useEffect, useRef, useState } from "react";

/** Целевая плотность (ориентир 16:9) */
const BASE_TILE_W = 80;
const BASE_TILE_H = 45;

/** Волна / кроссфейд / зум */
const WAVE_STEP = 90;
const WAVE_PERIOD_MIN = 5000;
const WAVE_PERIOD_MAX = 9000;
const FADE_MS = 800;
const RING_SCALES = [3, 2, 1.5, 1.2];
const LERP = 0.22;
const HOVER_BOOST = 1.2;

/** Путь к изображениям */
const BASE = "/rustam-site/assents/images/";

/** Если манифеста нет — используем фиксированное количество файлов img1..imgN */
// <<< CHANGEME: поменяй число, когда добавишь/уберёшь файлы
const STATIC_COUNT = 285;

/** ------- АУДИО: «бульк» + реверберация -------- */
const BUBBLE_COOLDOWN_MS = 120;     // защита от частых срабатываний
const BUBBLE_DUR = 0.35;            // длительность «булька»
const REVERB_SEC = 1.2;             // длина импульс-реверба
const REVERB_DECAY = 2.5;           // спад реверба
const MASTER_GAIN = 0.22;           // общий лимитер громкости
const WET = 0.35;                   // доля реверба

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

  const poolRef = useRef([]);   // Image[] (отсортированные)
  const seqRef  = useRef([]);   // номер из имени
  const tilesRef = useRef([]);  // тайлы
  const rafRef = useRef(0);

  const gridRef = useRef({ cols: 0, rows: 0, tileW: BASE_TILE_W, tileH: BASE_TILE_H });
  const mouseRef = useRef({ x: -1e6, y: -1e6 });
  const waveRef = useRef({ nextWaveAt: 0 });
  const ptrRef  = useRef(0);    // циклический указатель по пулу

  // Отправляем mosaic:ready ровно один раз
  const readySentRef = useRef(false);

  /** --------- АУДИО КОНТЕКСТ + РЕВЕРБ --------- */
  const audioRef = useRef({
    ctx: null,
    master: null,
    wetGain: null,
    dryGain: null,
    convolver: null,
  });

  const getAudioContext = async () => {
    try {
      if (window.__rr_audio_ctx) {
        if (window.__rr_audio_ctx.state === "suspended") await window.__rr_audio_ctx.resume().catch(() => {});
        return window.__rr_audio_ctx;
      }
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      const ctx = new Ctx();
      window.__rr_audio_ctx = ctx;
      if (ctx.state === "suspended") await ctx.resume().catch(() => {});
      return ctx;
    } catch { return null; }
  };

  const createImpulseResponse = (ctx, seconds = REVERB_SEC, decay = REVERB_DECAY) => {
    const rate = ctx.sampleRate;
    const length = Math.max(1, Math.floor(rate * seconds));
    const impulse = ctx.createBuffer(2, length, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        // экспоненциальный спад, немного рандома
        const t = i / length;
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay);
      }
    }
    return impulse;
    // лёгкий, «кинематографичный» хвост
  };

  const ensureAudio = async () => {
    if (audioRef.current.ctx) return true;
    const ctx = await getAudioContext(); if (!ctx) return false;

    const master = ctx.createGain();
    master.gain.value = MASTER_GAIN;
    master.connect(ctx.destination);

    const dryGain = ctx.createGain();
    dryGain.gain.value = 1.0;
    dryGain.connect(master);

    const wetGain = ctx.createGain();
    wetGain.gain.value = WET;
    wetGain.connect(master);

    const convolver = ctx.createConvolver();
    convolver.buffer = createImpulseResponse(ctx);
    convolver.connect(wetGain);

    audioRef.current = { ctx, master, wetGain, dryGain, convolver };
    return true;
  };

  // Праймим аудио по жесту (Safari)
  useEffect(() => {
    const prime = async () => { await ensureAudio(); };
    window.addEventListener("pointerdown", prime, { once: true, capture: true });
    window.addEventListener("touchstart", prime,  { once: true, capture: true });
    window.addEventListener("keydown", prime,     { once: true, capture: true });
    window.addEventListener("mousemove", prime,   { once: true, capture: true });
    return () => {
      window.removeEventListener("pointerdown", prime, true);
      window.removeEventListener("touchstart", prime, true);
      window.removeEventListener("keydown", prime, true);
      window.removeEventListener("mousemove", prime, true);
    };
  }, []);

  // «бульк» в позиции X (0..1 по ширине), Y не используем, но можно для будущего
  const playBubble = async (xNorm = 0.5) => {
    const ok = await ensureAudio(); if (!ok) return;
    const { ctx, dryGain, convolver } = audioRef.current;
    const now = ctx.currentTime;

    // Пэн по горизонтали
    let panner = null;
    if (typeof ctx.createStereoPanner === "function") {
      panner = ctx.createStereoPanner();
      panner.pan.value = Math.max(-1, Math.min(1, xNorm * 2 - 1));
    }

    // Основной «капельный» тон: косой слайд сверху вниз
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + BUBBLE_DUR);

    // Лёгкий щелчок/толчок «булька» — короткий вторичный тон
    const pop = ctx.createOscillator();
    pop.type = "triangle";
    pop.frequency.setValueAtTime(1800, now);
    pop.frequency.exponentialRampToValueAtTime(400, now + 0.06);

    // Огибающие
    const gMain = ctx.createGain();
    gMain.gain.setValueAtTime(0.0001, now);
    gMain.gain.exponentialRampToValueAtTime(0.25, now + 0.02);
    gMain.gain.exponentialRampToValueAtTime(0.0001, now + BUBBLE_DUR);

    const gPop = ctx.createGain();
    gPop.gain.setValueAtTime(0.0001, now);
    gPop.gain.exponentialRampToValueAtTime(0.18, now + 0.01);
    gPop.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

    // Сухой и посыл на реверб
    const dryBus = ctx.createGain();
    dryBus.gain.value = 1.0;

    const wetSend = ctx.createGain();
    wetSend.gain.value = 1.0;

    // Цепочки
    if (panner) {
      gMain.connect(panner); gPop.connect(panner);
      panner.connect(dryBus); panner.connect(wetSend);
    } else {
      gMain.connect(dryBus); gPop.connect(dryBus);
      gMain.connect(wetSend); gPop.connect(wetSend);
    }

    dryBus.connect(dryGain);
    wetSend.connect(convolver);

    osc.connect(gMain); pop.connect(gPop);

    osc.start(now);     pop.start(now);
    pop.stop(now + 0.09);
    osc.stop(now + BUBBLE_DUR + 0.02);

    // аккуратная уборка
    const kill = () => {
      try {
        gMain.disconnect(); gPop.disconnect();
        dryBus.disconnect(); wetSend.disconnect();
        if (panner) panner.disconnect();
      } catch {}
    };
    setTimeout(kill, (BUBBLE_DUR + 0.2) * 1000);
  };

  // -------- 1) Получаем список файлов --------
  useEffect(() => {
    let stop = false;
    (async () => {
      try {
        // Пытаемся взять manifest.json (если он есть)
        const res = await fetch(`${BASE}manifest.json?ts=${Date.now()}`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          const listFromManifest =
            Array.isArray(data?.jpg) ? data.jpg :
            Array.isArray(data)      ? data    : [];
          if (listFromManifest.length) {
            const found = listFromManifest.map((n) => `${BASE}${n}`);
            if (!stop) { setUrls(found); return; }
          }
        }
      } catch { /* пойдём на фоллбек */ }

      // Фоллбек: фиксированный диапазон img1..imgN
      const found = Array.from({ length: Math.max(0, STATIC_COUNT) }, (_, i) => `${BASE}img${i + 1}.jpg`);
      if (!stop) setUrls(found);
    })();
    return () => { stop = true; };
  }, []);

  // -------- 2) Инициализация canvas + динамическая сетка --------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctxRef.current = ctx;

    const resize = () => {
      const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1)); // ограничим DPR до 3
      const w = window.innerWidth, h = window.innerHeight;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // считаем кол-во колонок/строк от базовой плотности
      const cols = Math.max(1, Math.ceil(w / BASE_TILE_W));
      const rows = Math.max(1, Math.ceil(h / BASE_TILE_H));
      const tileW = Math.ceil(w / cols);
      const tileH = Math.ceil(h / rows);

      gridRef.current = { cols, rows, tileW, tileH };

      // Пересобираем тайлы при каждом ресайзе
      initTiles(true);
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // -------- 3) Прелоад изображений --------
  useEffect(() => {
    if (!urls.length) return;

    const ordered = [...urls].sort((a, b) => parseSeq(a) - parseSeq(b));
    poolRef.current = new Array(ordered.length);
    seqRef.current  = new Array(ordered.length);

    let loaded = 0;
    let cancelled = false;

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
      img.src = u + (u.includes("?") ? "&" : "?") + "v=" + Date.now(); // cache-bust
    });

    if (!rafRef.current) start();

    return () => { cancelled = true; };
  }, [urls]);

  // -------- 4) Первичная раскладка (full при force=true) --------
  function initTiles(force = false) {
    const { cols, rows } = gridRef.current;
    if (!cols || !rows) return;

    const now = performance.now();
    const total = cols * rows;
    const tiles = new Array(total);

    // 8-соседей
    const dirs = [
      [-1, -1], [0, -1], [1, -1],
      [-1,  0],          [1,  0],
      [-1,  1], [0,  1], [1,  1],
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

          // для звука «бульк»
          prevRing: 99,
          lastBloopAt: 0,
        };
      }
    }

    const pool = poolRef.current;

    if (pool.length && (force || !tilesRef.current.length)) {
      // порядок — «шахматка»
      const order = [];
      for (let p = 0; p < 2; p++) {
        for (let i = 0; i < tiles.length; i++) {
          const t = tiles[i];
          if (((t.c + t.r) & 1) === p) order.push(i);
        }
      }

      for (const id of order) {
        const t = tiles[id];
        t.imgIdx = chooseIdxForTile(t, tiles);
        if (t.imgIdx < 0 && pool.length) t.imgIdx = (ptrRef.current++) % pool.length;
      }
    } else if (tilesRef.current.length) {
      // При ресайзе — переносим старые тайлы
      tilesRef.current.forEach((old, i) => {
        if (i < tiles.length) Object.assign(tiles[i], old);
      });
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

  // -------- 5) Подбор индексов (анти-дубли) --------
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

  function usedIndicesGlobal(tiles, exceptId = -1) {
    const used = new Set();
    for (const t of tiles) {
      if (!t) continue;
      if (t.id === exceptId) continue;
      if (t.imgIdx >= 0) used.add(t.imgIdx);
      if (t.fading && t.prevIdx >= 0) used.add(t.prevIdx);
    }
    return used;
  }

  function chooseIdxForTile(tile, tiles) {
    const pool = poolRef.current;
    if (!pool.length) return -1;

    const { idxSet: neiIdx, seqSet: neiSeq } = neighborSets(tile, tiles);
    const globalUsed = usedIndicesGlobal(tiles, tile.id);
    const start = ptrRef.current % pool.length;

    const canBeAllUnique = pool.length > globalUsed.size;

    if (canBeAllUnique) {
      for (let step = 0; step < pool.length; step++) {
        const i = (start + step) % pool.length;
        if (!pool[i] || !pool[i].width) continue;
        if (globalUsed.has(i)) continue;
        if (neiIdx.has(i)) continue;
        const s = seqRef.current[i];
        if (neiSeq.has(s - 1) || neiSeq.has(s + 1)) continue;
        ptrRef.current = i + 1;
        return i;
      }
      for (let step = 0; step < pool.length; step++) {
        const i = (start + step) % pool.length;
        if (!pool[i] || !pool[i].width) continue;
        if (globalUsed.has(i)) continue;
        ptrRef.current = i + 1;
        return i;
      }
    }

    for (let step = 0; step < pool.length; step++) {
      const i = (start + step) % pool.length;
      if (!pool[i] || !pool[i].width) continue;
      if (neiIdx.has(i)) continue;
      const s = seqRef.current[i];
      if (neiSeq.has(s - 1) || neiSeq.has(s + 1)) continue;
      ptrRef.current = i + 1;
      return i;
    }
    for (let step = 0; step < pool.length; step++) {
      const i = (start + step) % pool.length;
      if (pool[i] && pool[i].width) {
        ptrRef.current = i + 1;
        return i;
      }
    }
    return -1;
  }

  // -------- 6) Рендер-цикл --------
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

    // После первого кадра — сигналим, что мозаика готова
    if (!readySentRef.current) {
      readySentRef.current = true;
      setTimeout(() => { window.dispatchEvent(new Event("mosaic:ready")); }, 0);
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

    const { tileW, tileH } = gridRef.current;
    const mc = Math.floor(mouseRef.current.x / tileW);
    const mr = Math.floor(mouseRef.current.y / tileH);

    // масштаб + запланированные замены
    const order = new Array(tiles.length);
    for (let i = 0; i < tiles.length; i++) {
      const tile = tiles[i];
      const ring = Math.max(Math.abs(tile.c - mc), Math.abs(tile.r - mr));
      order[i] = { idx: i, ring };

      // Триггер звука «бульк», когда курсор ЗАХОДИТ на тайл (ring меняется на 0)
      if (ring === 0 && tile.prevRing !== 0) {
        const cx = (tile.c + 0.5) * tileW;
        // панорама по X
        playBubble(cx / Math.max(1, window.innerWidth));
        tile.lastBloopAt = t;
      }
      tile.prevRing = ring;

      // целевой масштаб (+20% для тайла под курсором)
      let target = 1;
      if (ring === 0) target = RING_SCALES[0] * HOVER_BOOST;
      else if (ring === 1) target = RING_SCALES[1];
      else if (ring === 2) target = RING_SCALES[2];
      else if (ring === 3) target = RING_SCALES[3];
      tile.scale += (target - tile.scale) * LERP;

      // замена по расписанию
      if (!tile.fading && t >= tile.nextChange) {
        const nextIdx = chooseIdxForTile(tile, tiles);
        const useIdx = nextIdx >= 0 ? nextIdx : tile.imgIdx;
        tile.prevIdx = tile.imgIdx >= 0 ? tile.imgIdx : useIdx;
        tile.imgIdx = useIdx;
        tile.fading = true;
        tile.fadeStart = t;
      }
    }

    // дальние кольца раньше — центр поверх
    order.sort((a, b) => b.ring - a.ring);

    // рендер
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
  }

  // -------- helpers --------
  function randInt(min, max) { return Math.floor(min + Math.random() * (max - min + 1)); }

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

  const onMouseMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };
  const onMouseLeave = () => { mouseRef.current = { x: -1e6, y: -1e6 }; };

  return (
    <canvas
      ref={canvasRef}
      className="mosaic-canvas absolute top-0 left-0 w-full h-full z-10"
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    />
  );
}
