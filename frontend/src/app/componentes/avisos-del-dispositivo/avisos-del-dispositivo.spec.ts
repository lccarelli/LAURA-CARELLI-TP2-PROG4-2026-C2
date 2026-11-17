import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { proveerIdiomaDePrueba } from '../../../testing/idioma';
import { AvisosPush, EstadoDeAvisos } from '../../servicios/avisos-push/avisos-push';
import { Instalacion } from '../../servicios/instalacion/instalacion';
import { AvisosDelDispositivo } from './avisos-del-dispositivo';

describe('AvisosDelDispositivo', () => {
  let fixture: ComponentFixture<AvisosDelDispositivo>;
  const estado = signal<EstadoDeAvisos>('inactivo');
  const puedeInstalar = signal(false);
  const avisos = {
    estado,
    trabajando: signal(false),
    fallo: signal(false),
    activar: vi.fn(),
    desactivar: vi.fn(),
  };
  const instalacion = { puedeInstalar, instalar: vi.fn() };

  const texto = () => fixture.nativeElement.textContent as string;
  const boton = (nombre: string) =>
    Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((b) => b.textContent!.includes(nombre));
  const mostrar = (nuevo: EstadoDeAvisos, instalable = false) => {
    estado.set(nuevo);
    puedeInstalar.set(instalable);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    avisos.activar.mockClear();
    avisos.desactivar.mockClear();
    instalacion.instalar.mockClear();
    avisos.trabajando.set(false);
    avisos.fallo.set(false);
    await TestBed.configureTestingModule({
      imports: [AvisosDelDispositivo],
      providers: [
        proveerIdiomaDePrueba(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AvisosPush, useValue: avisos },
        { provide: Instalacion, useValue: instalacion },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(AvisosDelDispositivo);
  });

  it('[Z] sin soporte y sin poder instalar no muestra nada', () => {
    mostrar('no-disponible');

    expect(fixture.nativeElement.querySelector('.avisos-dispositivo')).toBeNull();
  });

  it('[O] inactivo explica para qué sirve y permite activar', () => {
    mostrar('inactivo');

    expect(texto()).toContain('aunque la app esté cerrada');
    boton('Activar avisos')!.click();
    expect(avisos.activar).toHaveBeenCalledTimes(1);
  });

  it('[O] activo lo dice y permite desactivar', () => {
    mostrar('activo');

    expect(texto()).toContain('Los avisos están activados');
    boton('Desactivar avisos')!.click();
    expect(avisos.desactivar).toHaveBeenCalledTimes(1);
  });

  it('[S] mientras trabaja, el botón queda deshabilitado y lo dice', () => {
    avisos.trabajando.set(true);
    mostrar('inactivo');

    expect(boton('Activando')!.disabled).toBe(true);
  });

  it('[O] bloqueado explica cómo desbloquear y no ofrece activar', () => {
    mostrar('bloqueado');

    expect(texto()).toContain('bloqueados en este navegador');
    expect(boton('Activar avisos')).toBeUndefined();
  });

  it('[O] en iPhone sin instalar explica cómo instalar la app', () => {
    mostrar('instalar');

    expect(texto()).toContain('Agregar a inicio');
    expect(boton('Activar avisos')).toBeUndefined();
  });

  it('[O] si el navegador permite instalar, ofrece instalar la app aunque no haya avisos', () => {
    mostrar('no-disponible', true);

    boton('Instalar la app')!.click();

    expect(instalacion.instalar).toHaveBeenCalledTimes(1);
  });

  it('[E] un fallo al cambiar el estado se avisa', () => {
    avisos.fallo.set(true);
    mostrar('inactivo');

    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
  });
});
