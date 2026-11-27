// Logo de marca: perro guardián tipo pastor alemán (SVG en línea, sin imágenes externas).
export function Perro() {
  return (
    <svg viewBox="0 0 120 120" width="64" height="64" role="img" aria-label="Perro guardián pastor alemán">
      <circle cx="60" cy="60" r="58" fill="#151a22" stroke="#4f8cff" strokeWidth="3" />
      {/* Orejas erguidas */}
      <polygon points="26,14 50,40 26,54" fill="#b87a2a" />
      <polygon points="94,14 70,40 94,54" fill="#b87a2a" />
      <polygon points="31,22 47,40 31,48" fill="#2b2118" />
      <polygon points="89,22 73,40 89,48" fill="#2b2118" />
      {/* Cabeza color canela */}
      <path d="M24 54 Q60 30 96 54 Q106 80 60 108 Q14 80 24 54Z" fill="#c8862a" />
      {/* Manto oscuro (silla) */}
      <path d="M26 54 Q60 36 94 54 Q88 66 60 64 Q32 66 26 54Z" fill="#2b2118" />
      {/* Hocico claro */}
      <path d="M40 76 Q60 64 80 76 Q77 98 60 106 Q43 98 40 76Z" fill="#ead3a4" />
      {/* Nariz */}
      <ellipse cx="60" cy="90" rx="7" ry="5" fill="#0b0e13" />
      {/* Ojos atentos */}
      <ellipse cx="46" cy="64" rx="4" ry="3.5" fill="#0b0e13" />
      <ellipse cx="74" cy="64" rx="4" ry="3.5" fill="#0b0e13" />
      <circle cx="47" cy="63" r="1.2" fill="#fff" />
      <circle cx="75" cy="63" r="1.2" fill="#fff" />
      {/* Collar con placa */}
      <path d="M38 104 Q60 114 82 104" stroke="#22c55e" strokeWidth="5" fill="none" strokeLinecap="round" />
      <circle cx="60" cy="110" r="4" fill="#f59e0b" />
    </svg>
  );
}

export default function LogoMarca() {
  return (
    <div className="marca">
      <Perro />
      <div>
        <strong className="marca-nombre">DOJOLABS</strong>
        <span className="marca-sub">SERVICE WATCHER MONITOR SYSTEM</span>
      </div>
    </div>
  );
}
