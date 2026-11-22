/**
 * Avatar-Sprite 16 × 31 Pixel, Vorderansicht, athletische Proportionen.
 * Wird aus Layern zusammengesetzt: Körper → Socken/Beine → Schuhe → Shorts → Shirt → Weste
 * → Bart → Haare → Kopf-Ausrüstung → Hand-Ausrüstung.
 * Alles selbst gezeichnet.
 */
import type { Layer, Palette } from './Pixel';

export const AVATAR_W = 16;
export const AVATAR_H = 31;

const BODY = [
  '......OOOO......',
  '.....OSSSSO.....',
  '.....OSSSSO.....',
  '.....OESSEO.....',
  '.....OSSSSO.....',
  '.....OsMMsO.....',
  '......OSSO......',
  '......OssO......',
  '...OOOSSSSOOO...',
  '..OSSSSSSSSSSO..',
  '.OSSSSSSSSSSSSO.',
  '.OSOSSSSSSSSOSO.',
  '.OSOSSSSSSSSOSO.',
  '.OsOSSSSSSSSOsO.',
  '.OSOSSSSSSSSOSO.',
  '.OSOSSSSSSSSOSO.',
  '.OsOSSSSSSSSOsO.',
  '.OSOSSSSSSSSOSO.',
  '.OSOSSSSSSSSOSO.',
  '..O.OSSOOSSO.O..',
  '....OSSOOSSO....',
  '....OSSOOSSO....',
  '....OSsOOsSO....',
  '....OSSOOSSO....',
  '....OSSOOSSO....',
  '....OsSOOSsO....',
  '....OSSOOSSO....',
  '....OSSOOSSO....',
  '....OSSOOSSO....',
  '...OSSSOOSSSO...',
  '...OOOOOOOOOO...',
];

const SHIRT = [
  '', '', '', '', '', '', '', '',
  '......TRRT......',
  '...TTTTRRTTTT...',
  '..tTTTTRRTTTTt..',
  '..t.TTTRRTTT.t..',
  '....TTTRRTTT....',
  '....tTTRRTTt....',
  '....TTTRRTTT....',
  '....tTTRRTTt....',
  '....TTTRRTTT....',
];

const TANK = [
  '', '', '', '', '', '', '', '', '',
  '....TTTRRTTT....',
  '....TTTRRTTT....',
  '....tTTRRTTt....',
  '....TTTRRTTT....',
  '....tTTRRTTt....',
  '....TTTRRTTT....',
  '....tTTRRTTt....',
  '....TTTRRTTT....',
];

const SHORTS = [
  ...Array(17).fill(''),
  '....KKKKKKKK....',
  '....KKKKKKKK....',
  '....KKKkkKKK....',
  '.....KK..KK.....',
];

const SOCKS = [...Array(27).fill(''), '.....WW..WW.....', '.....ww..ww.....'];
const COMPRESSION = [...Array(22).fill(''), '.....WW..WW.....', '.....WW..WW.....', '.....WW..WW.....', '.....ww..ww.....', '.....WW..WW.....', '.....WW..WW.....', '.....ww..ww.....'];
const SHOES = [...Array(29).fill(''), '....BBB..BBB....', '...bbbb..bbbb...'];

const HAIR: Record<string, string[]> = {
  kurz: ['.....hHHHHh.....', '.....HHHHHH.....', '.....H....H.....'],
  buzz: ['......hhhh......', '.....h....h.....'],
  seitenscheitel: ['.....HHHHHh.....', '.....HHHHHH.....', '.....HHH..H.....'],
  mittel: ['.....HHHHHH.....', '....hHHHHHHh....', '....HH....HH....', '....H......H....', '....h......h....'],
  locken: ['....hHhHHhHh....', '....HhHHHHhH....', '....hH....Hh....', '....h......h....'],
  glatze: [],
};

