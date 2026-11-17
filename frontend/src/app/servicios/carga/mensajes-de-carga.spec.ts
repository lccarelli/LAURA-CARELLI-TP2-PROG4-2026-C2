import { HttpParams } from '@angular/common/http';
import { MENSAJE_POR_DEFECTO, mensajeParaSolicitud } from './mensajes-de-carga';

const URL = 'http://api.test';
const sin = new HttpParams();

describe('mensajeParaSolicitud', () => {
  it.each([
    ['POST', '/auth/ingresar', 'carga.ingresando'],
    ['POST', '/auth/acceso-docente', 'carga.ingresando'],
    ['POST', '/auth/registro', 'carga.creando_cuenta'],
    ['POST', '/publicaciones', 'carga.publicando'],
    ['PUT', '/publicaciones/abc', 'carga.guardando_cambios'],
    ['DELETE', '/publicaciones/abc', 'carga.eliminando'],
    ['POST', '/publicaciones/abc/comentarios', 'carga.comentando'],
    ['PUT', '/publicaciones/abc/comentarios/def', 'carga.guardando_comentario'],
    ['POST', '/publicaciones/abc/compartir', 'carga.compartiendo'],
    ['PUT', '/usuarios/yo', 'carga.guardando_perfil'],
    ['POST', '/usuarios', 'carga.creando_usuario'],
    ['DELETE', '/usuarios/abc', 'carga.deshabilitando'],
    ['POST', '/usuarios/abc/habilitar', 'carga.habilitando'],
    ['POST', '/imagenes', 'carga.subiendo_imagen'],
    ['GET', '/estadisticas/resumen', 'carga.calculando'],
  ])('[O] %s %s dice «%s»', (metodo, ruta, clave) => {
    expect(mensajeParaSolicitud(metodo, `${URL}${ruta}`, sin).clave).toBe(clave);
  });

  it('[I] ingresar y registrarse avisan que el servidor puede tardar hasta un minuto en despertar', () => {
    for (const ruta of ['/auth/ingresar', '/auth/registro']) {
      expect(mensajeParaSolicitud('POST', `${URL}${ruta}`, sin)).toMatchObject({
        nota: 'carga.despertando',
        segundosHastaNota: 4,
      });
    }
  });

  it('[I] guardar una publicación avisa a los 6 segundos que está tardando más de lo normal', () => {
    expect(mensajeParaSolicitud('POST', `${URL}/publicaciones`, sin)).toMatchObject({
      nota: 'carga.tarda',
      segundosHastaNota: 6,
    });
  });

  it('[O] pedir una página siguiente (offset mayor a 0) dice «Trayendo más…»', () => {
    const params = new HttpParams().set('offset', 20);

    expect(mensajeParaSolicitud('GET', `${URL}/publicaciones`, params)).toMatchObject({
      clave: 'carga.trayendo_mas',
      nota: 'carga.tarda',
    });
  });

  it('[B] la primera página (offset 0) no dice «Trayendo más…»', () => {
    const params = new HttpParams().set('offset', 0);

    expect(mensajeParaSolicitud('GET', `${URL}/publicaciones`, params)).toEqual(
      MENSAJE_POR_DEFECTO,
    );
  });

  it('[O] una búsqueda dice «Buscando…»', () => {
    const params = new HttpParams().set('q', 'tarta');

    expect(mensajeParaSolicitud('GET', `${URL}/publicaciones`, params).clave).toBe(
      'carga.buscando',
    );
  });

  it('[S] la ruta se evalúa sin la consulta de la dirección', () => {
    expect(mensajeParaSolicitud('POST', `${URL}/publicaciones?x=1`, sin).clave).toBe(
      'carga.publicando',
    );
  });

  it('[Z] cualquier otra solicitud dice «Cargando…»', () => {
    expect(mensajeParaSolicitud('GET', `${URL}/publicaciones/abc`, sin)).toEqual(
      MENSAJE_POR_DEFECTO,
    );
  });
});
