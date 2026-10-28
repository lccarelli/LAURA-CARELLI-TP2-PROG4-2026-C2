import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const RAIZ = process.cwd();

function archivos(carpeta: string, extension: string): string[] {
  return readdirSync(carpeta, { withFileTypes: true }).flatMap((entrada) => {
    const ruta = join(carpeta, entrada.name);
    if (entrada.isDirectory()) {
      return archivos(ruta, extension);
    }
    return ruta.endsWith(extension) && !ruta.endsWith('.spec.ts') ? [ruta] : [];
  });
}

const plantillas = archivos(join(RAIZ, 'src/app'), '.html').map((ruta) => ({
  ruta,
  contenido: readFileSync(ruta, 'utf-8'),
}));

const codigo = archivos(join(RAIZ, 'src/app'), '.ts').map((ruta) => ({
  ruta,
  contenido: readFileSync(ruta, 'utf-8'),
}));

const hojaDeEstilos = readFileSync(join(RAIZ, 'src/styles.css'), 'utf-8');

const clasesDefinidas = new Set(
  [...hojaDeEstilos.matchAll(/\.([a-z][a-z0-9-]*)/g)].map((coincidencia) => coincidencia[1]),
);

const clasesDeLasPlantillas = plantillas.flatMap(({ ruta, contenido }) =>
  [...contenido.matchAll(/\sclass="([^"]*)"/g)].flatMap((coincidencia) =>
    coincidencia[1]
      .split(/\s+/)
      .filter(Boolean)
      .map((clase) => ({ ruta, clase })),
  ),
);

const DISPOSICION =
  /^-?(flex|grid|inline-flex|block|inline|inline-block|hidden|relative|absolute|fixed|sticky|grow|shrink|shrink-0|flex-(1|col|row|wrap|none)|items-[\w-]+|justify-[\w-]+|self-[\w-]+|place-[\w-]+|gap(-[xy])?-[\d.]+|(w|h|min-w|min-h|max-w|max-h|size)-[\w./%-]+|[mp][xytblr]?-[\d.]+|m[xylr]-auto|aspect-[\w-]+|object-[\w-]+|overflow-[\w-]+|whitespace-[\w-]+|break-[\w-]+|text-(center|left|right)|col-span-\d+|order-[\w-]+|z-\d+|truncate)$/;

const PALETA_CRUDA =
  /\b(text|bg|border|ring|from|to|via|fill|stroke|divide|outline|shadow|decoration|accent|caret)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black)\b/;

const ESTILO_VISUAL_SUELTO =
  /^(shadow|rounded|ring|divide|tracking|uppercase|lowercase|italic|backdrop|leading|font|border|text-(xs|sm|base|lg|xl|[2-9]xl))(-.*)?$/;

describe('reglas de estilo', () => {
  it('[Z] encuentra las plantillas, el código y las clases para revisar', () => {
    expect(plantillas.length).toBeGreaterThan(0);
    expect(codigo.length).toBeGreaterThan(0);
    expect(clasesDeLasPlantillas.length).toBeGreaterThan(0);
    expect(clasesDefinidas.size).toBeGreaterThan(0);
  });

  it('[I] las plantillas y el código no escriben colores literales', () => {
    for (const { ruta, contenido } of [...plantillas, ...codigo]) {
      expect(
        contenido.match(/(?<!&)#[0-9a-fA-F]{3,8}\b|\b(rgb|rgba|hsl|hsla|oklch)\(/g),
        ruta,
      ).toBeNull();
    }
  });

  it('[I] las plantillas no usan colores de la paleta de Tailwind', () => {
    for (const { ruta, clase } of clasesDeLasPlantillas) {
      expect(PALETA_CRUDA.test(clase), `${ruta}: ${clase}`).toBe(false);
    }
  });

  it('[I] las plantillas no escriben estilo visual suelto: va en una clase del sistema', () => {
    for (const { ruta, clase } of clasesDeLasPlantillas) {
      const sinPrefijo = clase.replace(/^(sm|md|lg|xl):/, '');
      expect(ESTILO_VISUAL_SUELTO.test(sinPrefijo), `${ruta}: ${clase}`).toBe(false);
    }
  });

  it('[I] cada clase de una plantilla es de disposición o está definida en styles.css', () => {
    for (const { ruta, clase } of clasesDeLasPlantillas) {
      const sinPrefijo = clase.replace(/^(sm|md|lg|xl):/, '');
      const conocida = DISPOSICION.test(sinPrefijo) || clasesDefinidas.has(sinPrefijo);
      expect(conocida, `${ruta}: ${clase}`).toBe(true);
    }
  });

  it('[E] una clase mal escrita sería detectada', () => {
    const clase = 'boton-princpal';

    expect(DISPOSICION.test(clase) || clasesDefinidas.has(clase)).toBe(false);
  });
});
