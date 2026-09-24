// WCAG contrast maths shared by the palette guards, so the formula exists once.
// Test-only: never import it from app code.

export type Rgba = { r: number; g: number; b: number; a: number };

/** `rgb(107 90 82 / 0.7)` or `#faf5f1` -> channels. */
export function parseColour(value: string): Rgba {
  const fn =
    /rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*\/\s*([\d.]+))?\s*\)/.exec(
      value,
    );
  if (fn) {
    return {
      r: Number(fn[1]),
      g: Number(fn[2]),
      b: Number(fn[3]),
      a: fn[4] === undefined ? 1 : Number(fn[4]),
    };
  }
  const hex = /#([0-9a-f]{6})/i.exec(value);
  if (!hex) throw new Error(`unparseable colour: ${value}`);
  const n = parseInt(hex[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 };
}

export function srgbToLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function luminance({ r, g, b }: Omit<Rgba, "a">): number {
  return (
    0.2126 * srgbToLinear(r) +
    0.7152 * srgbToLinear(g) +
    0.0722 * srgbToLinear(b)
  );
}

/** Composite a translucent foreground over an opaque background. */
export function flatten(fg: Rgba, bg: Rgba): Omit<Rgba, "a"> {
  return {
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
  };
}

export function contrast(fg: Rgba, bg: Rgba): number {
  const [hi, lo] = [luminance(flatten(fg, bg)), luminance(bg)].sort(
    (a, b) => b - a,
  );
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Custom properties per scheme: light is the last declaration before the dark
 * block, dark is the last anywhere, so a token without an override reads in both.
 */
export function schemeTokens(css: string): {
  light: (name: string) => Rgba;
  dark: (name: string) => Rgba;
} {
  const darkBlockStart = css.indexOf("@media (prefers-color-scheme: dark)");

  const before = (name: string, endIndex: number): Rgba => {
    const re = new RegExp(`${name}:\\s*([^;]+);`, "g");
    let last: string | undefined;
    for (const m of css.matchAll(re)) {
      if (m.index !== undefined && m.index < endIndex) last = m[1];
    }
    if (!last) throw new Error(`token not found: ${name}`);
    return parseColour(last.trim());
  };

  return {
    light: (name) => before(name, darkBlockStart),
    dark: (name) => before(name, css.length),
  };
}

/** True when two colours are the same paint, ignoring hex case. */
export function sameColour(a: Rgba, b: Rgba): boolean {
  return a.r === b.r && a.g === b.g && a.b === b.b && a.a === b.a;
}
