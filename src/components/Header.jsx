import { useState } from "react";

const Role = ({ title, desc }) => {
  const [hover, setHover] = useState(false);
  return (
    <div
      className="relative mx-4 uppercase text-sm font-semibold cursor-default select-none"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {title}
      <div
        className={`absolute top-full left-1/2 -translate-x-1/2 mt-2 text-xs px-4 py-2 rounded backdrop-blur
                    transition-all duration-200 whitespace-nowrap
                    ${hover ? "bg-white/14 opacity-100" : "bg-white/14 opacity-0 pointer-events-none"}`}
      >
        {desc}
      </div>
    </div>
  );
};

export default function Header() {
  return (
    <div
      data-no-mosaic
      className="absolute inset-0 z-20 flex items-center justify-center"
    >
      <header className="text-center">
        <h1 className="text-5xl font-extrabold tracking-wide fade-up">
          РУСТАМ РОМАНОВ
        </h1>
        <div className="mt-6 flex justify-center fade-up">
          <Role title="Режиссёр" desc="Любовь" />
          <Role title="Продюсер" desc="Предпродакшн — Постпродакшн" />
          <Role title="Сценарист" desc="Музыкальные клипы — Документальное кино" />
        </div>
      </header>
    </div>
  );
}
