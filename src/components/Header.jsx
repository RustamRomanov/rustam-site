import './Header.css';

function Header() {
  return (
    <header className="fade-up delay-1">
      <h1 className="header-title">РУСТАМ РОМАНОВ</h1>
      <div className="roles fade-up delay-2">
        <HoverRole label="Режиссер" tooltip="любовь" />
        <HoverRole label="Продюсер" tooltip="предпродакшн – постпродакшн" />
        <HoverRole label="Сценарист" tooltip="музыкальные клипы – документальное кино" />
      </div>
    </header>
  );
}

function HoverRole({ label, tooltip }) {
  return (
    <div className="role-item">
      {label}
      <div className="tooltip-box">{tooltip}</div>
    </div>
  );
}

export default Header;
