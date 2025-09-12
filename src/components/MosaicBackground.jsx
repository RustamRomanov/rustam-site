// MosaicBackground.jsx
import React, { useEffect, useRef, useState } from "react";

/** Целевая плотность (ориентир 16:9) */
const BASE_TILE_W = 80;
const BASE_TILE_H = 45;

/** Волна / кроссфейд / лупа */
const WAVE_STEP = 90;
const WAVE_PERIOD_MIN = 5000;
const WAVE_PERIOD_MAX = 9000;
const FADE_MS = 800;
const RING_SCALES = [3, 2, 1.5, 1.2];
const LERP = 0.22;
const HOVER_BOOST = 1.2;

/** Путь к изображениям */
const BASE = "/rustam-site/assents/images/";

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

  const poolRef = useRef([]);      // Image[] (отсортированные)
  const seqRef  = useRef([]);      // номер из имени
  const tilesRef = useRef([]);     // тайлы
  const rafRef = useRef(0);

  const gridRef = useRef({ cols: 0, rows: 0, tileW: BASE_TILE_W, tileH: BASE_TILE_H });
  const mouseRef = useRef({ x: -1e6, y: -1e6 });
  const waveRef = useRef({ nextWaveAt: 0 });
  const ptrRef  = useRef(0);       // циклический указатель

  // ---------- 1) Список файлов ----------
  useEffect(() => {
    let stop = false;
    (async () => {
      try {
        const res = await fetch(`${BASE}manifest.json?ts=${Date.now()}`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data?.jpg) ? data.jpg : [];
          const found = list.map((n) => `${BASE}${n}`);
          if (!stop) { setUrls(found); return; }
        }
      } catch {}
      const found = [];
      for (let i = 1; i <= 2000 && !stop; i++) {
        const u = `${BASE}img${i}.jpg`;
        try {
          const head = await fetch(u, { method: "HEAD", cache: "no-store" });
          if (head.ok) found.push(u); else break;
        } catch { break; }
      }
      if (!stop) setUrls(found);
    })();
    return () => { stop = true; };
  }, []);

  // ---------- 2) Canvas + динамическая сетка ----------
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctxRef.current = ctx;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = window.innerWidth, h = window.innerHeight;
      canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
      canvas.width = Math.floor(w * dpr); canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // считаем кол-во колонок/строк от базовой плотности
      const cols = Math.max(1, Math.ceil(w / BASE_TILE_W));
      const rows = Math.max(1, Math.ceil(h / BASE_TILE_H));
      const tileW = Math.ceil(w / cols);
      const tileH = Math.ceil(h / rows);

      gridRef.current = { cols, rows, tileW, tileH };

      // ВАЖНО: при любом ресайзе полностью пересобираем и перераздаём тайлы
      initTiles(true);
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // ---------- 3) Загрузка изображений ----------
  useEffect(() => {
    if (!urls.length) return;

    const ordered = [...urls].sort((a, b) => parseSeq(a) - parseSeq(b));
    poolRef.current = new Array(ordered.length);
    seqRef.current  = new Array(ordered.length);

    let loaded = 0;
    ordered.forEach((u, k) => {
      const img = new Image();
      img.onload = () => {
        poolRef.current[k] = img;
        seqRef.current[k]  = parseSeq(u);
        loaded++;
        if (loaded === ordered.length) {
          initTiles(true);
          if (!rafRef.current) start();
        }
      };
      img.src = u + (u.includes("?") ? "&" : "?") + "v=" + Date.now(); // cache-bust
    });

    if (!rafRef.current) start();
  }, [urls]);

  // ---------- 4) Первичная раскладка (всегда полная при force=true) ----------
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
        };
      }
    }

    const pool = poolRef.current;

    if (pool.length && (force || !tilesRef.current.length)) {
      // порядок — «шахматка», меньше конфликтов
      const order = [];
      for (let p = 0; p < 2; p++) {
        for (let i = 0; i < tiles.length; i++) {
          const t = tiles[i];
          if (((t.c + t.r) & 1) === p) order.push(i);
        }
      }

      // Полное переименование (без переноса старых индексов — это и ломало макет)
      for (const id of order) {
        const t = tiles[id];
        t.imgIdx = chooseIdxForTile(t, tiles);
        if (t.imgIdx < 0) t.imgIdx = (ptrRef.current++) % pool.length; // жёсткий запасной
      }
    } else {
      tilesRef.current?.forEach((old, i) => {
        if (i < tiles.length) Object.assign(tiles[i], old);
      });
    }

    tilesRef.current = tiles;
    scheduleNextWave(performance.now());
  }

  function scheduleNextWave(now) {
    waveRef.current.nextWaveAt = now + randInt(WAVE_PERIOD_MIN, WAVE_PERIOD_MAX);
  }

  // ---------- 5) Запреты: одинаковый с соседом и сосед по номеру N±1 ----------
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

    // Идеальный вариант
    for (let step = 0; step < pool.length; step++) {
      const i = (start + step) % pool.length;
      if (!pool[i] || !pool[i].width) continue;
      if (idxSet.has(i)) continue;
      const s = seqRef.current[i];
      if (seqSet.has(s - 1) || seqSet.has(s + 1)) continue; // запрет N±1
      ptrRef.current = i + 1;
      return i;
    }
    // Фоллбек: хотя бы не точный дубль рядом
    for (let step = 0; step < pool.length; step++) {
      const i = (start + step) % pool.length;
      if (!pool[i] || !pool[i].width) continue;
      if (idxSet.has(i)) continue;
      ptrRef.current = i + 1;
      return i;
    }
    return -1;
  }

  // ---------- 6) Рендер-цикл ----------
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

    // масштаб + замены
    const order = new Array(tiles.length);
    for (let i = 0; i < tiles.length; i++) {
      const tile = tiles[i];
      const ring = Math.max(Math.abs(tile.c - mc), Math.abs(tile.r - mr));
      order[i] = { idx: i, ring };

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

    // дальние кольца раньше
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

  // ---------- helpers ----------
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
