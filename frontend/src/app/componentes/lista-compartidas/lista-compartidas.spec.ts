import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { proveerIdiomaDePrueba } from '../../../testing/idioma';
import { publicacionDePrueba } from '../../../testing/publicacion';
import { PaginaCompartidas, PublicacionCompartida } from '../../interfaces/publicacion';
import { SIN_INDICADOR_DE_CARGA } from '../../servicios/carga/carga';
import { Auth } from '../../servicios/auth/auth';
import { usuarioDePrueba } from '../../../testing/usuario';
import { ListaCompartidas } from './lista-compartidas';

const RAIZ = environment.API_URL;
const ANA = { _id: 'u7', nombre: 'Ana', apellido: 'Gómez', nombreUsuario: 'ana_g' };

const compartida = (numero: number, cambios?: Partial<PublicacionCompartida>) =>
  ({
    ...publicacionDePrueba(numero),
    compartidaPor: ANA,
    fechaCompartida: '2026-10-22T15:30:00',
    vista: true,
    ...cambios,
  }) as PublicacionCompartida;

const pagina = (datos: PublicacionCompartida[], hayMas = false): PaginaCompartidas => ({
  datos,
  offset: 0,
  limit: 10,
  hayMas,
});

describe('ListaCompartidas', () => {
  let fixture: ComponentFixture<ListaCompartidas>;
  let http: HttpTestingController;
  let vistas: number;

  const actualizar = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
  };
  const pedir = (offset = 0) =>
    http.expectOne(
      (s) =>
        s.url === `${RAIZ}/publicaciones/compartidas` && s.params.get('offset') === `${offset}`,
    );
  const marcar = () =>
    http.expectOne({ method: 'POST', url: `${RAIZ}/publicaciones/compartidas/marcar-vistas` });
  const texto = () => fixture.nativeElement.textContent as string;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [ListaCompartidas],
      providers: [
        proveerIdiomaDePrueba(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
    TestBed.inject(Auth).usuario.set(usuarioDePrueba);
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ListaCompartidas);
    vistas = 0;
    fixture.componentInstance.vistas.subscribe(() => vistas++);
    await actualizar();
  });

  it('[O] pide la primera página y muestra cada publicación con quién la compartió', async () => {
    pedir().flush(pagina([compartida(1), compartida(2)]));
    await actualizar();

    const cuadros = fixture.nativeElement.querySelectorAll('.compartida');

    expect(cuadros).toHaveLength(2);
    expect(cuadros[0].querySelector('.compartida-por').textContent).toContain('@ana_g');
    expect(cuadros[0].querySelector('.compartida-por').textContent).toContain('te compartió esto');
    expect(cuadros[0].querySelector('article.ultima')).not.toBeNull();
    expect(cuadros[0].querySelector('app-tarjeta-publicacion')).toBeNull();
  });

  it('[I] usa la misma tarjeta que Mi actividad: foto chica, título, métricas y últimos comentarios', async () => {
    pedir().flush(pagina([compartida(1)]));
    await actualizar();

    const tarjeta = fixture.nativeElement.querySelector(
      '.compartida article.ultima',
    ) as HTMLElement;

    expect(tarjeta.querySelector('.ultima-titulo')!.textContent).toContain('Título 1');
    expect(tarjeta.querySelectorAll('.metrica')).toHaveLength(2);
    expect(tarjeta.querySelector('app-ultimos-comentarios')).not.toBeNull();
  });

  it('[I] el nombre de quien compartió lleva a su perfil', async () => {
    pedir().flush(pagina([compartida(1)]));
    await actualizar();

    const enlace = fixture.nativeElement.querySelector('.compartida-por a') as HTMLAnchorElement;

    expect(enlace.getAttribute('href')).toBe('/perfil/u7');
  });

  it('[Z] sin nada compartido muestra el mensaje de vacío', async () => {
    pedir().flush(pagina([]));
    await actualizar();

    expect(texto()).toContain('Todavía nadie te compartió');
  });

  it('[Z] mientras carga no muestra el aviso de vacío', () => {
    expect(texto()).not.toContain('Todavía nadie te compartió');
    pedir().flush(pagina([]));
  });

  it('[S] la misma publicación compartida por dos personas aparece dos veces', async () => {
    const otra = { ...ANA, _id: 'u8', nombreUsuario: 'juan_p' };
    pedir().flush(
      pagina([
        compartida(1),
        compartida(1, { compartidaPor: otra, fechaCompartida: '2026-10-23T10:00:00' }),
      ]),
    );
    await actualizar();

    expect(fixture.nativeElement.querySelectorAll('.compartida')).toHaveLength(2);
  });

  it('[O] si hay más ofrece traer la página siguiente con el offset correcto', async () => {
    pedir().flush(pagina([compartida(1), compartida(2)], true));
    await actualizar();

    fixture.componentInstance.listado.cargarMas();

    pedir(2).flush(pagina([compartida(3)]));
    await actualizar();
    expect(fixture.nativeElement.querySelectorAll('.compartida')).toHaveLength(3);
  });

  it('[E] si falla la carga muestra el aviso y no el mensaje de vacío', async () => {
    pedir().flush({ codigo: 'X' }, { status: 500, statusText: 'Error' });
    await actualizar();

    expect(fixture.nativeElement.querySelector('app-aviso')).not.toBeNull();
    expect(texto()).not.toContain('Todavía nadie te compartió');
  });

  it('[O] después de mostrar la primera página marca todo como visto y avisa para apagar el contador', async () => {
    pedir().flush(pagina([compartida(1, { vista: false })]));
    await actualizar();

    const solicitud = marcar();
    solicitud.flush({ actualizadas: 1 });

    expect(solicitud.request.context.get(SIN_INDICADOR_DE_CARGA)).toBe(true);
    expect(vistas).toBe(1);
  });

  it('[S] no marca nada antes de tener la lista en pantalla (si no, nunca se vería «Nueva»)', async () => {
    http.expectNone(`${RAIZ}/publicaciones/compartidas/marcar-vistas`);
    pedir().flush(pagina([compartida(1)]));
    await actualizar();

    const solicitud = marcar();
    solicitud.flush({ actualizadas: 0 });

    expect(solicitud.request.method).toBe('POST');
  });

  it('[Z] si no hay nada compartido no pide marcar', async () => {
    pedir().flush(pagina([]));
    await actualizar();

    http.expectNone(`${RAIZ}/publicaciones/compartidas/marcar-vistas`);
    expect(vistas).toBe(0);
  });

  it('[S] marca una sola vez aunque se traigan más páginas', async () => {
    pedir().flush(pagina([compartida(1)], true));
    await actualizar();
    marcar().flush({ actualizadas: 1 });
    fixture.componentInstance.listado.cargarMas();
    pedir(1).flush(pagina([compartida(2)]));
    await actualizar();

    http.expectNone(`${RAIZ}/publicaciones/compartidas/marcar-vistas`);
    expect(vistas).toBe(1);
  });

  it('[E] si falla el marcado la lista se ve igual y no avisa', async () => {
    pedir().flush(pagina([compartida(1)]));
    await actualizar();
    marcar().flush({}, { status: 500, statusText: 'Error' });
    await actualizar();

    expect(fixture.nativeElement.querySelectorAll('.compartida')).toHaveLength(1);
    expect(vistas).toBe(0);
  });

  it('[O] las que todavía no se habían visto llevan la etiqueta «Nueva» y las demás no', async () => {
    pedir().flush(pagina([compartida(1, { vista: false }), compartida(2)]));
    await actualizar();

    const cuadros = fixture.nativeElement.querySelectorAll('.compartida');

    expect(cuadros[0].querySelector('.etiqueta-nueva').textContent).toContain('Nueva');
    expect(cuadros[1].querySelector('.etiqueta-nueva')).toBeNull();
  });

  describe('al llegar desde una notificación (publicación destacada)', () => {
    let bajar: ReturnType<typeof vi.fn<(opciones?: ScrollIntoViewOptions) => void>>;

    const abrirCon = async (id: string | null) => {
      fixture.componentRef.setInput('destacada', id);
      await actualizar();
    };
    const resaltadas = () => fixture.nativeElement.querySelectorAll('.compartida-destacada');

    beforeEach(() => {
      bajar = vi.fn<(opciones?: ScrollIntoViewOptions) => void>();
      Element.prototype.scrollIntoView = bajar;
    });

    it('[O] si está en la primera página, la resalta y se ubica ahí', async () => {
      await abrirCon('id2');
      pedir().flush(pagina([compartida(1), compartida(2), compartida(3)]));
      await actualizar();

      expect(resaltadas()).toHaveLength(1);
      expect(resaltadas()[0].textContent).toContain('Título 2');
      expect(bajar).toHaveBeenCalledTimes(1);
      expect(bajar).toHaveBeenCalledWith({ block: 'center', behavior: 'smooth' });
    });

    it('[O] si está en una página siguiente, sigue trayendo páginas hasta encontrarla', async () => {
      await abrirCon('id12');
      pedir().flush(pagina([compartida(1), compartida(2)], true));
      await actualizar();
      expect(bajar).not.toHaveBeenCalled();

      pedir(2).flush(pagina([compartida(12)]));
      await actualizar();

      expect(resaltadas()[0].textContent).toContain('Título 12');
      expect(bajar).toHaveBeenCalledTimes(1);
    });

    it('[E] si ya no está (la eliminaron), recorre todo y no resalta ni se mueve', async () => {
      await abrirCon('id99');
      pedir().flush(pagina([compartida(1)], true));
      await actualizar();
      pedir(1).flush(pagina([compartida(2)]));
      await actualizar();

      expect(resaltadas()).toHaveLength(0);
      expect(bajar).not.toHaveBeenCalled();
      expect(fixture.nativeElement.querySelectorAll('.compartida')).toHaveLength(2);
    });

    it('[S] si fue compartida varias veces, resalta sólo la más reciente', async () => {
      await abrirCon('id1');
      pedir().flush(
        pagina([compartida(1), compartida(1, { fechaCompartida: '2026-10-20T10:00:00' })]),
      );
      await actualizar();

      expect(resaltadas()).toHaveLength(1);
      expect(fixture.nativeElement.querySelectorAll('.compartida')[0].classList).toContain(
        'compartida-destacada',
      );
    });

    it('[S] se ubica una sola vez: traer más páginas después no vuelve a moverla', async () => {
      await abrirCon('id1');
      pedir().flush(pagina([compartida(1)], true));
      await actualizar();
      fixture.componentInstance.listado.cargarMas();
      pedir(1).flush(pagina([compartida(2)]));
      await actualizar();

      expect(bajar).toHaveBeenCalledTimes(1);
    });

    it('[Z] sin publicación destacada no resalta ni se mueve ni trae páginas de más', async () => {
      await abrirCon(null);
      pedir().flush(pagina([compartida(1)], true));
      await actualizar();

      expect(resaltadas()).toHaveLength(0);
      expect(bajar).not.toHaveBeenCalled();
      http.expectNone(
        (s) => s.url === `${RAIZ}/publicaciones/compartidas` && s.params.get('offset') === '1',
      );
    });
  });
});
