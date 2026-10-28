import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { proveerIdiomaDePrueba } from '../../../testing/idioma';
import { Idioma } from '../../servicios/idioma/idioma';
import { Inicio } from './inicio';

describe('Inicio', () => {
  async function mostrar() {
    await TestBed.configureTestingModule({
      imports: [Inicio],
      providers: [proveerIdiomaDePrueba(), provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(Inicio);
    await fixture.whenStable();
    return fixture;
  }

  it('[Z] muestra el título de la red y la invitación', async () => {
    const { nativeElement: pagina } = await mostrar();

    expect(pagina.querySelector('h1').textContent).toContain(
      'Un lugar para compartir tu mundo culinario',
    );
    expect(pagina.textContent).toContain('Sumate para ver más');
  });

  it('[O] muestra cuatro publicaciones de ejemplo con su autor', async () => {
    const { nativeElement: pagina } = await mostrar();
    const tarjetas = pagina.querySelectorAll('app-tarjeta-publicacion');

    expect(tarjetas).toHaveLength(4);
    expect(tarjetas[0].textContent).toContain('@ana_g');
    expect(tarjetas[1].textContent).toContain('@juan_p');
  });

  it('[I] ofrece crear la cuenta y también ingresar', async () => {
    const { nativeElement: pagina } = await mostrar();
    const enlaces = [...pagina.querySelectorAll('a')].map((a) => a.getAttribute('href'));

    expect(enlaces).toContain('/registro');
    expect(enlaces).toContain('/login');
  });

  it('[I] la vista previa no es interactiva ni la leen los lectores de pantalla', async () => {
    const { nativeElement: pagina } = await mostrar();
    const vista = pagina.querySelector('.vista-previa');

    expect(vista.hasAttribute('inert')).toBe(true);
    expect(vista.getAttribute('aria-hidden')).toBe('true');
  });

  it('[I] la imagen del ejemplo sale de la carpeta pública, no de la API', async () => {
    const { nativeElement: pagina } = await mostrar();
    const imagenes = [...pagina.querySelectorAll('.pin-imagen')].map((i) => i.getAttribute('src'));

    expect(imagenes).toEqual(['/demo/galletitas-1.jpg', '/demo/galletitas-2.jpg']);
  });

  it('[S] los ejemplos se traducen al cambiar el idioma', async () => {
    const fixture = await mostrar();
    expect(fixture.nativeElement.textContent).toContain('Galletitas con chips de chocolate');

    TestBed.inject(Idioma).cambiar('en');
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Chocolate chip cookies');
    expect(fixture.nativeElement.textContent).not.toContain('Galletitas con chips de chocolate');
  });
});
