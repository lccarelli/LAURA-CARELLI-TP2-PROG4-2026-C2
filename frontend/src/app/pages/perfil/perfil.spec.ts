import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { PaginaPublicaciones, Publicacion } from '../../interfaces/publicacion';
import { Usuario } from '../../interfaces/usuario';
import { Auth } from '../../servicios/auth/auth';
import { Idioma } from '../../servicios/idioma/idioma';
import { comentarioDePrueba } from '../../../testing/comentario';
import { PaginaComentarios } from '../../interfaces/comentario';
import { Perfil } from './perfil';
import { proveerIdiomaDePrueba } from '../../../testing/idioma';

const usuario: Usuario = {
  _id: '1',
  nombre: 'Laura',
  apellido: 'Carelli',
  correo: 'laura@correo.com',
  nombreUsuario: 'laura_c',
  fechaNacimiento: '1990-05-20T00:00:00.000Z',
  descripcion: 'Estudiante de programación',
  perfil: 'usuario',
  habilitado: true,
};

const URL = `${environment.API_URL}/publicaciones`;

const publicacion = (numero: number): Publicacion => ({
  _id: `id${numero}`,
  usuario: { _id: '1', nombre: 'Laura', apellido: 'Carelli', nombreUsuario: 'laura_c' },
  tipo: 'receta',
  cantidadMeGusta: 4,
  cantidadComentarios: 6,
  titulo: `Título ${numero}`,
  mensaje: `Mensaje ${numero}`,
  fecha: '2026-10-22T15:30:00',
});

