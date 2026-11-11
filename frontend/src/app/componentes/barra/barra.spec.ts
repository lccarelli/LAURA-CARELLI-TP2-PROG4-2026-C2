import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Auth } from '../../servicios/auth/auth';
import { Barra } from './barra';
import { proveerIdiomaDePrueba } from '../../../testing/idioma';

describe('Barra', () => {
  let fixture: ComponentFixture<Barra>;

  const iniciarSesion = async () => {
    TestBed.inject(Auth).usuario.set({ nombreUsuario: 'laura_c' } as never);
    TestBed.inject(Auth).token.set('abc');
    fixture.detectChanges();
    await fixture.whenStable();
  };

  const texto = () => fixture.nativeElement.textContent as string;

  const botonSalir = () =>
    [...fixture.nativeElement.querySelectorAll('button')].find((boton) =>
      (boton as HTMLElement).textContent?.includes('Salir'),
    ) as HTMLButtonElement;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [Barra],
      providers: [
        proveerIdiomaDePrueba(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(Barra);
    await fixture.whenStable();
  });

  it('[Z] sin sesión ofrece ingresar y registrarse, y no salir', () => {
    expect(texto()).toContain('Ingresar');
    expect(texto()).toContain('Registrarme');
    expect(texto()).not.toContain('Salir');
  });

  it('[O] con sesión muestra el usuario y el botón Salir', async () => {
    await iniciarSesion();

    expect(texto()).toContain('@laura_c');
    expect(texto()).toContain('Mi perfil');
    expect(texto()).toContain('Salir');
    expect(texto()).not.toContain('Registrarme');
  });

  it('[O] un administrador ve el enlace a Administración y lleva a los usuarios', async () => {
    TestBed.inject(Auth).usuario.set({
      nombreUsuario: 'laura_c',
      perfil: 'administrador',
    } as never);
    TestBed.inject(Auth).token.set('abc');
    fixture.detectChanges();
    await fixture.whenStable();

    const enlace = fixture.nativeElement.querySelector('a[href="/dashboard/usuarios"]');

    expect(enlace.textContent).toContain('Administración');
  });

  it('[E] una persona común no ve el enlace a Administración', async () => {
    TestBed.inject(Auth).usuario.set({ nombreUsuario: 'laura_c', perfil: 'usuario' } as never);
    TestBed.inject(Auth).token.set('abc');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('a[href="/dashboard/usuarios"]')).toBeNull();
    expect(texto()).not.toContain('Administración');
  });

  it('[Z] sin sesión tampoco aparece Administración', () => {
    expect(texto()).not.toContain('Administración');
  });

  it('[I] ofrece español e inglés y marca el idioma actual', () => {
    const botones = [...fixture.nativeElement.querySelectorAll('[aria-pressed]')] as HTMLElement[];

    expect(botones.map((boton) => boton.textContent?.trim())).toEqual(['es', 'en']);
    expect(botones.map((boton) => boton.getAttribute('aria-pressed'))).toEqual(['true', 'false']);
  });

  it('[S] al elegir inglés la barra se traduce, y al volver a español también', async () => {
    const botones = () =>
      [...fixture.nativeElement.querySelectorAll('[aria-pressed]')] as HTMLButtonElement[];

    botones()[1].click();
    await fixture.whenStable();
    expect(texto()).toContain('Log in');
    expect(texto()).not.toContain('Ingresar');

    botones()[0].click();
    await fixture.whenStable();
    expect(texto()).toContain('Ingresar');
  });

  it('[S] el botón de tema alterna entre claro y oscuro y avisa qué hará', async () => {
    const boton = () => fixture.nativeElement.querySelector('.boton-tema') as HTMLButtonElement;
    expect(boton().getAttribute('aria-label')).toBe('Activar modo oscuro');

    boton().click();
    await fixture.whenStable();

    expect(document.documentElement.dataset['tema']).toBe('oscuro');
    expect(boton().getAttribute('aria-label')).toBe('Activar modo claro');
  });

  it('[S] al pulsar Salir se borra la sesión y va a la pantalla de inicio', async () => {
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    await iniciarSesion();

    botonSalir().click();

    expect(TestBed.inject(Auth).token()).toBeNull();
    expect(navegar).toHaveBeenCalledWith(['/']);
  });
});
