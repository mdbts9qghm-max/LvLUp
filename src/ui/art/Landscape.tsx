/** Pixel-Landschaft in der Dämmerung, prozedural gezeichnet (keine fremden Assets). */
import { memo } from 'react';

const W = 96;
const H = 54;

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function ridge(peaks: [number, number, number][], base: number) {
  return (x: number) => {
    let h = base;
    for (const [px, ph, slope] of peaks) h = Math.min(h, ph + Math.abs(x - px) * slope);
    return Math.round(h);
  };
}

interface Props {
  world: number; // 1..6 – Berge werden höher
  className?: string;
}

export const Landscape = memo(function Landscape({ world, className }: Props) {
  const lift = Math.min(5, Math.max(0, world - 1)) * 2; // höhere Berge in späteren Welten
  const rects: JSX.Element[] = [];
  let k = 0;
  const r = (x: number, y: number, w: number, h: number, fill: string) => rects.push(<rect key={k++} x={x} y={y} width={w} height={h} fill={fill} />);

  // Himmel in Bändern (violette Dämmerung)
  const sky = ['#1C1530', '#231A3B', '#2C2047', '#382852', '#46305C', '#583A66', '#6B456B'];
  sky.forEach((c, i) => r(0, i * 5, W, 5, c));
  r(0, 35, W, 19, '#6B456B');

  // Sterne
  const rand = rng(7);
  for (let i = 0; i < 26; i++) {
    const x = Math.floor(rand() * W);
    const y = Math.floor(rand() * 20);
    r(x, y, 1, 1, rand() > 0.7 ? '#ECE5D6' : '#A99BC4');
  }
  // Mond
  const moon = ['..MMM..', '.MMMMM.', 'MMMmMMM', 'MMMMMmM', 'MMmMMMM', '.MMMMM.', '..MMM..'];
  moon.forEach((row, y) => [...row].forEach((c, x) => c !== '.' && r(76 + x, 5 + y, 1, 1, c === 'M' ? '#ECE5D6' : '#C9C0B0')));

  // Ferne Bergkette mit Schneegipfeln
  const far = ridge([[14, 20 - lift, 0.9], [38, 16 - lift, 0.8], [62, 22 - lift, 1], [86, 18 - lift, 0.85]], 40);
  for (let x = 0; x < W; x++) {
    const y = far(x);
    r(x, y, 1, H - y, '#3A3158');
    const top = Math.min(...[[14, 20], [38, 16], [62, 22], [86, 18]].map(([px, ph]) => (Math.abs(x - px) < 4 ? ph - lift : 99)));
    if (top < 99) r(x, y, 1, Math.max(1, 3 - Math.abs(y - top)), '#CFC6DE');
  }
  // Mittlere Kette mit Gipfel und Flagge
  const peakX = 70;
  const peakY = 24 - lift;
  const mid = ridge([[20, 30 - lift / 2, 0.9], [peakX, peakY, 0.75], [96, 33 - lift / 2, 0.9]], 44);
  for (let x = 0; x < W; x++) {
    const y = mid(x);
    r(x, y, 1, H - y, '#2A2240');
    if (Math.abs(x - peakX) <= 3) r(x, y, 1, 2, '#B9AFCF');
    if (Math.abs(x - 20) <= 2) r(x, y, 1, 1, '#B9AFCF');
  }
  // Gipfelflagge
  r(peakX, peakY - 6, 1, 6, '#ECE5D6');
  r(peakX + 1, peakY - 6, 4, 1, '#D9783A');
  r(peakX + 1, peakY - 5, 3, 1, '#D9783A');
  r(peakX + 1, peakY - 4, 2, 1, '#B5602C');

  // Nahe Hügel
  const near = ridge([[8, 40, 0.5], [48, 42, 0.35], [88, 39, 0.5]], 48);
  for (let x = 0; x < W; x++) {
    const y = near(x);
    r(x, y, 1, H - y, '#1E1829');
  }
  // Boden
  r(0, 48, W, 6, '#1B1626');

  // Trailpfad: vom Vordergrund zum Gipfel
  const path: [number, number][] = [];
  for (let y = 53; y >= 46; y--) path.push([48 + Math.round((53 - y) * 0.6), y]);
  for (let y = 45; y >= peakY + 1; y--) {
    const t = (45 - y) / (45 - peakY);
    path.push([Math.round(52 + Math.sin(t * 9) * 4 + t * (peakX - 52)), y]);
  }
  path.forEach(([x, y], i) => r(x, y, i < 8 ? 3 : 1, 1, i < 8 ? '#6B5A4A' : '#8A7560'));

  // Nadelbäume
  const trees = [3, 10, 16, 27, 33, 66, 72, 79, 84, 91];
  trees.forEach((tx, i) => {
    const base = 49 + (i % 3);
    const h = 7 + (i % 3) * 2;
    for (let j = 0; j < h; j++) {
      const w = Math.max(1, Math.floor(((j + 1) / h) * 5)) | 1;
      r(tx - Math.floor(w / 2), base - h + j, w, 1, j % 3 === 2 ? '#1A2A2A' : '#20332F');
    }
    r(tx, base, 1, 2, '#3A2A22');
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" shapeRendering="crispEdges" className={className} aria-hidden>
      {rects}
    </svg>
  );
});
