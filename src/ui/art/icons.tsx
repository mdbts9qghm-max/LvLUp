/** Eckige Pixel-Icons (selbst gezeichnet), Farbe = currentColor. */
const ICONS = {
  quest: ['.......XX', '......XXX', '.....XXX.', '....XXX..', 'X..XXX...', '.XXXX....', '..XX.....', '.XX.X....', 'XX.......'],
  map: ['....X....', '....XXX..', '....XXXX.', '....X....', '...XXX...', '..XX.XX..', '.XX...XX.', 'XX.....XX', 'XXXXXXXXX'],
  skills: ['...XXX...', '...X.X...', '...XXX...', '....X....', '.XXXXXXX.', '.X.....X.', 'XXX...XXX', 'X.X...X.X', 'XXX...XXX'],
  hero: ['...XXX...', '..XXXXX..', '..XXXXX..', '...XXX...', '.........', '.XXXXXXX.', 'XXXXXXXXX', 'XXXXXXXXX', 'XXXXXXXXX'],
  stats: ['.......XX', '.......XX', '....XX.XX', '....XX.XX', '.XX.XX.XX', '.XX.XX.XX', '.XX.XX.XX', '.........', 'XXXXXXXXX'],
  sick: ['XXXXXXXXX', 'X.......X', 'X...X...X', 'X...X...X', 'X.XXXXX.X', 'X...X...X', 'X...X...X', 'X.......X', 'XXXXXXXXX'],
  check: ['.........', '........X', '.......XX', '......XX.', 'X....XX..', 'XX..XX...', '.XXXX....', '..XX.....', '.........'],
  lock: ['..XXXXX..', '.XX...XX.', '.X.....X.', '.X.....X.', 'XXXXXXXXX', 'XXXX.XXXX', 'XXXX.XXXX', 'XXXXXXXXX', '.........'],
  back: ['.........', '...X.....', '..XX.....', '.XXXXXXXX', 'XXXXXXXXX', '.XXXXXXXX', '..XX.....', '...X.....', '.........'],
  close: ['X.......X', 'XX.....XX', '.XX...XX.', '..XX.XX..', '...XXX...', '..XX.XX..', '.XX...XX.', 'XX.....XX', 'X.......X'],
  bolt: ['....XXX..', '...XXX...', '..XXX....', '.XXXXXX..', '....XXX..', '...XXX...', '..XX.....', '.X.......', '.........'],
  boss: ['X.......X', '.X.....X.', '..X...X..', '...X.X...', '....X....', '...X.X...', 'XXX...XXX', '.X.....X.', 'X.......X'],
  plus: ['.........', '....X....', '....X....', '....X....', 'XXXXXXXXX', '....X....', '....X....', '....X....', '.........'],
  gear: ['...XXX...', '.X.XXX.X.', '..XXXXX..', 'XXX...XXX', 'XXX...XXX', 'XXX...XXX', '..XXXXX..', '.X.XXX.X.', '...XXX...'],
  star: ['....X....', '....X....', '...XXX...', 'XXXXXXXXX', '.XXXXXXX.', '..XXXXX..', '..XX.XX..', '.XX...XX.', '.X.....X.'],
  moon: ['...XXX...', '.XXX.....', '.XX......', 'XX.......', 'XX.......', 'XX.......', '.XX....X.', '.XXXXXXX.', '...XXX...'],
  download: ['....X....', '....X....', '....X....', '..XXXXX..', '...XXX...', '....X....', '.........', 'X.......X', 'XXXXXXXXX'],
  upload: ['....X....', '...XXX...', '..XXXXX..', '....X....', '....X....', '....X....', '.........', 'X.......X', 'XXXXXXXXX'],
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 18, className, title }: { name: IconName; size?: number; className?: string; title?: string }) {
  const rows = ICONS[name];
  const rects: JSX.Element[] = [];
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) if (row[x] === 'X') rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} />);
  });
  return (
    <svg viewBox="0 0 9 9" width={size} height={size} shapeRendering="crispEdges" fill="currentColor" className={className} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      {rects}
    </svg>
  );
}

const FLAME = ['....F....', '...FF....', '...FFF...', '..FFYF.F.', '..FYYFFF.', '.FFYYYFF.', '.FYYWYYF.', '.FYWWWYF.', '..FFFFF..'];
export function Flame({ size = 18, dim = false }: { size?: number; dim?: boolean }) {
  const col: Record<string, string> = dim ? { F: '#5A5366', Y: '#6E667A', W: '#8A8296' } : { F: '#D9783A', Y: '#E9A23B', W: '#F4D9A0' };
  const rects: JSX.Element[] = [];
  FLAME.forEach((row, y) => [...row].forEach((c, x) => c !== '.' && rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={col[c]} />)));
  return (
    <svg viewBox="0 0 9 9" width={size} height={size} shapeRendering="crispEdges" aria-hidden>
      {rects}
    </svg>
  );
}
