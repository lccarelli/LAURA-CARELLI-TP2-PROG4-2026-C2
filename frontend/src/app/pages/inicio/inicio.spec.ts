import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { proveerIdiomaDePrueba } from '../../../testing/idioma';
import { publicacionDePrueba } from '../../../testing/publicacion';
import { Inicio } from './inicio';

const RUTA = `${environment.API_URL}/publico/publicaciones`;

describe('Inicio', () => {
  let http: HttpTestingController;

  async function mostrar(respuesta: 'bien' | 'mal' = 'bien', cantidad = 4) {
    await TestBed.configureTestingModule({
      imports: [Inicio],
      providers: [
        proveerIdiomaDePrueba(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(Inicio);
    await fixture.whenStable();
    const solicitud = http.expectOne((s) => s.url === RUTA);
    if (respuesta === 'bien') {
      solicitud.flush({
        datos: Array.from({ length: cantidad }, (_, i) =>
          publicacionDePrueba(i + 1, { imagen: i === 0 ? 'https://cdn.test/1.jpg' : undefined }),
        ),
        limit: 8,
      });
    } else {
      solicitud.flush({ message: 'x', codigo: 'E' }, { status: 500, statusText: 'x' });
    }
    fixture.detectChanges();
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

  it('[O] pide las 8 publicaciones más recientes sin token, a la ruta pública', async () => {
    await TestBed.configureTestingModule({
      imports: [Inicio],
      providers: [
        proveerIdiomaDePrueba(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
    TestBed.createComponent(Inicio);

    const solicitud = TestBed.inject(HttpTestingController).expectOne((s) => s.url === RUTA);

    expect(solicitud.request.method).toBe('GET');
    expect(solicitud.request.params.get('limit')).toBe('8');
    solicitud.flush({ datos: [], limit: 8 });
  });

  it('[O] muestra las publicaciones reales con su autor', async () => {
    const { nativeElement: pagina } = await mostrar();

    const tarjetas = pagina.querySelectorAll('app-tarjeta-publicacion');

    expect(tarjetas).toHaveLength(4);
    expect(tarjetas[0].textContent).toContain('Título 1');
    expect(tarjetas[0].textContent).toContain('@laura_c');
  });

  it('[I] las tarjetas son sólo de lectura: abren la vista pública y no tienen botones', async () => {
    const { nativeElement: pagina } = await mostrar();

    const enlace = pagina.querySelector('app-tarjeta-publicacion a.pin') as HTMLAnchorElement;

    expect(enlace.getAttribute('href')).toBe('/publico/id1');
    expect(pagina.querySelectorAll('app-tarjeta-publicacion button')).toHaveLength(0);
  });

  it('[I] ofrece crear la cuenta y también ingresar', async () => {
    const { nativeElement: pagina } = await mostrar();
    const enlaces = [...pagina.querySelectorAll('a')].map((a) => a.getAttribute('href'));

    expect(enlaces).toContain('/registro');
    expect(enlaces).toContain('/login');
  });

  it('[Z] si todavía no hay publicaciones no muestra la vista previa', async () => {
    const { nativeElement: pagina } = await mostrar('bien', 0);

    expect(pagina.querySelector('app-tarjeta-publicacion')).toBeNull();
    expect(pagina.textContent).not.toContain('Te esperamos dentro de la comunidad');
  });

  it('[E] si falla la carga igual se ve la invitación y no se muestran publicaciones', async () => {
    const { nativeElement: pagina } = await mostrar('mal');

    expect(pagina.querySelector('app-tarjeta-publicacion')).toBeNull();
    expect(pagina.textContent).toContain('Sumate para ver más');
  });
});
