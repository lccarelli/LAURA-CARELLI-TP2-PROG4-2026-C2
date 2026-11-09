import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { Sesion } from './servicios/sesion/sesion';
import { proveerIdiomaDePrueba } from '../testing/idioma';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        proveerIdiomaDePrueba(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
  });

  it('[Z] se crea sin ninguna ruta definida', () => {
    const fixture = TestBed.createComponent(App);

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('[O] tiene un lugar donde se muestran las páginas', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('router-outlet')).not.toBeNull();
  });

  it('[Z] sin verificación en curso no muestra la pantalla de carga', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('app-pantalla-carga')).toBeNull();
  });

  it('[O] mientras se verifica la sesión muestra la carga y no las páginas ni la barra', async () => {
    TestBed.inject(Sesion).verificando.set(true);
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('app-pantalla-carga')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('router-outlet')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-barra')).toBeNull();
  });

  it('[S] al terminar la verificación vuelve a mostrar las páginas', async () => {
    const sesion = TestBed.inject(Sesion);
    sesion.verificando.set(true);
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    sesion.verificando.set(false);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('app-pantalla-carga')).toBeNull();
    expect(fixture.nativeElement.querySelector('router-outlet')).not.toBeNull();
  });
});
