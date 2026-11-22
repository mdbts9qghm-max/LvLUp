/** Rendert Pixel-Raster (Strings) als SVG mit harten Kanten. '.' = transparent. */
import { memo } from 'react';

export type Palette = Record<string, string>;
export interface Layer {
  rows: string[];
  palette: Palette;
  opacity?: number;
}

export function layerRects(layer: Layer, width: number, keyPrefix: string) {
  const out: JSX.Element[] = [];
  layer.rows.forEach((row, y) => {
    let x = 0;
    while (x < width) {
      const ch = row[x] ?? '.';
      if (ch === '.' || ch === ' ' || !layer.palette[ch]) {
        x++;
        continue;
      }
      let w = 1;
      while (x + w < width && row[x + w] === ch) w++;
      out.push(<rect key={`${keyPrefix}-${y}-${x}`} x={x} y={y} width={w} height={1} fill={layer.palette[ch]} opacity={layer.opacity} />);
      x += w;
    }
  });
  return out;
}

interface Props {
  layers: Layer[];
  width: number;
  height: number;
  scale?: number;
  className?: string;
  title?: string;
  style?: React.CSSProperties;
}

export const PixelSprite = memo(function PixelSprite({ layers, width, height, scale = 4, className, title, style }: Props) {
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width * scale}
      height={height * scale}
      shapeRendering="crispEdges"
      className={className}
      style={{ imageRendering: 'pixelated', ...style }}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {layers.map((l, i) => layerRects(l, width, `l${i}`))}
    </svg>
  );
});
