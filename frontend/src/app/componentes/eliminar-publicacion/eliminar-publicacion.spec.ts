import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { proveerIdiomaDePrueba } from '../../../testing/idioma';
import { EliminarPublicacion } from './eliminar-publicacion';

const URL = `${environment.API_URL}/publicaciones/p1`;

@Component({
  imports: [EliminarPublicacion],
  template: `<app-eliminar-publicacion
    publicacionId="p1"
    (publicacionEliminada)="eliminadas = eliminadas + 1"
    (publicacionFallada)="fallos($event)"
  />`,
})
class Anfitrion {
  eliminadas = 0;
  fallos = vi.fn();
}

describe('EliminarPublicacion', () => {
  let http: HttpTestingController;

  async function crear(idioma = 'es') {
    await TestBed.configureTestingModule({
      imports: [Anfitrion],
      providers: [proveerIdiomaDePrueba(idioma), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(Anfitrion);
    await fixture.whenStable();
    return fixture;
  }

  type Pantalla = Awaited<ReturnType<typeof crear>>;

  const botones = (fixture: Pantalla) =>
    Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>);
  const actualizar = async (fixture: Pantalla) => {
    fixture.detectChanges();
    await fixture.whenStable();
  };
  const confirmar = async (fixture: Pantalla) => {
    botones(fixture)[0].click();
    await actualizar(fixture);
  };

  it('[Z] al principio sólo ofrece eliminar la publicación, sin pedir nada', async () => {
    const fixture = await crear();

    expect(botones(fixture)).toHaveLength(1);
    expect(botones(fixture)[0].textContent).toContain('Eliminar publicación');
    http.expectNone(URL);
  });

  it('[O] pide confirmación antes de eliminar y todavía no manda nada', async () => {
    const fixture = await crear();

    await confirmar(fixture);

    expect(fixture.nativeElement.textContent).toContain('¿Eliminar?');
    expect(fixture.nativeElement.textContent).toContain('No se puede deshacer');
    expect(botones(fixture).map((boton) => boton.textContent?.trim())).toEqual(['Sí', 'No']);
    http.expectNone(URL);
  });

  it('[O] cancelar vuelve al botón sin pedir nada', async () => {
    const fixture = await crear();
    await confirmar(fixture);

    botones(fixture)[1].click();
    await actualizar(fixture);

    expect(botones(fixture)).toHaveLength(1);
    expect(botones(fixture)[0].textContent).toContain('Eliminar publicación');
    http.expectNone(URL);
  });

  it('[O] confirmar pide DELETE, se bloquea mientras espera y avisa que se eliminó', async () => {
    const fixture = await crear();
    await confirmar(fixture);

    botones(fixture)[0].click();
    await actualizar(fixture);
    const pedido = http.expectOne({ method: 'DELETE', url: URL });

    expect(botones(fixture).every((boton) => boton.disabled)).toBe(true);
    pedido.flush(null, { status: 204, statusText: 'No Content' });
    await actualizar(fixture);
    expect(fixture.componentInstance.eliminadas).toBe(1);
  });

  it('[B] un segundo clic mientras espera no manda otro pedido', async () => {
    const fixture = await crear();
    await confirmar(fixture);

    botones(fixture)[0].click();
    botones(fixture)[0].click();

    expect(http.match({ method: 'DELETE', url: URL })).toHaveLength(1);
  });

  it('[E] si el servidor no deja eliminarla, avisa con la clave del motivo y vuelve al botón', async () => {
    const fixture = await crear();
    await confirmar(fixture);

    botones(fixture)[0].click();
    http
      .expectOne({ method: 'DELETE', url: URL })
      .flush({ codigo: 'PUBLICACION_AJENA' }, { status: 403, statusText: 'Forbidden' });
    await actualizar(fixture);

    expect(fixture.componentInstance.fallos).toHaveBeenLastCalledWith('api.PUBLICACION_AJENA');
    expect(fixture.componentInstance.eliminadas).toBe(0);
    expect(botones(fixture)).toHaveLength(1);
  });

  it('[E] un corte de red avisa y deja volver a intentar', async () => {
    const fixture = await crear();
    await confirmar(fixture);

    botones(fixture)[0].click();
    http.expectOne({ method: 'DELETE', url: URL }).error(new ProgressEvent('error'));
    await actualizar(fixture);

    expect(fixture.componentInstance.fallos).toHaveBeenLastCalledWith(expect.any(String));
    expect(botones(fixture)).toHaveLength(1);
  });

  it('[S] al empezar a confirmar limpia el aviso de un intento anterior', async () => {
    const fixture = await crear();

    await confirmar(fixture);

    expect(fixture.componentInstance.fallos).toHaveBeenLastCalledWith(null);
  });

  it('[I] se muestra en inglés', async () => {
    const fixture = await crear('en');

    expect(botones(fixture)[0].textContent).toContain('Delete post');
  });
});
