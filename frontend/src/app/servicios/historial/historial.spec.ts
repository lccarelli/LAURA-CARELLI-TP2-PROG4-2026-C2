import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Historial } from './historial';

describe('Historial', () => {
  let historial: Historial;
  let router: Router;

  const ir = (url: string) => router.navigateByUrl(url);

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: '**', children: [] }])],
    });
    historial = TestBed.inject(Historial);
    router = TestBed.inject(Router);
    historial.iniciar();
  });

  it('[Z] sin ninguna navegación anterior no se puede volver', () => {
    expect(historial.puedeVolver()).toBe(false);
  });

  it('[Z] en la primera pantalla de la sesión no hay a dónde volver', async () => {
    await ir('/publicaciones/abc');

    expect(historial.puedeVolver()).toBe(false);
  });

  it('[O] después de pasar de una pantalla a otra, se puede volver', async () => {
    await ir('/publicaciones');
    await ir('/publicaciones/abc');

    expect(historial.puedeVolver()).toBe(true);
  });

  it.each(['/publicaciones/nueva', '/publicaciones/abc/editar', '/login', '/registro'])(
    '[E] si venía de %s no vuelve (sería volver a un formulario)',
    async (anterior) => {
      await ir(anterior);
      await ir('/publicaciones/abc');

      expect(historial.puedeVolver()).toBe(false);
    },
  );

  it('[B] una pantalla con un nombre parecido a nueva o editar sí se puede volver', async () => {
    await ir('/perfil/guardadas');
    await ir('/publicaciones/abc');

    expect(historial.puedeVolver()).toBe(true);
  });

  describe('posición de las listas', () => {
    const POSICION = { y: 840, cantidad: 30 };

    it('[S] al abrir otra pantalla guarda dónde estaba la lista, y al volver con atrás la devuelve', async () => {
      await ir('/publicaciones');
      historial.registrar('/publicaciones', () => POSICION);

      await ir('/publicaciones/abc');
      (historial as unknown as { volviendo: boolean }).volviendo = true;

      expect(historial.restaurar('/publicaciones')).toEqual(POSICION);
    });

    it('[S] si se llega a la lista de otro modo (no con atrás) no se restaura nada', async () => {
      await ir('/publicaciones');
      historial.registrar('/publicaciones', () => POSICION);

      await ir('/publicaciones/abc');
      await ir('/publicaciones');

      expect(historial.restaurar('/publicaciones')).toBeUndefined();
    });

    it('[S] la posición se usa una sola vez', async () => {
      await ir('/publicaciones');
      historial.registrar('/publicaciones', () => POSICION);
      await ir('/publicaciones/abc');
      (historial as unknown as { volviendo: boolean }).volviendo = true;

      historial.restaurar('/publicaciones');

      expect(historial.restaurar('/publicaciones')).toBeUndefined();
    });

    it('[S] una lista que ya no existe (dada de baja) no guarda su posición', async () => {
      await ir('/publicaciones');
      const baja = historial.registrar('/publicaciones', () => POSICION);

      baja();
      await ir('/publicaciones/abc');
      (historial as unknown as { volviendo: boolean }).volviendo = true;

      expect(historial.restaurar('/publicaciones')).toBeUndefined();
    });

    it('[I] cada lista recuerda lo suyo, por dirección', async () => {
      await ir('/perfil');
      historial.registrar('/perfil?solapa=compartidos', () => ({ y: 5, cantidad: 2 }));
      historial.registrar('/publicaciones', () => POSICION);

      await ir('/publicaciones/abc');
      (historial as unknown as { volviendo: boolean }).volviendo = true;

      expect(historial.restaurar('/perfil?solapa=compartidos')).toEqual({ y: 5, cantidad: 2 });
    });
  });
});