const BEARD: Record<string, string[]> = {
  kein: [],
  stoppeln: ['', '', '', '', '.....x....x.....', '......x..x......', '......xxxx......'],
  kurz: ['', '', '', '', '.....H....H.....', '......H..H......', '......HHHH......'],
  voll: ['', '', '', '', '.....H....H.....', '.....HH..HH.....', '......HHHH......', '.......hh.......'],
};

const HEAD_GEAR: Record<string, { rows: string[]; palette: Palette }> = {
  'head-band': { rows: ['', '.....BBBBBB.....'], palette: { B: '#D9783A' } },
  'head-cap': { rows: ['.....CCCCCC.....', '....CCCCCCCC....', '....cccccccc....'], palette: { C: '#3A3544', c: '#D9783A' } },
  'head-lamp': { rows: ['', '.....LLYYLL.....'], palette: { L: '#2E2A33', Y: '#F2E3A0' } },
};

const VEST = ['', '', '', '', '', '', '', '', '', '....VV....VV....', '...VVV....VVV...', '....VFV..VFV....', '....VFV..VFV....', '....VV....VV....', '....VVVVVVVV....'];
const POLES = [...Array(13).fill(''), ...Array(18).fill('P..............P')].map((r, i) => (i === 16 || i === 17 ? 'G..............G' : r));
const CHALK = [...Array(17).fill(''), '..H..........H..', '..H..........H..'];
const WRAPS = [...Array(16).fill(''), '..X..........X..'];

export const SKIN_TONES: Record<string, { label: string; S: string; s: string; M: string }> = {
  hell: { label: 'Hell', S: '#E8C4A0', s: '#C99F7B', M: '#9E6B58' },
  mittel: { label: 'Mittel', S: '#D3A27A', s: '#B07F5A', M: '#8A5A44' },
  oliv: { label: 'Oliv', S: '#BF9268', s: '#9C724F', M: '#7A5038' },
  braun: { label: 'Braun', S: '#8D5B3D', s: '#6E4430', M: '#4E2E20' },
  dunkel: { label: 'Dunkel', S: '#5E3B28', s: '#45291C', M: '#2E1A12' },
};

export const HAIR_COLORS: Record<string, { label: string; H: string; h: string }> = {
  schwarz: { label: 'Schwarz', H: '#221D22', h: '#141114' },
  dunkelbraun: { label: 'Dunkelbraun', H: '#3E2C21', h: '#2A1D16' },
  braun: { label: 'Braun', H: '#6B4A32', h: '#523825' },
  dunkelblond: { label: 'Dunkelblond', H: '#9C7A4E', h: '#7D603C' },
  blond: { label: 'Blond', H: '#C9A86A', h: '#A88A52' },
  rot: { label: 'Rot', H: '#8E4B2A', h: '#6E3820' },
  grau: { label: 'Grau', H: '#9A9590', h: '#7A7570' },
};

export const HAIR_STYLES: Record<string, string> = {
  kurz: 'Kurz',
  buzz: 'Sehr kurz',
  seitenscheitel: 'Seitenscheitel',
  mittel: 'Mittellang',
  locken: 'Locken',
  glatze: 'Glatze',
};

export const BEARD_STYLES: Record<string, string> = {
  kein: 'Kein Bart',
  stoppeln: 'Stoppeln',
  kurz: 'Kurzer Bart',
  voll: 'Vollbart',
};

const OUTFITS: Record<string, Palette & { tank?: string }> = {
  'outfit-standard': { T: '#23315A', t: '#1A2546', R: '#D9783A' },
  'outfit-stein': { T: '#5A5763', t: '#46434E', R: '#8A8696' },
  'outfit-wald': { T: '#2F5A3E', t: '#234530', R: '#9BB07A' },
  'outfit-nacht': { T: '#1E1A26', t: '#15121B', R: '#7A5FA8' },
  'outfit-gipfel': { T: '#1F4A35', t: '#163828', R: '#E9A23B' },
  'outfit-tank': { T: '#3A3544', t: '#2C2834', R: '#D9783A', tank: '1' },
  'outfit-finisher': { T: '#B5602C', t: '#934C22', R: '#23315A' },
};

