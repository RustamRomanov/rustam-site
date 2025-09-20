// src/App.jsx
import * as React from "react";
import MosaicBackground from "./components/MosaicBackground.jsx";
import CenterRevealCard from "./components/CenterRevealCard.jsx";

/** Страховка от «белого экрана», если что-то внутри упадёт */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, err: null };
  }
  static getDerivedStateFromError(err) {
    return { hasError: true, err };
  }
  componentDidCatch(err, info) {
    console.error("[ErrorBoundary]", err, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            background: "#000",
            color: "#f55",
            fontFamily: "monospace",
            padding: 16,
            textAlign: "center",
            zIndex: 99999,
          }}
        >
          <div>
            <div style={{ fontSize: 16, marginBottom: 8 }}>
              Компонент упал при рендере.
            </div>
            <div style={{ fontSize: 14, opacity: 0.8 }}>
              Открой DevTools → Console, там будет точная ошибка.
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <div
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        backgroundColor: "#000",
      }}
    >
      {/* Фон-мозаика (канвас) */}
      <ErrorBoundary>
        <MosaicBackground />
      </ErrorBoundary>

      {/* Центральная плашка (десктоп/мобайл внутри) */}
      <ErrorBoundary>
        <div id="hero-card" style={{ position: "relative", zIndex: 30 }}>
          <CenterRevealCard />
        </div>
      </ErrorBoundary>
    </div>
  );
}
