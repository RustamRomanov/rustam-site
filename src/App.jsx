// src/App.jsx
import * as React from "react";
import MosaicBackground from "./components/MosaicBackground.jsx";
import CenterRevealCard from "./components/CenterRevealCard.jsx";

/** Страховка от «белого экрана» */
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
  return (
    <>
      {/* === ФОН: фикс под всем UI, покрывает реальный «большой» экран === */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1,
          pointerEvents: "none",
          // растягиваемся под панели/чёлку (Safari iOS 17+ понимает lvh)
          width: "100vw",
          height: "100lvh",
          background: "transparent",
        }}
      >
        <ErrorBoundary>
          <MosaicBackground />
        </ErrorBoundary>
      </div>

      {/* === СКРОЛЛ-ТРЕК (только ради iOS UI): страница длиннее экрана === */}
      <div
        className="ios-scroll-track"
        // высота > 100svh даёт iOS возможность прятать/показывать панели
        style={{
          position: "relative",
          zIndex: 2,
          minHeight: "160lvh", // ключ — нет «намертво» 100vh
          background: "transparent",
        }}
      >
        {/* Липкий блок на весь видимый вьюпорт — твой контент */}
        <div
          className="sticky-viewport"
          style={{
            position: "sticky",
            top: 0,
            width: "100vw",
            height: "100svh",
            minHeight: "100svh",
            overflow: "hidden",
            background: "transparent",
            display: "grid",
            placeItems: "center",
          }}
        >
          <ErrorBoundary>
            <div id="hero-card" style={{ position: "relative" }}>
              <CenterRevealCard />
            </div>
          </ErrorBoundary>
        </div>
      </div>
    </>
  );
}
