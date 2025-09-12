import React, { useEffect, useRef } from "react";

export default function CanvasWave() {
  const ref = useRef(null);
  const mouse = useRef({ x: -1e4, y: -1e4 });
  const raf = useRef();

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    let W = (canvas.width = window.innerWidth);
    let H = (canvas.height = window.innerHeight);

    const pts = [];
    const step = 48;
    for (let x = 0; x <= W; x += step) {
      for (let y = 0; y <= H; y += step) pts.push({ x, y, r: 1 });
    }

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      for (const p of pts) {
        const d = Math.hypot(p.x - mouse.current.x, p.y - mouse.current.y);
        const target = d < 90 ? 2.2 : d < 180 ? 1.5 : d < 260 ? 1.15 : 1;
        p.r += (target - p.r) * 0.08;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.06)";
        ctx.fill();
      }

      raf.current = requestAnimationFrame(draw);
    };

    const onMove = (e) => {
      const r = canvas.getBoundingClientRect();
      mouse.current.x = e.clientX - r.left;
      mouse.current.y = e.clientY - r.top;
    };

    const onResize = () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("resize", onResize);
    draw();

    return () => {
      cancelAnimationFrame(raf.current);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <div className="relative w-full h-full">
      <canvas ref={ref} className="w-full h-full pointer-events-none" />
    </div>
  );
}
