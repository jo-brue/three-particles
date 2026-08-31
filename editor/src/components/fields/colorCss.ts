export function parseColorAlpha(css: string): { hex: string; alpha: number } {
  const rgbaMatch = css.match(/rgba?\(([^)]+)\)/i);
  if (rgbaMatch) {
    const parts = rgbaMatch[1].split(',').map((s) => parseFloat(s.trim()));
    const [r, g, b, a = 1] = parts;
    return { hex: rgbToHex(r, g, b), alpha: a };
  }
  if (css.startsWith('#') && css.length === 9) {
    const a = parseInt(css.slice(7, 9), 16) / 255;
    return { hex: css.slice(0, 7), alpha: a };
  }
  if (css.startsWith('#') && css.length === 7) {
    return { hex: css, alpha: 1 };
  }
  return { hex: '#ffffff', alpha: 1 };
}

function rgbToHex(r: number, g: number, b: number): string {
  const h = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

export function toRgbaCss(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16) || 0;
  const g = parseInt(hex.slice(3, 5), 16) || 0;
  const b = parseInt(hex.slice(5, 7), 16) || 0;
  return `rgba(${r},${g},${b},${alpha})`;
}
