import * as React from "react";
import MosaicBackground from "./components/MosaicBackground.jsx";
import CenterRevealCard from "./components/CenterRevealCard.jsx";
import Header from "./components/Header.jsx";

/** Страховка от «белого экрана» */
class ErrorBoundary extends React.Component {
  constructor(p) {
    super(p);
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
              Открой DevTools → Console.
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
    <>
      {/* ФОН: фикс под всем UI */}
      <div className="bg-fixed-under-ui">
        <ErrorBoundary>
          <MosaicBackground />
        </ErrorBoundary>
      </div>

      {/* КОНТЕНТ поверх (щит + z-20) */}
      <div className="app relative z-20" data-no-mosaic>
        <ErrorBoundary>
          <Header />
          <div id="hero-card" className="relative z-20" data-no-mosaic>
            <CenterRevealCard />
          </div>
        </ErrorBoundary>
      </div>
    </>
  );
}
