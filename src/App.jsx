// src/App.jsx
import * as React from "react";
import MosaicBackground from "./components/MosaicBackground.jsx";
import CenterRevealCard from "./components/CenterRevealCard.jsx";

/** Страховка от падений */
class ErrorBoundary extends React.Component {
  constructor(p){ super(p); this.state={hasError:false,err:null}; }
  static getDerivedStateFromError(err){ return {hasError:true,err}; }
  componentDidCatch(err,info){ console.error("[ErrorBoundary]", err, info); }
  render(){
    if(this.state.hasError){
      return (
        <div style={{
          position:"fixed", inset:0, display:"grid", placeItems:"center",
          background:"#000", color:"#f55", fontFamily:"monospace", padding:16, textAlign:"center", zIndex:99999
        }}>
          <div>
            <div style={{ fontSize:16, marginBottom:8 }}>Компонент упал при рендере.</div>
            <div style={{ fontSize:14, opacity:0.8 }}>Открой DevTools → Console.</div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App(){
  // Глобальный CSS-патч для iOS: разрешаем скролл у body (нужен для 1px-трюка)
  React.useEffect(() => {
    const prevOverflow = document.body.style.overflowY;
    document.body.style.overflowY = "auto";
    return () => { document.body.style.overflowY = prevOverflow; };
  }, []);

  return (
    // ВНЕШНЯЯ ОБОЛОЧКА: делает страницу длиннее ровно на 1-2px, чтобы Safari мог
    // спрятать адресную строку и дать полный визуальный вьюпорт.
    <div style={{ minHeight: "101vh" }}>
      {/* СЦЕНА: липкая к верху, визуально неподвижная при той самой «1px-прокрутке» */}
      <div
        style={{
          position: "sticky",
          top: 0,
          height: "var(--vvh, 100dvh)", // если var --vvh уже выставляешь в main.jsx — будет идеально
          minHeight: "100svh",          // корректно на новых Safari
          overflow: "hidden",
          zIndex: 0,
          background: "transparent",
        }}
      >
        {/* ФОН (канвас) — под всем UI, клики не перехватывает */}
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1,
            pointerEvents: "none",
            background: "transparent",
          }}
        >
          <ErrorBoundary>
            <MosaicBackground />
          </ErrorBoundary>
        </div>

        {/* КОНТЕНТ — занимает всю высоту сцены */}
        <div
          style={{
            position: "relative",
            zIndex: 2,
            width: "100vw",
            height: "100%",
            overflow: "hidden",
            background: "transparent",
          }}
        >
          <ErrorBoundary>
            <div id="hero-card" style={{ position: "relative" }}>
              <CenterRevealCard />
            </div>
          </ErrorBoundary>
        </div>
      </div>

      {/* «Покер» для iOS: физически добавляет минимум контента, чтобы спряталась панель. */}
      <div aria-hidden style={{ height: "2px" }} />
    </div>
  );
}
