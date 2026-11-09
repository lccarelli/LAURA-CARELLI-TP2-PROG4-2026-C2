import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { PaginaPublicaciones, Publicacion } from '../../interfaces/publicacion';
import { Usuario } from '../../interfaces/usuario';
import { Auth } from '../../servicios/auth/auth';
import { Idioma } from '../../servicios/idioma/idioma';
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
  fecha: '2026-10-22T15:30:00.000Z',
});

const pagina = (cantidad: number): PaginaPublicaciones => ({
  datos: Array.from({ length: cantidad }, (_, i) => publicacion(i + 1)),
  offset: 0,
  limit: 3,
  hayMas: false,
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
    expect(texto).toContain('usuario');
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

  it('[I] la fecha de nacimiento no se corre un día por la zona horaria', async () => {
    const pagina = await mostrar(usuario);

    expect(pagina.textContent).toContain('20/05/1990');
  });

  it('[I] no muestra ningún dato de clave', async () => {
    const texto = (await mostrar(usuario)).textContent!.toLowerCase();

    expect(texto).not.toContain('clave');
    expect(texto).not.toContain('contraseña');
  });

  describe('mis últimas publicaciones', () => {
    const pedido = () =>
      http.expectOne(
        (solicitud) =>
          solicitud.url === URL &&
          solicitud.params.get('usuario') === '1' &&
          solicitud.params.get('limit') === '3' &&
          solicitud.params.get('offset') === '0' &&
          solicitud.params.get('orden') === 'fecha',
      );
    const actualizar = async () => {
      fixture.detectChanges();
      await fixture.whenStable();
    };
    const tarjetas = () => fixture.nativeElement.querySelectorAll('app-tarjeta-publicacion');
    const texto = () => fixture.nativeElement.textContent as string;

    it('[O] pide sólo las 3 más recientes de la persona de la sesión', async () => {
      await mostrar(usuario);

      pedido().flush(pagina(3));
    });

    it('[O] las muestra con la misma tarjeta, con sus me gusta y su cantidad de comentarios', async () => {
      await mostrar(usuario);
      pedido().flush(pagina(3));
      await actualizar();

      expect(tarjetas()).toHaveLength(3);
      expect(texto()).toContain('Mis últimas publicaciones');
      expect(texto()).toContain('Título 1');
      const etiquetas = Array.from(
        tarjetas()[0].querySelectorAll('.metrica') as NodeListOf<HTMLElement>,
      ).map((metrica) => metrica.getAttribute('aria-label'));
      expect(etiquetas).toEqual(['Dar me gusta (4)', '6 comentarios']);
    });

    it('[Z] mientras carga muestra Cargando y no el aviso de vacío', async () => {
      await mostrar(usuario);

      expect(texto()).toContain('Cargando');
      expect(texto()).not.toContain('Todavía no publicaste nada');
      pedido().flush(pagina(0));
    });

    it('[Z] sin publicaciones lo dice y ofrece crear la primera', async () => {
      await mostrar(usuario);
      pedido().flush(pagina(0));
      await actualizar();

      expect(texto()).toContain('Todavía no publicaste nada');
      const enlace = fixture.nativeElement.querySelector(
        'a[href="/publicaciones/nueva"]',
      ) as HTMLAnchorElement;
      expect(enlace.textContent).toContain('Crear mi primera publicación');
    });

    it('[B] con una o dos publicaciones muestra sólo esas', async () => {
      await mostrar(usuario);
      pedido().flush(pagina(2));
      await actualizar();

      expect(tarjetas()).toHaveLength(2);
      expect(texto()).not.toContain('Todavía no publicaste nada');
    });

    it('[E] si falla la carga avisa, no dice que no hay publicaciones y se puede reintentar', async () => {
      await mostrar(usuario);
      pedido().flush({ codigo: 'TOKEN_INVALIDO' }, { status: 401, statusText: 'Unauthorized' });
      await actualizar();

      expect(fixture.nativeElement.querySelector('app-aviso')).not.toBeNull();
      expect(texto()).not.toContain('Todavía no publicaste nada');

      (
        fixture.nativeElement.querySelector('app-aviso .boton-secundario') as HTMLButtonElement
      ).click();
      pedido().flush(pagina(1));
      await actualizar();

      expect(fixture.nativeElement.querySelector('app-aviso')).toBeNull();
      expect(tarjetas()).toHaveLength(1);
    });

    it('[E] un corte de red muestra el aviso de conexión', async () => {
      await mostrar(usuario);
      pedido().error(new ProgressEvent('error'));
      await actualizar();

      expect(fixture.nativeElement.querySelector('app-aviso')).not.toBeNull();
    });

    it('[Z] sin sesión no pide nada', async () => {
      await mostrar(null);

      http.expectNone((solicitud) => solicitud.url === URL);
    });

    it('[S] al eliminar una de las tres, vuelve a pedir para traer la siguiente más reciente', async () => {
      await mostrar(usuario);
      pedido().flush(pagina(3));
      await actualizar();

      (tarjetas()[0].querySelector('.boton-eliminar') as HTMLButtonElement).click();
      await actualizar();
      (
        tarjetas()[0].querySelector('.pin-confirmar .boton-mini-peligro') as HTMLButtonElement
      ).click();
      http
        .expectOne({ method: 'DELETE', url: `${URL}/id1` })
        .flush(null, { status: 204, statusText: 'No Content' });
      const otra = pagina(3);
      otra.datos = [publicacion(2), publicacion(3), publicacion(4)];
      pedido().flush(otra);
      await actualizar();

      expect(texto()).not.toContain('Título 1');
      expect(texto()).toContain('Título 4');
      expect(tarjetas()).toHaveLength(3);
    });

    it('[S] al salir de la pantalla cancela el pedido pendiente', async () => {
      await mostrar(usuario);
      const pendiente = pedido();

      fixture.destroy();

      expect(pendiente.cancelled).toBe(true);
    });
  });
});
