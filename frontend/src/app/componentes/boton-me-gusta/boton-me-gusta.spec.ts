import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { proveerIdiomaDePrueba } from '../../../testing/idioma';
import { BotonMeGusta } from './boton-me-gusta';

const URL = `${environment.API_URL}/publicaciones/p1/megusta`;

@Component({
  imports: [BotonMeGusta],
  template: `<app-boton-me-gusta
    publicacionId="p1"
    [meGustaDado]="meGustaDado"
    [cantidadMeGusta]="3"
    (fallo)="fallos($event)"
  />`,
})
class Anfitrion {
  meGustaDado = false;
  fallos = vi.fn();
}

describe('BotonMeGusta', () => {
  let http: HttpTestingController;

  async function crear(meGustaDado = false) {
    await TestBed.configureTestingModule({
      imports: [Anfitrion],
      providers: [proveerIdiomaDePrueba(), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(Anfitrion);
    fixture.componentInstance.meGustaDado = meGustaDado;
    await fixture.whenStable();
    return fixture;
  }

  const boton = (fixture: Awaited<ReturnType<typeof crear>>) =>
    fixture.nativeElement.querySelector('button') as HTMLButtonElement;
  const actualizar = async (fixture: Awaited<ReturnType<typeof crear>>) => {
    fixture.detectChanges();
    await fixture.whenStable();
  };

  it('[Z] sin haberlo dado ofrece dar me gusta con la cantidad', async () => {
    const fixture = await crear();

    expect(boton(fixture).getAttribute('aria-label')).toBe('Dar me gusta (3)');
    expect(boton(fixture).getAttribute('aria-pressed')).toBe('false');
  });

  it('[O] dar me gusta pide POST y sube la cantidad con lo que dice el servidor', async () => {
    const fixture = await crear();

    boton(fixture).click();
    http.expectOne({ method: 'POST', url: URL }).flush({ meGusta: true, cantidadMeGusta: 9 });
    await actualizar(fixture);

    expect(boton(fixture).getAttribute('aria-label')).toBe('Quitar me gusta (9)');
  });

  it('[O] quitar me gusta pide DELETE y resta uno', async () => {
    const fixture = await crear(true);

    boton(fixture).click();
    http.expectOne({ method: 'DELETE', url: URL }).flush(null, { status: 204, statusText: 'No' });
    await actualizar(fixture);

    expect(boton(fixture).getAttribute('aria-label')).toBe('Dar me gusta (2)');
  });

  it('[S] mientras espera la respuesta el botón está bloqueado', async () => {
    const fixture = await crear();

    boton(fixture).click();
    await actualizar(fixture);

    expect(boton(fixture).disabled).toBe(true);
    http.expectOne({ method: 'POST', url: URL }).flush({ meGusta: true, cantidadMeGusta: 4 });
  });

  it('[E] un me gusta repetido deja la marca sin mostrar error', async () => {
    const fixture = await crear();

    boton(fixture).click();
    http
      .expectOne({ method: 'POST', url: URL })
      .flush({ codigo: 'ME_GUSTA_REPETIDO' }, { status: 409, statusText: 'Conflict' });
    await actualizar(fixture);

    expect(boton(fixture).getAttribute('aria-pressed')).toBe('true');
    expect(fixture.componentInstance.fallos.mock.calls).toEqual([[null]]);
  });

  it('[E] otro error avisa con la clave del mensaje y no cambia nada', async () => {
    const fixture = await crear();

    boton(fixture).click();
    http
      .expectOne({ method: 'POST', url: URL })
      .flush({ codigo: 'TOKEN_INVALIDO' }, { status: 401, statusText: 'Unauthorized' });
    await actualizar(fixture);

    expect(fixture.componentInstance.fallos.mock.calls).toEqual([[null], ['api.TOKEN_INVALIDO']]);
    expect(boton(fixture).getAttribute('aria-label')).toBe('Dar me gusta (3)');
  });
});
