import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { pruebasDeCargaAutomatica } from '../../../testing/carga-automatica';
import { proveerIdiomaDePrueba } from '../../../testing/idioma';
import { usuarioDePrueba } from '../../../testing/usuario';
import { Router, provideRouter } from '@angular/router';
import { Auth } from '../../servicios/auth/auth';
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

  const modal = () => fixture.nativeElement.querySelector('app-modal-confirmacion');
  const botonDe = (fila: number) => filas()[fila].querySelector('button') as HTMLButtonElement;
  const botonDelModal = (texto: string) =>
    Array.from(modal().querySelectorAll('button') as NodeListOf<HTMLButtonElement>).find((boton) =>
      boton.textContent?.includes(texto),
    )!;

  const pedidoDeCambio = (id: string) =>
    http.expectOne(
      (solicitud) =>
        (solicitud.method === 'DELETE' && solicitud.url === `${URL}/${id}`) ||
        (solicitud.method === 'POST' && solicitud.url === `${URL}/${id}/habilitar`),
    );
  const pedidosDeCambio = () =>
    http.match(
      (solicitud) =>
        solicitud.url !== URL && (solicitud.method === 'DELETE' || solicitud.method === 'POST'),
    );
  const terminarCambio = (numero: number, habilitado: boolean) =>
    pedidoDeCambio(`u${numero}`).flush(persona(numero, { habilitado }));

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
      'Acciones',
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

  describe('deshabilitar un usuario', () => {
    const botonesDeBaja = () =>
      Array.from(
        fixture.nativeElement.querySelectorAll('tbody button') as NodeListOf<HTMLButtonElement>,
      );

    beforeEach(() => {
      TestBed.inject(Auth).usuario.set({ ...usuarioDePrueba, _id: 'yo' });
    });

    it('[O] cada usuario habilitado tiene un botón Deshabilitar con el usuario en su etiqueta', async () => {
      await abrirCon([persona(1), persona(2)]);

      expect(botonesDeBaja()).toHaveLength(2);
      expect(botonDe(0).textContent).toContain('Deshabilitar');
      expect(botonDe(0).getAttribute('aria-label')).toBe('Deshabilitar a @persona_1');
    });

    it('[S] quien ya está deshabilitado no tiene el botón Deshabilitar sino Habilitar', async () => {
      await abrirCon([persona(1), persona(2, { habilitado: false })]);

      expect(botonDe(0).textContent).toContain('Deshabilitar');
      expect(botonDe(1).textContent).toContain('Habilitar');
      expect(botonDe(1).textContent).not.toContain('Deshabilitar');
    });

    it('[S] la propia cuenta no tiene el botón', async () => {
      await abrirCon([persona(1, { _id: 'yo' }), persona(2)]);

      expect(filas()[0].querySelector('button')).toBeNull();
      expect(botonDe(1)).not.toBeNull();
    });

    it('[I] al principio no hay ningún modal abierto', async () => {
      await abrirCon([persona(1)]);

      expect(modal()).toBeNull();
    });

    it('[O] el botón abre una confirmación con el nombre de usuario, sin pedir nada todavía', async () => {
      await abrirCon([persona(1)]);

      botonDe(0).click();
      await actualizar();

      expect(modal().textContent).toContain('¿Deshabilitar a @persona_1?');
      expect(pedidosDeCambio()).toHaveLength(0);
    });

    it('[S] Cancelar cierra la confirmación sin deshabilitar', async () => {
      await abrirCon([persona(1)]);
      botonDe(0).click();
      await actualizar();

      botonDelModal('Cancelar').click();
      await actualizar();

      expect(modal()).toBeNull();
      expect(filas()[0].textContent).toContain('Habilitado');
      expect(pedidosDeCambio()).toHaveLength(0);
    });

    it('[O] Confirmar manda un DELETE de ese usuario', async () => {
      await abrirCon([persona(1), persona(2)]);
      botonDe(1).click();
      await actualizar();

      botonDelModal('Deshabilitar').click();

      const solicitud = pedidoDeCambio('u2');
      expect(solicitud.request.method).toBe('DELETE');
      expect(solicitud.request.url).toBe(`${URL}/u2`);
      solicitud.flush(persona(2, { habilitado: false }));
    });

    it('[O] al terminar la fila pasa a Deshabilitado, sin recargar, y su botón pasa a Habilitar', async () => {
      await abrirCon([persona(1), persona(2)]);
      botonDe(0).click();
      await actualizar();

      botonDelModal('Deshabilitar').click();
      terminarCambio(1, false);
      await actualizar();

      const estado = filas()[0].querySelectorAll('.chip')[1] as HTMLElement;
      expect(estado.textContent).toContain('Deshabilitado');
      expect(estado.classList).not.toContain('activo');
      expect(botonDe(0).textContent?.trim()).toBe('Habilitar');
      expect(filas()[1].textContent).toContain('Habilitado');
      expect(modal()).toBeNull();
    });

    it('[O] avisa con el nombre de usuario que ya no puede ingresar', async () => {
      await abrirCon([persona(1)]);
      botonDe(0).click();
      await actualizar();

      botonDelModal('Deshabilitar').click();
      terminarCambio(1, false);
      await actualizar();

      expect(texto()).toContain('Usuario deshabilitado');
      expect(texto()).toContain('@persona_1 ya no puede ingresar');
      expect(fixture.nativeElement.querySelector('.aviso-info[role="status"]')).not.toBeNull();
    });

    it('[S] mientras espera la respuesta el modal queda bloqueado y no manda otro pedido', async () => {
      await abrirCon([persona(1)]);
      botonDe(0).click();
      await actualizar();

      botonDelModal('Deshabilitar').click();
      await actualizar();
      fixture.componentInstance.confirmar();

      expect(modal().textContent).toContain('Deshabilitando');
      expect(pedidosDeCambio()).toHaveLength(1);
    });

    it('[E] si la API falla cierra el modal, avisa y la fila sigue habilitada', async () => {
      await abrirCon([persona(1)]);
      botonDe(0).click();
      await actualizar();

      botonDelModal('Deshabilitar').click();
      pedidoDeCambio('u1').flush(
        { codigo: 'CUENTA_PROPIA' },
        { status: 400, statusText: 'Bad Request' },
      );
      await actualizar();

      expect(modal()).toBeNull();
      expect(texto()).toContain('No se pudo deshabilitar al usuario');
      expect(texto()).toContain('No podés cambiar el estado de tu propia cuenta');
      expect(filas()[0].textContent).toContain('Habilitado');
    });

    it('[E] si la persona ya no existe avisa que no existe', async () => {
      await abrirCon([persona(1)]);
      botonDe(0).click();
      await actualizar();

      botonDelModal('Deshabilitar').click();
      pedidoDeCambio('u1').flush(
        { codigo: 'USUARIO_NO_ENCONTRADO' },
        { status: 404, statusText: 'Not Found' },
      );
      await actualizar();

      expect(texto()).toContain('El usuario no existe');
    });

    it('[E] sin conexión avisa que no se pudo conectar y permite reintentar', async () => {
      await abrirCon([persona(1)]);
      botonDe(0).click();
      await actualizar();
      botonDelModal('Deshabilitar').click();
      pedidoDeCambio('u1').error(new ProgressEvent('error'), { status: 0 });
      await actualizar();

      expect(texto()).toContain('No se pudo conectar');
      botonDe(0).click();
      await actualizar();

      expect(modal()).not.toBeNull();
    });

    it('[S] abrir otra confirmación saca el aviso anterior', async () => {
      await abrirCon([persona(1), persona(2)]);
      botonDe(0).click();
      await actualizar();
      botonDelModal('Deshabilitar').click();
      terminarCambio(1, false);
      await actualizar();
      expect(texto()).toContain('ya no puede ingresar');

      botonDe(1).click();
      await actualizar();

      expect(texto()).not.toContain('ya no puede ingresar');
    });

    it('[S] la confirmación avisa con el diálogo accesible, sin usar alert', async () => {
      const alerta = vi.spyOn(window, 'confirm');
      await abrirCon([persona(1)]);

      botonDe(0).click();
      await actualizar();

      expect(modal().querySelector('[role="alertdialog"]')).not.toBeNull();
      expect(alerta).not.toHaveBeenCalled();
    });
  });

  describe('habilitar un usuario', () => {
    const abrirDeshabilitada = async () => {
      await abrirCon([persona(1, { habilitado: false }), persona(2)]);
      botonDe(0).click();
      await actualizar();
    };

    beforeEach(() => {
      TestBed.inject(Auth).usuario.set({ ...usuarioDePrueba, _id: 'yo' });
    });

    it('[O] cada usuario deshabilitado tiene un botón Habilitar con el usuario en su etiqueta', async () => {
      await abrirCon([persona(1, { habilitado: false })]);

      expect(botonDe(0).textContent).toContain('Habilitar');
      expect(botonDe(0).getAttribute('aria-label')).toBe('Habilitar a @persona_1');
    });

    it('[S] quien está habilitado no tiene el botón Habilitar', async () => {
      await abrirCon([persona(1)]);

      expect(botonDe(0).textContent).not.toMatch(/^\s*Habilitar/);
    });

    it('[O] el botón abre una confirmación con el nombre de usuario, sin pedir nada todavía', async () => {
      await abrirDeshabilitada();

      expect(modal().textContent).toContain('¿Habilitar a @persona_1?');
      expect(modal().textContent).toContain('Va a poder ingresar de nuevo');
      expect(pedidosDeCambio()).toHaveLength(0);
    });

    it('[I] la confirmación de habilitar no usa el estilo de peligro', async () => {
      await abrirDeshabilitada();

      expect(botonDelModal('Habilitar').classList).toContain('boton-principal');
      expect(botonDelModal('Habilitar').classList).not.toContain('boton-peligro');
    });

    it('[S] Cancelar cierra la confirmación sin habilitar', async () => {
      await abrirDeshabilitada();

      botonDelModal('Cancelar').click();
      await actualizar();

      expect(modal()).toBeNull();
      expect(filas()[0].textContent).toContain('Deshabilitado');
      expect(pedidosDeCambio()).toHaveLength(0);
    });

    it('[O] Confirmar manda un POST a /habilitar de ese usuario', async () => {
      await abrirDeshabilitada();

      botonDelModal('Habilitar').click();

      const solicitud = pedidoDeCambio('u1');
      expect(solicitud.request.method).toBe('POST');
      expect(solicitud.request.url).toBe(`${URL}/u1/habilitar`);
      solicitud.flush(persona(1, { habilitado: true }));
    });

    it('[O] al terminar la fila pasa a Habilitado, sin recargar, y su botón pasa a Deshabilitar', async () => {
      await abrirDeshabilitada();

      botonDelModal('Habilitar').click();
      terminarCambio(1, true);
      await actualizar();

      const estado = filas()[0].querySelectorAll('.chip')[1] as HTMLElement;
      expect(estado.textContent).toContain('Habilitado');
      expect(estado.classList).toContain('activo');
      expect(botonDe(0).textContent).toContain('Deshabilitar');
      expect(filas()[1].textContent).toContain('Habilitado');
      expect(modal()).toBeNull();
    });

    it('[O] avisa con el nombre de usuario que ya puede ingresar', async () => {
      await abrirDeshabilitada();

      botonDelModal('Habilitar').click();
      terminarCambio(1, true);
      await actualizar();

      expect(texto()).toContain('Usuario habilitado');
      expect(texto()).toContain('@persona_1 ya puede ingresar');
      expect(fixture.nativeElement.querySelector('.aviso-info[role="status"]')).not.toBeNull();
    });

    it('[S] mientras espera la respuesta el modal queda bloqueado y no manda otro pedido', async () => {
      await abrirDeshabilitada();

      botonDelModal('Habilitar').click();
      await actualizar();
      fixture.componentInstance.confirmar();

      expect(modal().textContent).toContain('Habilitando');
      expect(pedidosDeCambio()).toHaveLength(1);
    });

    it('[E] si la persona ya no existe avisa que no se pudo habilitar y que no existe', async () => {
      await abrirDeshabilitada();

      botonDelModal('Habilitar').click();
      pedidoDeCambio('u1').flush(
        { codigo: 'USUARIO_NO_ENCONTRADO' },
        { status: 404, statusText: 'Not Found' },
      );
      await actualizar();

      expect(modal()).toBeNull();
      expect(texto()).toContain('No se pudo habilitar al usuario');
      expect(texto()).toContain('El usuario no existe');
      expect(filas()[0].textContent).toContain('Deshabilitado');
    });

    it('[E] sin conexión avisa y permite reintentar', async () => {
      await abrirDeshabilitada();
      botonDelModal('Habilitar').click();
      pedidoDeCambio('u1').error(new ProgressEvent('error'), { status: 0 });
      await actualizar();

      expect(texto()).toContain('No se pudo conectar');
      botonDe(0).click();
      await actualizar();

      expect(modal()).not.toBeNull();
    });

    it('[S] deshabilitar y volver a habilitar a la misma persona deja la fila como estaba', async () => {
      await abrirCon([persona(1)]);
      botonDe(0).click();
      await actualizar();
      botonDelModal('Deshabilitar').click();
      terminarCambio(1, false);
      await actualizar();

      botonDe(0).click();
      await actualizar();
      botonDelModal('Habilitar').click();
      terminarCambio(1, true);
      await actualizar();

      expect(filas()[0].textContent).toContain('Habilitado');
      expect(botonDe(0).textContent).toContain('Deshabilitar');
    });

    it('[S] mostrar un aviso nuevo saca el anterior', async () => {
      await abrirDeshabilitada();
      botonDelModal('Habilitar').click();
      terminarCambio(1, true);
      await actualizar();
      expect(texto()).toContain('ya puede ingresar');

      botonDe(1).click();
      await actualizar();

      expect(texto()).not.toContain('ya puede ingresar');
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
