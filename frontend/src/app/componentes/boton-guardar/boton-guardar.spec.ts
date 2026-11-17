import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { proveerIdiomaDePrueba } from '../../../testing/idioma';
import { BotonGuardar } from './boton-guardar';

const RUTA = `${environment.API_URL}/publicaciones/p1/guardar`;

@Component({
  imports: [BotonGuardar],
  template: `<app-boton-guardar
    publicacionId="p1"
    [guardada]="guardada"
    (fallo)="fallos($event)"
    (cambio)="cambios($event)"
  />`,
})
class Anfitrion {
  guardada = false;
  fallos = vi.fn();
  cambios = vi.fn();
}

describe('BotonGuardar', () => {
  let http: HttpTestingController;

  async function crear(guardada = false) {
    await TestBed.configureTestingModule({
      imports: [Anfitrion],
      providers: [proveerIdiomaDePrueba(), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(Anfitrion);
    fixture.componentInstance.guardada = guardada;
    await fixture.whenStable();
    return fixture;
  }

  const boton = (fixture: Awaited<ReturnType<typeof crear>>) =>
    fixture.nativeElement.querySelector('button') as HTMLButtonElement;
  const actualizar = async (fixture: Awaited<ReturnType<typeof crear>>) => {
    fixture.detectChanges();
    await fixture.whenStable();
  };

  it('[Z] sin guardar ofrece guardar y no está presionado', async () => {
    const fixture = await crear();

    expect(boton(fixture).getAttribute('aria-label')).toBe('Guardar');
    expect(boton(fixture).getAttribute('aria-pressed')).toBe('false');
  });

  it('[I] ya guardada ofrece quitarla y está presionado', async () => {
    const fixture = await crear(true);

    expect(boton(fixture).getAttribute('aria-label')).toBe('Quitar de guardadas');
    expect(boton(fixture).getAttribute('aria-pressed')).toBe('true');
    expect(boton(fixture).classList).toContain('guardada');
  });

  it('[O] al tocar guarda con un POST sin body y avisa el cambio', async () => {
    const fixture = await crear();

    boton(fixture).click();
    const solicitud = http.expectOne(RUTA);
    solicitud.flush({ guardada: true });
    await actualizar(fixture);

    expect(solicitud.request.method).toBe('POST');
    expect(boton(fixture).getAttribute('aria-pressed')).toBe('true');
    expect(fixture.componentInstance.cambios).toHaveBeenCalledWith(true);
  });

  it('[O] si ya estaba guardada, tocar la quita con un DELETE y avisa el cambio', async () => {
    const fixture = await crear(true);

    boton(fixture).click();
    const solicitud = http.expectOne(RUTA);
    solicitud.flush(null, { status: 204, statusText: 'No Content' });
    await actualizar(fixture);

    expect(solicitud.request.method).toBe('DELETE');
    expect(boton(fixture).getAttribute('aria-pressed')).toBe('false');
    expect(fixture.componentInstance.cambios).toHaveBeenCalledWith(false);
  });

  it('[S] mientras espera la respuesta se deshabilita y no manda dos pedidos', async () => {
    const fixture = await crear();

    boton(fixture).click();
    await actualizar(fixture);
    boton(fixture).click();

    expect(boton(fixture).disabled).toBe(true);
    expect(http.match(RUTA)).toHaveLength(1);
  });

  it('[E] si falla, avisa el error y deja el estado como estaba', async () => {
    const fixture = await crear();

    boton(fixture).click();
    http
      .expectOne(RUTA)
      .flush(
        { message: 'x', codigo: 'PUBLICACION_NO_ENCONTRADA' },
        { status: 404, statusText: 'x' },
      );
    await actualizar(fixture);

    expect(fixture.componentInstance.fallos).toHaveBeenLastCalledWith(expect.any(String));
    expect(fixture.componentInstance.cambios).not.toHaveBeenCalled();
    expect(boton(fixture).getAttribute('aria-pressed')).toBe('false');
    expect(boton(fixture).disabled).toBe(false);
  });
});
