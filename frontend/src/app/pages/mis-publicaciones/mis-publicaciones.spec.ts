import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { MuroPublicaciones } from '../../componentes/muro-publicaciones/muro-publicaciones';
import { of } from 'rxjs';
import { PaginaPublicaciones } from '../../interfaces/publicacion';
import { Auth } from '../../servicios/auth/auth';
import { MisPublicaciones } from './mis-publicaciones';
import { proveerIdiomaDePrueba } from '../../../testing/idioma';
import { publicacionDePrueba } from '../../../testing/publicacion';
import { usuarioDePrueba } from '../../../testing/usuario';

const RUTA = `${environment.API_URL}/publicaciones`;

const pagina = (cantidad: number): PaginaPublicaciones => ({
  datos: Array.from({ length: cantidad }, (_, i) => publicacionDePrueba(i + 1)),
  offset: 0,
  limit: 10,
  hayMas: false,
});

describe('MisPublicaciones', () => {
  let fixture: ComponentFixture<MisPublicaciones>;
  let http: HttpTestingController;

  const pedido = (extra: Record<string, string> = {}) =>
    http.expectOne((solicitud) => {
      const esperados = { usuario: 'u1', limit: '10', offset: '0', orden: 'fecha', ...extra };
      return (
        solicitud.url === RUTA &&
        Object.entries(esperados).every(([clave, valor]) => solicitud.params.get(clave) === valor)
      );
    });
  const actualizar = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
  };
  const abrir = async (conSesion = true, q?: string) => {
    Object.defineProperty(TestBed.inject(ActivatedRoute), 'queryParamMap', {
      value: of(convertToParamMap(q ? { q } : {})),
    });
    TestBed.inject(Auth).usuario.set(conSesion ? usuarioDePrueba : null);
    fixture = TestBed.createComponent(MisPublicaciones);
    await actualizar();
  };
  const muro = () =>
    fixture.debugElement.query(By.directive(MuroPublicaciones))
      .componentInstance as MuroPublicaciones;
  const texto = () => fixture.nativeElement.textContent as string;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [MisPublicaciones],
      providers: [
        proveerIdiomaDePrueba(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  it('[O] pide las publicaciones de la persona de la sesión, y sólo las suyas', async () => {
    await abrir();

    const solicitud = pedido();
    solicitud.flush(pagina(2));
    await actualizar();

    expect(solicitud.request.method).toBe('GET');
    expect(fixture.nativeElement.querySelectorAll('app-tarjeta-publicacion')).toHaveLength(2);
  });

  it('[I] tiene título y un enlace para volver al perfil', async () => {
    await abrir();
    pedido().flush(pagina(1));

    expect(fixture.nativeElement.querySelector('h1').textContent).toContain('Mis publicaciones');
    expect(fixture.nativeElement.querySelector('a[href="/perfil"]')).not.toBeNull();
  });

  it('[I] ofrece ordenar y filtrar por tipo como en el inicio, y busca con la barra de arriba', async () => {
    await abrir();
    pedido().flush(pagina(1));
    await actualizar();

    expect(fixture.nativeElement.querySelector('[role="search"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('.orden')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.filtro-tipo')).not.toBeNull();
  });

  it('[S] al filtrar por tipo vuelve a pedir sólo las de esa persona y de ese tipo', async () => {
    await abrir();
    pedido().flush(pagina(1));
    muro().cambiarTipo('tip');

    const solicitud = pedido({ tipo: 'tip' });
    solicitud.flush(pagina(0));

    expect(solicitud.request.method).toBe('GET');
  });

  it('[O] si la dirección trae una búsqueda, pide sólo las de esa persona con el texto', async () => {
    await abrir(true, 'tarta');

    pedido({ q: 'tarta' }).flush(pagina(0));
    await actualizar();

    expect(texto()).toContain('No encontramos publicaciones para «tarta»');
  });

  it('[S] al cambiar la búsqueda de la dirección vuelve a pedir con el texto nuevo', async () => {
    await abrir();
    pedido().flush(pagina(1));
    muro().buscar('torta');

    const solicitud = pedido({ q: 'torta' });
    solicitud.flush(pagina(0));

    expect(solicitud.request.method).toBe('GET');
  });

  it('[S] al ordenar por me gusta vuelve a pedir sólo las de esa persona', async () => {
    await abrir();
    pedido().flush(pagina(1));
    muro().cambiarOrden('megusta');

    const solicitud = pedido({ orden: 'megusta' });
    solicitud.flush(pagina(0));

    expect(solicitud.request.method).toBe('GET');
  });

  it('[Z] sin publicaciones lo dice con el mensaje del perfil', async () => {
    await abrir();
    pedido().flush(pagina(0));
    await actualizar();

    expect(texto()).toContain('Todavía no publicaste nada');
  });

  it('[E] si falla la carga avisa y no dice que no hay publicaciones', async () => {
    await abrir();
    pedido().flush({ message: 'x', codigo: 'ERROR' }, { status: 500, statusText: 'x' });
    await actualizar();

    expect(texto()).toContain('No se pudieron cargar las publicaciones');
    expect(texto()).not.toContain('Todavía no publicaste nada');
  });

  it('[Z] sin sesión no pide nada', async () => {
    await abrir(false);

    expect(http.match(RUTA)).toHaveLength(0);
  });
});
