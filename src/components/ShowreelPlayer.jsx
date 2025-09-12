import { useEffect, useRef, useState } from "react";

export default function ShowreelPlayer() {
  const [open, setOpen] = useState(false);
  const videoRef = useRef(null);

  const videoUrl = `${import.meta.env.BASE_URL}assents/video/showreel.mp4`;
  // BASE_URL нужен, если ты открываешь сайт как /rustam-site/ (подпапка). В dev тоже работает.

  useEffect(() => {
    const onEsc = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, []);

  useEffect(() => {
    if (open && videoRef.current) {
      // воспроизводим со звуком после клика (браузер разрешает)
      const v = videoRef.current;
      v.muted = false;
      const tryPlay = async () => {
        try { await v.play(); } catch { /* на всякий случай */ }
      };
      tryPlay();
    }
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="absolute top-[140px] left-1/2 -translate-x-1/2 z-[3]
                   bg-white/12 backdrop-blur px-6 py-2 rounded-md
                   hover:bg-white/20 transition"
      >
        ▶ Showreel
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[50] bg-black/90 flex items-center justify-center"
          onClick={() => setOpen(false)}
        >
          <div className="relative w-[88vw] max-w-4xl aspect-video" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setOpen(false)}
              className="absolute -top-12 right-0 text-white text-2xl"
              aria-label="Close"
            >
              ✕
            </button>

            <video
              ref={videoRef}
              src={videoUrl}
              controls
              playsInline
              className="w-full h-full"
            />
          </div>
        </div>
      )}
    </>
  );
}