const SHOE_COLORS: Record<string, Palette> = {
  'shoes-trail': { B: '#D9783A', b: '#A3542A' },
  'shoes-grat': { B: '#2E2A33', b: '#E9A23B' },
  'shoes-titan': { B: '#6FA3C8', b: '#3E6E8F' },
};

export interface AvatarLook {
  hair: string;
  hairColor: string;
  beard: string;
  skin: string;
  equipped: Partial<Record<'head' | 'body' | 'hands' | 'outfit' | 'legs' | 'shoes', string | null>>;
  wounded?: boolean;
}

export function avatarLayers(look: AvatarLook): Layer[] {
  const skin = SKIN_TONES[look.skin] ?? SKIN_TONES.hell;
  const hair = HAIR_COLORS[look.hairColor] ?? HAIR_COLORS.dunkelbraun;
  const outfit = OUTFITS[look.equipped.outfit ?? 'outfit-standard'] ?? OUTFITS['outfit-standard'];
  const shoes = SHOE_COLORS[look.equipped.shoes ?? 'shoes-trail'] ?? SHOE_COLORS['shoes-trail'];
  const layers: Layer[] = [
    { rows: BODY, palette: { O: '#141118', S: skin.S, s: skin.s, M: skin.M, E: '#241E2A' } },
  ];
  if (look.equipped.legs === 'legs-compression') layers.push({ rows: COMPRESSION, palette: { W: '#3A3544', w: '#2C2834' } });
  else layers.push({ rows: SOCKS, palette: { W: '#E6E0D2', w: '#BDB6A6' } });
  layers.push({ rows: SHOES, palette: shoes });
  layers.push({ rows: SHORTS, palette: { K: '#15131A', k: '#2A2532' } });
  layers.push({ rows: outfit.tank ? TANK : SHIRT, palette: { T: outfit.T, t: outfit.t, R: outfit.R } });
  if (look.equipped.body === 'body-vest') layers.push({ rows: VEST, palette: { V: '#5B5468', F: '#9FC4D8' } });
  const beard = BEARD[look.beard] ?? [];
  if (beard.length) {
    layers.push({ rows: beard, palette: { H: hair.H, h: hair.h } });
    layers.push({ rows: beard, palette: { x: hair.H }, opacity: 0.5 });
  }
  const hairRows = HAIR[look.hair] ?? HAIR.kurz;
  if (hairRows.length && look.equipped.head !== 'head-cap') layers.push({ rows: hairRows, palette: { H: hair.H, h: hair.h } });
  if (look.equipped.head === 'head-cap' && (look.hair === 'mittel' || look.hair === 'locken')) {
    layers.push({ rows: hairRows.map((r, i) => (i < 2 ? '' : r)), palette: { H: hair.H, h: hair.h } });
  }
  const hg = look.equipped.head ? HEAD_GEAR[look.equipped.head] : undefined;
  if (hg) layers.push(hg);
  const hands = look.equipped.hands;
  if (hands === 'hands-chalk') layers.push({ rows: CHALK, palette: { H: '#F0EEE8' } });
  if (hands === 'hands-wraps') layers.push({ rows: WRAPS, palette: { X: '#E9A23B' } });
  if (hands === 'hands-poles') layers.push({ rows: POLES, palette: { P: '#B8B0A0', G: '#D9783A' } });
  if (look.wounded) {
    // Verband um den Kopf + Pflaster am Arm
    layers.push({ rows: ['', '', '.....WWWWWW.....', '', '', '', '', '', '', '', '', '', '', '.............W..'], palette: { W: '#ECE5D6' } });
    layers.push({ rows: ['', '', '.......R........'], palette: { R: '#C0504A' } });
  }
  return layers;
}
