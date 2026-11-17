import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const css = readFileSync(join(process.cwd(), 'src/styles.css'), 'utf-8');

function bloque(selector: string) {
  const inicio = css.indexOf(`${selector} {`);
  return css.slice(inicio, css.indexOf('}', inicio));
}

function colores(texto: string): Record<string, string> {
  return Object.fromEntries(
    [...texto.matchAll(/--tema-([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [m[1], m[2]]),
  );
}

function luminancia(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const f = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contraste(a: string, b: string) {
  const [claro, oscuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (claro + 0.05) / (oscuro + 0.05);
}

const PARES_SOBRE_HOJA: [string, string, number][] = [
  ['tinta', 'hoja', 7],
  ['suave', 'hoja', 4.5],
  ['sobre-primario', 'primario', 4.5],
  ['sobre-primario', 'primario-fuerte', 4.5],
  ['enlace', 'hoja', 4.5],
  ['acento-tinta', 'acento', 4.5],
  ['secundario-tinta', 'secundario', 4.5],
  ['error', 'hoja', 4.5],
  ['primario-borde', 'hoja', 3],
  ['linea-fuerte', 'hoja', 3],
  ['barra-tinta', 'barra', 7],
  ['barra', 'hoja', 3],
];

const PARES_SOBRE_PAPEL: Record<string, [string, string, number][]> = {
  claro: [
    ['tinta', 'papel', 7],
    ['suave', 'papel', 4.5],
    ['enlace', 'papel', 4.5],
    ['error', 'papel', 4.5],
    ['primario-borde', 'papel', 3],
  ],
};

describe('paleta', () => {
  const paleta = colores(bloque(':root'));
  const pares = [...PARES_SOBRE_HOJA, ...PARES_SOBRE_PAPEL['claro']];

  it('[Z] define todos los colores', () => {
    for (const [a, b] of pares) {
      expect(paleta[a], a).toBeTruthy();
      expect(paleta[b], b).toBeTruthy();
    }
  });

  it.each(pares)('[B] %s sobre %s tiene un contraste de al menos %s', (a, b, minimo) => {
    expect(contraste(paleta[a], paleta[b])).toBeGreaterThanOrEqual(minimo);
  });
});

describe('un solo modo', () => {
  it('[I] no hay una paleta oscura: la aplicación es sólo clara', () => {
    expect(css).not.toContain("data-tema='oscuro'");
    expect(css).not.toContain('prefers-color-scheme: dark');
    expect(css).not.toContain('color-scheme: dark');
  });
});
