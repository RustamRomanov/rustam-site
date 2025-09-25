// src/App.jsx
import * as React from "react";
import MosaicBackground from "./components/MosaicBackground.jsx";
import CenterRevealCard from "./components/CenterRevealCard.jsx";

class ErrorBoundary extends React.Component {
  constructor(p){ super(p); this.state={hasError:false,err:null}; }
  static getDerivedStateFromError(err){ return {hasError:true,err}; }
  componentDidCatch(err,info){ console.error("[ErrorBoundary]", err, info); }
  render(){
    if(this.state.hasError){
      return (
        <div style={{
          position:"absolute", inset:0, display:"grid", placeItems:"center",
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
      {/* ФОН (канвас): фикс под всем UI, ВАЖНО — pointerEvents: 'auto' */}
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

      {/* КОНТЕНТ (поверх фона): занимает визуальный вьюпорт на iOS */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          width: "100vw",
          height: "100svh",          // корректная высота iOS
          minHeight: "-webkit-fill-available",
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
    </>
  );
}
