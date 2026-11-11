import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { pruebasDeCargaAutomatica } from '../../../testing/carga-automatica';
import { proveerIdiomaDePrueba } from '../../../testing/idioma';
import { usuarioDePrueba } from '../../../testing/usuario';
import { Router, provideRouter } from '@angular/router';
import { PaginaUsuarios, Usuario } from '../../interfaces/usuario';
import { DashboardUsuarios } from './dashboard-usuarios';

const URL = `${environment.API_URL}/usuarios`;

const persona = (numero: number, cambios: Partial<Usuario> = {}): Usuario => ({
  ...usuarioDePrueba,
  _id: `u${numero}`,
  nombre: `Nombre${numero}`,
  apellido: `Apellido${numero}`,
  correo: `persona${numero}@correo.com`,
  nombreUsuario: `persona_${numero}`,
  ...cambios,
});

const pagina = (desde: number, cantidad: number, hayMas: boolean): PaginaUsuarios => ({
  datos: Array.from({ length: cantidad }, (_, i) => persona(desde + i)),
  offset: desde - 1,
  limit: 10,
  hayMas,
});

describe('DashboardUsuarios', () => {
  let fixture: ComponentFixture<DashboardUsuarios>;
  let http: HttpTestingController;

  const pedir = (offset: number) =>
    http.expectOne(
      (solicitud) =>
        solicitud.url === URL &&
        solicitud.params.get('offset') === String(offset) &&
        solicitud.params.get('limit') === '10',
    );

  const pedidos = () => http.match((solicitud) => solicitud.url === URL);
  const texto = () => fixture.nativeElement.textContent as string;
  const filas = () => fixture.nativeElement.querySelectorAll('tbody tr') as NodeListOf<HTMLElement>;
  const botonVerMas = () =>
    Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((boton) => boton.textContent?.includes('Ver más'));

  const actualizar = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
  };

  const abrirCon = async (usuarios: Usuario[], hayMas = false) => {
    pedir(0).flush({ datos: usuarios, offset: 0, limit: 10, hayMas });
    await actualizar();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardUsuarios],
      providers: [
        proveerIdiomaDePrueba(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DashboardUsuarios);
    await fixture.whenStable();
  });

  it('[I] la primera carga pide offset 0 y limit 10', () => {
    const solicitud = pedir(0);

    expect(solicitud.request.method).toBe('GET');
    solicitud.flush(pagina(1, 0, false));
  });

  it('[O] muestra una fila por usuario con nombre, usuario y correo', async () => {
    await abrirCon([persona(1), persona(2)]);

    expect(filas()).toHaveLength(2);
    expect(filas()[0].textContent).toContain('Nombre1 Apellido1');
    expect(filas()[0].textContent).toContain('@persona_1');
    expect(filas()[0].textContent).toContain('persona1@correo.com');
  });

  it('[O] las columnas llevan su nombre', async () => {
    await abrirCon([persona(1)]);

    const encabezados = Array.from(
      fixture.nativeElement.querySelectorAll('th') as NodeListOf<HTMLElement>,
    );

    expect(encabezados.map((th) => th.textContent?.trim()).filter(Boolean)).toEqual([
      'Nombre',
      'Usuario',
      'Correo',
      'Perfil',
      'Estado',
    ]);
    expect(encabezados[0].getAttribute('aria-label')).toBe('Foto');
  });

  it('[S] muestra el perfil de cada persona', async () => {
    await abrirCon([persona(1), persona(2, { perfil: 'administrador' })]);

    expect(filas()[0].textContent).toContain('usuario');
    expect(filas()[1].textContent).toContain('administrador');
  });

  it('[S] distingue a quien está habilitado de quien no', async () => {
    await abrirCon([persona(1), persona(2, { habilitado: false })]);

    const estado = (fila: number) => filas()[fila].querySelectorAll('.chip')[1] as HTMLElement;

    expect(estado(0).textContent).toContain('Habilitado');
    expect(estado(0).classList).toContain('activo');
    expect(estado(1).textContent).toContain('Deshabilitado');
    expect(estado(1).classList).not.toContain('activo');
  });

  it('[S] sin foto usa la imagen por defecto y con foto, la suya', async () => {
    await abrirCon([persona(1), persona(2, { imagenPerfil: 'https://imagenes.test/foto.png' })]);

    const fotos = fixture.nativeElement.querySelectorAll(
      'tbody img',
    ) as NodeListOf<HTMLImageElement>;

    expect(fotos[0].getAttribute('src')).toBe('/sin-foto.svg');
    expect(fotos[1].getAttribute('src')).toBe('https://imagenes.test/foto.png');
    expect(fotos[0].alt).toBe('Foto de persona_1');
  });

  it('[S] nunca muestra la clave aunque llegara en la respuesta', async () => {
    await abrirCon([{ ...persona(1), clave: 'secreta' } as Usuario]);

    expect(texto()).not.toContain('secreta');
  });

  it('[Z] sin usuarios avisa que todavía no hay y no muestra la tabla', async () => {
    await abrirCon([]);

    expect(texto()).toContain('Todavía no hay usuarios');
    expect(fixture.nativeElement.querySelector('table')).toBeNull();
    expect(botonVerMas()).toBeUndefined();
  });

  it('[Z] mientras carga muestra Cargando y no el aviso de vacío', async () => {
    await actualizar();

    expect(texto()).toContain('Cargando');
    expect(texto()).not.toContain('Todavía no hay usuarios');
    pedir(0).flush(pagina(1, 0, false));
  });

  it('[E] si la primera carga falla, no dice que no hay usuarios', async () => {
    pedir(0).flush({ codigo: 'NO_ES_ADMINISTRADOR' }, { status: 403, statusText: 'Forbidden' });
    await actualizar();

    expect(fixture.nativeElement.querySelector('app-aviso')).not.toBeNull();
    expect(texto()).toContain('Esta sección es sólo para administradores');
    expect(texto()).not.toContain('Todavía no hay usuarios');
  });

  it('[M] Ver más trae la página siguiente y conserva las anteriores', async () => {
    await abrirCon(pagina(1, 10, true).datos, true);

    botonVerMas()!.click();
    pedir(10).flush(pagina(11, 2, false));
    await actualizar();

    expect(filas()).toHaveLength(12);
    expect(texto()).toContain('@persona_1');
    expect(texto()).toContain('@persona_12');
  });

  it('[M] no repite a un usuario que ya estaba en la lista', async () => {
    await abrirCon(pagina(1, 10, true).datos, true);

    botonVerMas()!.click();
    pedir(10).flush(pagina(10, 2, false));
    await actualizar();

    expect(filas()).toHaveLength(11);
  });

  it('[B] cuando no hay más páginas desaparece Ver más', async () => {
    await abrirCon(pagina(1, 10, true).datos, true);
    expect(botonVerMas()).toBeDefined();

    botonVerMas()!.click();
    pedir(10).flush(pagina(11, 3, false));
    await actualizar();

    expect(botonVerMas()).toBeUndefined();
  });

  it('[E] si una página falla conserva lo cargado y avisa', async () => {
    await abrirCon(pagina(1, 10, true).datos, true);

    botonVerMas()!.click();
    pedir(10).flush({ codigo: 'TOKEN_INVALIDO' }, { status: 401, statusText: 'Unauthorized' });
    await actualizar();

    expect(fixture.nativeElement.querySelector('app-aviso')).not.toBeNull();
    expect(filas()).toHaveLength(10);
  });

  it('[S] mientras espera una página no pide otra', async () => {
    await abrirCon(pagina(1, 10, true).datos, true);

    fixture.componentInstance.listado.cargarMas();
    fixture.componentInstance.listado.cargarMas();

    expect(pedidos()).toHaveLength(1);
  });

  describe('crear un usuario', () => {
    const enlaceCrear = () =>
      fixture.nativeElement.querySelector(
        'a[href="/dashboard/usuarios/nuevo"]',
      ) as HTMLAnchorElement;

    const abrirConAviso = async (creado: string) => {
      pedir(0).flush(pagina(1, 0, false));
      vi.spyOn(TestBed.inject(Router), 'currentNavigation').mockReturnValue({
        extras: { state: { creado } },
      } as never);
      fixture = TestBed.createComponent(DashboardUsuarios);
      await fixture.whenStable();
      pedir(0).flush(pagina(1, 1, false));
      await actualizar();
    };

    it('[I] el botón Crear usuario es un enlace a otra página, no abre un formulario acá', async () => {
      await abrirCon([persona(1)]);

      expect(enlaceCrear().textContent).toContain('Crear usuario');
      expect(fixture.nativeElement.querySelector('form')).toBeNull();
    });

    it('[I] el botón está arriba, junto al título, antes de la tabla', async () => {
      await abrirCon([persona(1)]);

      const encabezado = fixture.nativeElement.querySelector('.encabezado-pagina') as HTMLElement;

      expect(encabezado.contains(enlaceCrear())).toBe(true);
      expect(encabezado.querySelector('h1')!.textContent).toContain('Usuarios');
    });

    it('[Z] sin haber creado a nadie no muestra ningún aviso de creación', async () => {
      await abrirCon([persona(1)]);

      expect(texto()).not.toContain('Usuario creado');
    });

    it('[O] al volver de crear a alguien avisa con su nombre de usuario', async () => {
      await abrirConAviso('nueva_p');

      expect(texto()).toContain('Usuario creado');
      expect(texto()).toContain('@nueva_p');
    });

    it('[S] el aviso de creación se puede cerrar', async () => {
      await abrirConAviso('nueva_p');

      (fixture.nativeElement.querySelector('app-aviso .boton-icono') as HTMLButtonElement).click();
      await actualizar();

      expect(texto()).not.toContain('Usuario creado');
    });

    it('[S] el aviso de creación avisa como estado, no como error', async () => {
      await abrirConAviso('nueva_p');

      expect(fixture.nativeElement.querySelector('.aviso-info[role="status"]')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
    });
  });

  pruebasDeCargaAutomatica('los usuarios', {
    pedir,
    pedidos,
    pagina,
    cargados: () => filas().length,
    botonVerMas,
    actualizar,
  });
});
