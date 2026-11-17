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

describe('barra de arriba en el teléfono', () => {
  const regla = (selector: string) => {
    const inicio = hojaDeEstilos.indexOf(`\n  ${selector} {`);
    return hojaDeEstilos.slice(inicio, hojaDeEstilos.indexOf('}', inicio));
  };

  it('[O] la barra con el logo, el idioma y el tema se queda fija arriba, también sin sesión', () => {
    expect(regla('.barra')).toMatch(/\bsticky\b.*\btop-0\b/s);
  });

  it('[I] en el celular la barra con el buscador queda justo debajo de la barra fija, y en pantalla grande arriba de todo', () => {
    expect(regla('.barra-superior')).toContain('top-[4.25rem]');
    expect(regla('.barra-superior')).toContain('lg:top-0');
  });

  it('[S] la barra fija queda por encima de la del buscador', () => {
    const zDe = (selector: string) => Number(regla(selector).match(/\bz-(\d+)\b/)?.[1]);

    expect(zDe('.barra')).toBeGreaterThan(zDe('.barra-superior'));
  });
});

describe('menú de abajo del teléfono', () => {
  it('[I] muestra sólo íconos: la etiqueta de cada opción queda oculta (para lectores de pantalla) y como tooltip', () => {
    const inicio = hojaDeEstilos.indexOf('\n  .etiqueta-nav');
    const regla = hojaDeEstilos.slice(inicio, hojaDeEstilos.indexOf('}', inicio));

    expect(regla).toContain('sr-only');
    expect(hojaDeEstilos).not.toMatch(/\.item-nav \.etiqueta-nav[^{]*\{[^}]*not-sr-only/);
  });
});

describe('panel de notificaciones sobre las barras', () => {
  const regla = (selector: string) => {
    const inicio = hojaDeEstilos.indexOf(`\n  ${selector} {`);
    return hojaDeEstilos.slice(inicio, hojaDeEstilos.indexOf('}', inicio));
  };

  it('[I] con el panel abierto la barra que lo contiene queda por encima de la barra de arriba y del menú de abajo', () => {
    const zDe = (selector: string) => Number(regla(selector).match(/\bz-\[?(\d+)\]?/)?.[1]);

    expect(zDe('.barra-superior:has(.notificaciones-panel)')).toBeGreaterThan(zDe('.barra'));
    expect(zDe('.barra-superior:has(.notificaciones-panel)')).toBeGreaterThan(zDe('.barra-nav'));
  });

  it('[S] con el panel abierto la barra no lleva ninguna transformación: el panel es fijo y una transformación lo encerraría en la barra', () => {
    expect(regla('.barra-superior.oculta:not(:has(.notificaciones-panel))')).toContain(
      '-translate-y-full',
    );
    expect(regla('.barra-superior:has(.notificaciones-panel)')).not.toMatch(/translate|transform/);
  });
});

describe('selector de archivo invisible', () => {
  const reglaDe = (clase: string) => {
    const inicio = hojaDeEstilos.indexOf(`\n  .${clase} {`);
    return inicio === -1 ? '' : hojaDeEstilos.slice(inicio, hojaDeEstilos.indexOf('}', inicio));
  };

  const etiquetasConSelector = plantillas.flatMap(({ ruta, contenido }) =>
    [
      ...contenido.matchAll(
        /<label\b[^>]*class="([^"]*)"[^>]*>(?:(?!<\/label>)[\s\S])*?archivo-oculto/g,
      ),
    ].map(([, clases]) => ({ ruta, clases: clases.split(/\s+/) })),
  );

  it('[I] el selector es absoluto y ocupa todo el contenedor posicionado más cercano', () => {
    expect(reglaDe('archivo-oculto')).toContain('absolute');
    expect(reglaDe('archivo-oculto')).toContain('inset-0');
  });

  it('[O] hay etiquetas con selector invisible en la aplicación', () => {
    expect(etiquetasConSelector.length).toBeGreaterThanOrEqual(4);
  });

  it.each(
    etiquetasConSelector.map(({ ruta, clases }) => [ruta, clases.join(' '), clases] as const),
  )(
    '[S] en %s la etiqueta «%s» es el contenedor posicionado: si no, el selector tapa toda la pantalla y reabre el explorador de archivos al tocar Guardar o Cancelar',
    (_ruta, _nombre, clases) => {
      const posicionada = clases.some(
        (clase: string) => clase === 'relative' || /\brelative\b/.test(reglaDe(clase)),
      );

      expect(posicionada).toBe(true);
    },
  );
});