describe('Perfil', () => {
  let fixture: ComponentFixture<Perfil>;
  let http: HttpTestingController;

  const mostrar = async (datos: Usuario | null) => {
    TestBed.inject(Auth).usuario.set(datos);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [Perfil],
      providers: [
        proveerIdiomaDePrueba(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Perfil);
  });

  afterEach(() => vi.useRealTimers());

  it('[Z] sin usuario en la sesión no muestra datos y no falla', async () => {
    const pagina = await mostrar(null);

    expect(pagina.querySelector('dl')).toBeNull();
  });

  it('[O] con sesión muestra todos los datos del usuario', async () => {
    const texto = (await mostrar(usuario)).textContent;

    expect(texto).toContain('Laura Carelli');
    expect(texto).toContain('@laura_c');
    expect(texto).toContain('laura@correo.com');
    expect(texto).toContain('Estudiante de programación');
    expect(fixture.nativeElement.querySelector('.chip')).toBeNull();
  });

  it('[B] sin foto muestra la imagen por defecto', async () => {
    const pagina = await mostrar(usuario);

    expect(pagina.querySelector('img')!.getAttribute('src')).toBe('/sin-foto.svg');
  });

  it('[B] con foto muestra la imagen guardada en Cloudinary', async () => {
    const pagina = await mostrar({
      ...usuario,
      imagenPerfil: 'https://res.cloudinary.com/nube/image/upload/banquete/abc.png',
    });

    expect(pagina.querySelector('img')!.getAttribute('src')).toBe(
      'https://res.cloudinary.com/nube/image/upload/banquete/abc.png',
    );
  });

  it('[B] una descripción de 200 caracteres sin espacios se puede cortar', async () => {
    const pagina = await mostrar({ ...usuario, descripcion: 'a'.repeat(200) });

    expect(pagina.querySelector('dd.whitespace-pre-line')!.textContent).toHaveLength(200);
  });

  it('[I] en inglés la fecha se muestra con el mes primero', async () => {
    TestBed.inject(Idioma).cambiar('en');
    const pagina = await mostrar(usuario);

    expect(pagina.textContent).toContain('05/20/1990');
  });

  it('[O] junto a la fecha de nacimiento muestra la edad', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 15, 12));

    const pagina = await mostrar(usuario);

    expect(pagina.textContent).toContain('20/05/1990');
    expect(pagina.textContent).toContain('(36 años)');
  });

  it('[S] en inglés la edad también se traduce', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 15, 12));
    TestBed.inject(Idioma).cambiar('en');

    const pagina = await mostrar(usuario);

    expect(pagina.textContent).toContain('(36 years)');
  });

  it('[I] la fecha de nacimiento no se corre un día por la zona horaria', async () => {
    const pagina = await mostrar(usuario);

    expect(pagina.textContent).toContain('20/05/1990');
  });

  it('[I] no muestra ningún dato de clave', async () => {
    const texto = (await mostrar(usuario)).textContent!.toLowerCase();

    expect(texto).not.toContain('clave');
    expect(texto).not.toContain('contraseña');
  });

  describe('mis publicaciones', () => {
    const pedido = () =>
      http.expectOne(
        (solicitud) =>
          solicitud.url === URL &&
          solicitud.params.get('usuario') === '1' &&
          solicitud.params.get('limit') === '12' &&
          solicitud.params.get('offset') === '0' &&
          solicitud.params.get('orden') === 'fecha',
      );
    const actualizar = async () => {
      fixture.detectChanges();
      await fixture.whenStable();
    };
    const portadas = () =>
      Array.from(
        fixture.nativeElement.querySelectorAll('.tablero-portada') as NodeListOf<HTMLImageElement>,
      ).map((imagen) => imagen.getAttribute('src'));
    const conImagen = (numero: number) => ({
      ...publicacion(numero),
      imagen: `https://cdn.test/${numero}.jpg`,
    });
    const pagina = (datos: Publicacion[]): PaginaPublicaciones => ({
      datos,
      offset: 0,
      limit: 12,
      hayMas: false,
    });

    it('[O] ya no lista las publicaciones ahí: ofrece una tarjeta que lleva a otra pantalla', async () => {
      const raiz = await mostrar(usuario);
      pedido().flush(pagina([publicacion(1)]));
      await actualizar();

      const tarjeta = raiz.querySelector('a.tablero') as HTMLAnchorElement;

      expect(tarjeta.getAttribute('href')).toBe('/perfil/publicaciones');
      expect(tarjeta.textContent).toContain('Mis publicaciones');
      expect(raiz.querySelector('app-tarjeta-publicacion')).toBeNull();
      expect(raiz.querySelector('[role="search"]')).toBeNull();
    });

    it('[O] el collage usa las portadas de las 3 más recientes que tienen imagen', async () => {
      await mostrar(usuario);
      pedido().flush(
        pagina([conImagen(1), publicacion(2), conImagen(3), conImagen(4), conImagen(5)]),
      );
      await actualizar();

      expect(portadas()).toEqual([
        'https://cdn.test/1.jpg',
        'https://cdn.test/3.jpg',
        'https://cdn.test/4.jpg',
      ]);
    });

    it('[Z] sin publicaciones con imagen el collage queda vacío y la tarjeta sigue ahí', async () => {
      const raiz = await mostrar(usuario);
      pedido().flush(pagina([publicacion(1)]));
      await actualizar();

      expect(portadas()).toEqual([]);
      expect(raiz.querySelector('a.tablero')).not.toBeNull();
    });

    it('[B] con una sola imagen el collage muestra esa', async () => {
      await mostrar(usuario);
      pedido().flush(pagina([conImagen(1)]));
      await actualizar();

      expect(portadas()).toEqual(['https://cdn.test/1.jpg']);
    });

    it('[E] si falla la carga de las portadas la tarjeta se ve igual', async () => {
      const raiz = await mostrar(usuario);
      pedido().flush({ message: 'x', codigo: 'ERROR' }, { status: 500, statusText: 'x' });
      await actualizar();

      expect(portadas()).toEqual([]);
      expect(raiz.querySelector('a.tablero')).not.toBeNull();
    });

    it('[Z] sin sesión no pide nada', async () => {
      await mostrar(null);

      expect(http.match(URL)).toHaveLength(0);
    });
  });

  describe('mis últimas 3 publicaciones con sus comentarios', () => {
    const pedidoDeLaLista = () =>
      http.expectOne(
        (s) => s.url === URL && s.params.get('usuario') === '1' && s.params.get('limit') === '12',
      );
    const pedidoDeComentarios = (id: string) =>
      http.expectOne((s) => s.url === `${URL}/${id}/comentarios`);
    const actualizar = async () => {
      fixture.detectChanges();
      await fixture.whenStable();
    };
    const articulos = () => fixture.nativeElement.querySelectorAll('article.ultima');
    const paginaDeComentarios = (cantidad: number): PaginaComentarios => ({
      datos: Array.from({ length: cantidad }, (_, i) =>
        comentarioDePrueba({ _id: `c${i + 1}`, mensaje: `Comentario ${i + 1}` }),
      ),
      offset: 0,
      limit: 3,
      hayMas: false,
    });
    const listado = (cantidad: number): PaginaPublicaciones => ({
      datos: Array.from({ length: cantidad }, (_, i) => publicacion(i + 1)),
      offset: 0,
      limit: 12,
      hayMas: cantidad > 3,
    });

    it('[O] muestra sólo las 3 más recientes, con su título, aunque haya más', async () => {
      await mostrar(usuario);
      pedidoDeLaLista().flush(listado(8));
      await actualizar();

      expect(articulos()).toHaveLength(3);
      expect(fixture.nativeElement.textContent).toContain('Mis últimas publicaciones');
      expect(articulos()[0].textContent).toContain('Título 1');
      expect(articulos()[2].textContent).toContain('Título 3');
    });

    it('[O] cada una pide y muestra sus propios últimos 3 comentarios', async () => {
      await mostrar(usuario);
      pedidoDeLaLista().flush(listado(2));
      await actualizar();

      const primera = pedidoDeComentarios('id1');
      expect(primera.request.params.get('limit')).toBe('3');
      expect(primera.request.params.get('offset')).toBe('0');
      primera.flush(paginaDeComentarios(3));
      pedidoDeComentarios('id2').flush(paginaDeComentarios(1));
      await actualizar();

      expect(articulos()[0].querySelectorAll('li.comentario')).toHaveLength(3);
      expect(articulos()[1].querySelectorAll('li.comentario')).toHaveLength(1);
      expect(articulos()[0].textContent).toContain('Comentario 1');
    });

    it('[I] enlaza a la publicación y a todos sus comentarios', async () => {
      await mostrar(usuario);
      pedidoDeLaLista().flush(listado(1));
      await actualizar();
      pedidoDeComentarios('id1').flush(paginaDeComentarios(2));
      await actualizar();

      const enlaces = Array.from(
        articulos()[0].querySelectorAll('a') as NodeListOf<HTMLAnchorElement>,
      ).map((a) => a.getAttribute('href'));

      expect(enlaces).toEqual(['/publicaciones/id1', '/publicaciones/id1']);
      expect(articulos()[0].textContent).toContain('Ver todos los comentarios (6)');
    });

    it('[Z] una publicación sin comentarios lo dice y no pide nada', async () => {
      await mostrar(usuario);
      pedidoDeLaLista().flush({
        ...listado(1),
        datos: [{ ...publicacion(1), cantidadComentarios: 0 }],
      });
      await actualizar();

      http.expectNone((s) => s.url.endsWith('/comentarios'));
      expect(articulos()[0].textContent).toContain('Todavía no tiene comentarios');
    });

    it('[E] si fallan los comentarios de una, las demás se siguen viendo', async () => {
      await mostrar(usuario);
      pedidoDeLaLista().flush(listado(2));
      await actualizar();

      pedidoDeComentarios('id1').flush(
        { message: 'x', codigo: 'E' },
        { status: 500, statusText: 'x' },
      );
      pedidoDeComentarios('id2').flush(paginaDeComentarios(2));
      await actualizar();

      expect(articulos()[0].textContent).toContain('No se pudieron cargar los comentarios');
      expect(articulos()[1].querySelectorAll('li.comentario')).toHaveLength(2);
    });

    it('[Z] sin publicaciones no muestra la sección', async () => {
      await mostrar(usuario);
      pedidoDeLaLista().flush(listado(0));
      await actualizar();

      expect(articulos()).toHaveLength(0);
      expect(fixture.nativeElement.textContent).not.toContain('Mis últimas publicaciones');
    });
  });

  describe('guardadas', () => {
    const guardadasUrl = `${environment.API_URL}/publicaciones/guardadas`;
    const portadas = () =>
      Array.from(
        fixture.nativeElement.querySelectorAll(
          'a[href="/perfil/guardadas"] .tablero-portada',
        ) as NodeListOf<HTMLImageElement>,
      ).map((imagen) => imagen.getAttribute('src'));

    it('[O] ofrece una tarjeta que lleva a las guardadas', async () => {
      const raiz = await mostrar(usuario);

      const tarjeta = raiz.querySelector('a.tablero[href="/perfil/guardadas"]') as HTMLElement;

      expect(tarjeta.textContent).toContain('Guardadas');
    });

    it('[O] su collage usa las portadas de las primeras guardadas con imagen', async () => {
      await mostrar(usuario);
      http
        .expectOne((s) => s.url === guardadasUrl && s.params.get('limit') === '12')
        .flush({
          datos: [
            { ...publicacion(1), imagen: 'https://cdn.test/a.jpg' },
            publicacion(2),
            { ...publicacion(3), imagen: 'https://cdn.test/b.jpg' },
          ],
          offset: 0,
          limit: 12,
          hayMas: false,
        });
      fixture.detectChanges();
      await fixture.whenStable();

      expect(portadas()).toEqual(['https://cdn.test/a.jpg', 'https://cdn.test/b.jpg']);
    });

    it('[E] si falla la carga la tarjeta se ve igual, con el collage vacío', async () => {
      const raiz = await mostrar(usuario);
      http
        .expectOne((s) => s.url === guardadasUrl)
        .flush({ message: 'x', codigo: 'E' }, { status: 500, statusText: 'x' });
      fixture.detectChanges();
      await fixture.whenStable();

      expect(portadas()).toEqual([]);
      expect(raiz.querySelector('a.tablero[href="/perfil/guardadas"]')).not.toBeNull();
    });
  });

  describe('editar el perfil', () => {
    it('[O] el lápiz lleva a la pantalla de edición', async () => {
      const pagina = await mostrar(usuario);

      const enlace = pagina.querySelector('a[href="/perfil/editar"]') as HTMLElement;

      expect(enlace.textContent).toContain('Editar mi perfil');
    });

    it('[Z] sin sesión no hay enlace de edición', async () => {
      const pagina = await mostrar(null);

      expect(pagina.querySelector('a[href="/perfil/editar"]')).toBeNull();
    });
  });
});
