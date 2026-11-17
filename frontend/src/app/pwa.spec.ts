import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const RAIZ = process.cwd();
const leer = (ruta: string) => readFileSync(join(RAIZ, ruta), 'utf-8');

const manifiesto = JSON.parse(leer('public/manifest.webmanifest'));
const configuracion = JSON.parse(leer('ngsw-config.json'));
const hojaDeEstilos = leer('src/styles.css');
const portada = leer('src/index.html');

function colorDelTema(selector: string, variable: string) {
  const inicio = hojaDeEstilos.indexOf(`${selector} {`);
  const bloque = hojaDeEstilos.slice(inicio, hojaDeEstilos.indexOf('}', inicio));
  return bloque.match(new RegExp(`--tema-${variable}:\\s*(#[0-9a-fA-F]{6})`))?.[1];
}

describe('aplicación instalable', () => {
  it('[O] el manifiesto tiene el nombre, el modo de pantalla y el alcance de una aplicación', () => {
    expect(manifiesto.name).toContain('Banquete');
    expect(manifiesto.short_name).toBe('Banquete');
    expect(manifiesto.display).toBe('standalone');
    expect(manifiesto.scope).toBe('/');
    expect(manifiesto.start_url.startsWith('/')).toBe(true);
    expect(manifiesto.lang).toBe('es');
  });

  it('[I] los colores del manifiesto son los del tema claro', () => {
    expect(manifiesto.theme_color).toBe(colorDelTema(':root', 'barra'));
    expect(manifiesto.background_color).toBe(colorDelTema(':root', 'papel'));
  });

  it('[I] la barra del navegador toma el color de la barra, sin variante oscura', () => {
    expect(portada).toContain(
      `<meta name="theme-color" content="${colorDelTema(':root', 'barra')}" />`,
    );
    expect(portada).not.toContain('prefers-color-scheme: dark');
    expect(portada).toContain('<meta name="color-scheme" content="light" />');
  });

  it('[O] tiene los íconos de 192 y 512 píxeles y uno enmascarable, y todos existen', () => {
    const iconos = manifiesto.icons as { src: string; sizes: string; purpose: string }[];

    expect(
      iconos.map((icono) => `${icono.sizes} ${icono.purpose}`).sort((a, b) => a.localeCompare(b)),
    ).toEqual(['192x192 any', '512x512 any', '512x512 maskable']);
    for (const icono of iconos) {
      expect(existsSync(join(RAIZ, 'public', icono.src)), icono.src).toBe(true);
    }
  });

  it('[I] la página enlaza el manifiesto y el ícono para iPhone, y ese ícono existe', () => {
    expect(portada).toContain('rel="manifest" href="manifest.webmanifest"');
    expect(portada).toContain('rel="apple-touch-icon" href="icons/apple-touch-icon.png"');
    expect(existsSync(join(RAIZ, 'public/icons/apple-touch-icon.png'))).toBe(true);
  });

  it('[I] la pestaña y la barra usan un solo ícono, el principal, y existe', () => {
    expect(portada).toContain('rel="icon" type="image/png" href="favicon.png"');
    expect(portada).not.toContain('favicon-oscuro');
    expect(existsSync(join(RAIZ, 'public/favicon.png'))).toBe(true);
    expect(existsSync(join(RAIZ, 'public/favicon-oscuro.png'))).toBe(false);
  });

  it('[S] los atajos del manifiesto llevan a una dirección de la aplicación', () => {
    for (const atajo of manifiesto.shortcuts as { url: string }[]) {
      expect(atajo.url.startsWith('/')).toBe(true);
    }
  });

  it('[S] el service worker guarda la aplicación pero no las respuestas de la API', () => {
    expect(configuracion.dataGroups).toBeUndefined();
    expect(configuracion.assetGroups.map((grupo: { name: string }) => grupo.name)).toEqual([
      'app',
      'assets',
    ]);
  });

  it('[I] el service worker precarga las traducciones, así la pantalla sin conexión se ve en el idioma elegido', () => {
    expect(configuracion.assetGroups[0].resources.files).toContain('/i18n/*.json');
  });

  it('[I] sólo se registra en producción', () => {
    expect(leer('src/app/app.config.ts')).toContain('enabled: !isDevMode()');
  });
});