describe('indicador de espera', () => {
  const regla = (selector: string) => {
    const inicio = hojaDeEstilos.indexOf(`\n  ${selector} {`);
    return hojaDeEstilos.slice(inicio, hojaDeEstilos.indexOf('}', inicio));
  };

  it('[I] ocupa toda la pantalla y se centra, esté donde esté la persona en la página', () => {
    const capa = regla('.cargando-global');

    expect(capa).toContain('fixed');
    expect(capa).toContain('inset-0');
    expect(capa).toContain('items-center');
    expect(capa).toContain('justify-center');
  });

  it('[I] queda por encima de todo: barras, menú, panel de notificaciones y ventanas', () => {
    const zDe = (selector: string) => Number(regla(selector).match(/\bz-\[?(\d+)\]?/)?.[1]);

    for (const otro of ['.barra', '.barra-nav', '.notificaciones-panel', '.fondo-modal']) {
      expect(zDe('.cargando-global'), otro).toBeGreaterThan(zDe(otro));
    }
    expect(zDe('.pantalla-carga')).toBeGreaterThan(zDe('.fondo-modal'));
  });

  it('[S] el logo se queda quieto si la persona pidió menos movimiento', () => {
    const inicio = hojaDeEstilos.indexOf('@media (prefers-reduced-motion: reduce)');
    const bloque = hojaDeEstilos.slice(inicio, hojaDeEstilos.indexOf('}\n  }', inicio));

    expect(bloque).toContain('.bq-spoon');
    expect(bloque).toContain('.bq-dot');
    expect(bloque).toContain('.bq-ring');
    expect(bloque).toContain('animation: none');
  });

  it('[I] los colores del logo salen de la paleta, no de valores sueltos', () => {
    for (const clase of ['.logo-cargando-fondo', '.logo-cargando-letra', '.logo-cargando-aro']) {
      expect(hojaDeEstilos.slice(hojaDeEstilos.indexOf(clase))).toMatch(/var\(--color-/);
    }
  });
});

describe('ventana de compartir', () => {
  const regla = (selector: string) => {
    const inicio = hojaDeEstilos.indexOf(`\n  ${selector} {`);
    return hojaDeEstilos.slice(inicio, hojaDeEstilos.indexOf('}', inicio));
  };
  const fondoDeLaVentana = regla('.modal').match(/\bbg-([\w-]+)/)![1];

  it.each(['.buscador-personas-caja', '.personas'])(
    '[I] %s se distingue del fondo de la ventana: tiene borde y otro color de fondo',
    (selector) => {
      const estilo = regla(selector);

      expect(estilo).toMatch(/\bborder-2\b/);
      expect(estilo).toMatch(/\bborder-linea-fuerte\b/);
      expect(estilo).not.toContain(`bg-${fondoDeLaVentana} `);
    },
  );

  it('[I] las personas elegidas llevan borde y un fondo propio, no el de la ventana', () => {
    const estilo = regla('.destinatario');

    expect(estilo).toContain('border-barra');
    expect(estilo).toContain('bg-secundario');
  });
});

describe('íconos de la tarjeta resumida', () => {
  const regla = (selector: string) => {
    const inicio = hojaDeEstilos.indexOf(`\n  ${selector} {`);
    return hojaDeEstilos.slice(inicio, hojaDeEstilos.indexOf('}', inicio));
  };

  it('[I] los íconos van pegados: separación mínima entre botones, no repartidos por el ancho', () => {
    const acciones = regla('.pin-acciones');

    expect(acciones).toMatch(/\bgap-0\.5\b/);
    expect(acciones).not.toMatch(/justify-(between|around|evenly)/);
  });

  it('[I] el corazón y el contador de comentarios van juntos a la derecha, separados de guardar y compartir', () => {
    expect(hojaDeEstilos).toMatch(/\.pin-acciones \.pin-derecha,[^{]*\{[^}]*ml-auto/);
    expect(regla('.pin-acciones .metrica-comentarios')).not.toContain('ml-auto');
    expect(hojaDeEstilos).toMatch(/\.metricas-detalle \.pin-derecha\s*\{[^}]*ml-auto/);
  });

  it('[I] ningún botón de la fila se empuja hacia el borde (ml-auto)', () => {
    expect(regla('.boton-metrica')).not.toContain('ml-auto');
    expect(hojaDeEstilos).not.toContain('.boton-eliminar');
  });
});
