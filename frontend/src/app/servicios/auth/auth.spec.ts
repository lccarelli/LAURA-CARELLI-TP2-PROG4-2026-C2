import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { Sesion } from '../../interfaces/sesion';
import { tokenQueVenceEn } from '../../../testing/token';
import { Auth } from './auth';

const sesion: Sesion = {
  token: 'token-de-prueba',
  usuario: {
    _id: '1',
    nombre: 'Laura',
    apellido: 'Carelli',
    correo: 'laura@correo.com',
    nombreUsuario: 'laura_c',
    fechaNacimiento: '1990-05-20T00:00:00.000Z',
    descripcion: 'Hola',
    perfil: 'usuario',
    habilitado: true,
  },
};

function crearAuth() {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting()],
  });
  return {
    auth: TestBed.inject(Auth),
    http: TestBed.inject(HttpTestingController),
  };
}

describe('Auth', () => {
  beforeEach(() => localStorage.clear());

  describe('registro', () => {
    it('[Z] sin sesión guardada no hay token ni usuario', () => {
      const { auth } = crearAuth();

      expect(auth.token()).toBeNull();
      expect(auth.usuario()).toBeNull();
    });

    it('[O] registrar guarda el token y el usuario', () => {
      const { auth, http } = crearAuth();

      auth.registro(new FormData()).subscribe();
      http.expectOne(`${environment.API_URL}/auth/registro`).flush(sesion);

      expect(auth.token()).toBe('token-de-prueba');
      expect(auth.usuario()?.nombreUsuario).toBe('laura_c');
      expect(localStorage.getItem('token')).toBe('token-de-prueba');
    });

    it('[I] envía un POST con los datos del formulario', () => {
      const { auth, http } = crearAuth();
      const datos = new FormData();
      datos.append('nombre', 'Laura');

      auth.registro(datos).subscribe();
      const solicitud = http.expectOne(`${environment.API_URL}/auth/registro`);

      expect(solicitud.request.method).toBe('POST');
      expect(solicitud.request.body).toBe(datos);
      solicitud.flush(sesion);
    });

    it('[E] si la API responde con error no guarda nada', () => {
      const { auth, http } = crearAuth();

      auth.registro(new FormData()).subscribe({ error: () => undefined });
      http
        .expectOne(`${environment.API_URL}/auth/registro`)
        .flush({ message: 'x' }, { status: 409, statusText: 'Conflict' });

      expect(auth.token()).toBeNull();
      expect(localStorage.getItem('token')).toBeNull();
    });
  });

  describe('google', () => {
    it('[O] manda la credencial a /auth/google y guarda el token y el usuario', () => {
      const { auth, http } = crearAuth();

      auth.google('credencial-de-google').subscribe();
      const solicitud = http.expectOne(`${environment.API_URL}/auth/google`);
      solicitud.flush(sesion);

      expect(solicitud.request.method).toBe('POST');
      expect(solicitud.request.body).toEqual({ credencial: 'credencial-de-google' });
      expect(auth.token()).toBe('token-de-prueba');
      expect(auth.usuario()?.nombreUsuario).toBe('laura_c');
      expect(localStorage.getItem('token')).toBe('token-de-prueba');
    });

    it('[E] si el servidor rechaza, no guarda ninguna sesión', () => {
      const { auth, http } = crearAuth();

      auth.google('falsa').subscribe({ error: () => undefined });
      http
        .expectOne(`${environment.API_URL}/auth/google`)
        .flush({ codigo: 'GOOGLE_CREDENCIAL_INVALIDA' }, { status: 401, statusText: 'x' });

      expect(auth.token()).toBeNull();
      expect(auth.usuario()).toBeNull();
    });

    it('[S] una cuenta de Google puede venir sin fecha de nacimiento ni descripción', () => {
      const { auth, http } = crearAuth();
      const sinEsosDatos = {
        ...sesion.usuario,
        fechaNacimiento: undefined,
        descripcion: undefined,
      };

      auth.google('c').subscribe();
      http
        .expectOne(`${environment.API_URL}/auth/google`)
        .flush({ ...sesion, usuario: sinEsosDatos });

      expect(auth.usuario()?.fechaNacimiento).toBeUndefined();
      expect(auth.usuario()?.descripcion).toBeUndefined();
    });
  });

  describe('destinoAlIngresar', () => {
    it.each([
      [null, '/home'],
      ['/publicaciones/abc', '/publicaciones/abc'],
      ['//sitio-ajeno.test', '/home'],
      ['https://sitio-ajeno.test', '/home'],
    ])('[S] con volverA = %j va a %s', (volverA, esperado) => {
      const { auth } = crearAuth();
      auth.volverA.set(volverA);

      expect(auth.destinoAlIngresar()).toBe(esperado);
      expect(auth.volverA()).toBeNull();
    });
  });

  describe('ingresar', () => {
    it('[O] ingresar guarda el token y el usuario', () => {
      const { auth, http } = crearAuth();

      auth.ingresar('laura_c', 'Clave1234').subscribe();
      http.expectOne(`${environment.API_URL}/auth/ingresar`).flush(sesion);

      expect(auth.token()).toBe('token-de-prueba');
      expect(auth.usuario()?.nombreUsuario).toBe('laura_c');
    });

    it('[I] envía un POST con el identificador y la clave', () => {
      const { auth, http } = crearAuth();

      auth.ingresar('laura_c', 'Clave1234').subscribe();
      const solicitud = http.expectOne(`${environment.API_URL}/auth/ingresar`);

      expect(solicitud.request.method).toBe('POST');
      expect(solicitud.request.body).toEqual({
        identificador: 'laura_c',
        clave: 'Clave1234',
      });
      solicitud.flush(sesion);
    });

    it('[E] con credenciales incorrectas no guarda nada', () => {
      const { auth, http } = crearAuth();

      auth.ingresar('laura_c', 'mala').subscribe({ error: () => undefined });
      http
        .expectOne(`${environment.API_URL}/auth/ingresar`)
        .flush({ message: 'Credenciales inválidas' }, { status: 401, statusText: 'Unauthorized' });

      expect(auth.token()).toBeNull();
      expect(localStorage.getItem('token')).toBeNull();
    });
  });

  describe('refrescar', () => {
    it('[O] pide un token nuevo, lo guarda y conserva al usuario', () => {
      const { auth, http } = crearAuth();
      auth.token.set('viejo');
      auth.usuario.set(sesion.usuario);

      auth.refrescar().subscribe();
      const pedido = http.expectOne(`${environment.API_URL}/auth/refrescar`);
      pedido.flush({ token: 'nuevo' });

      expect(pedido.request.method).toBe('POST');
      expect(auth.token()).toBe('nuevo');
      expect(localStorage.getItem('token')).toBe('nuevo');
      expect(auth.usuario()?.nombreUsuario).toBe('laura_c');
    });

    it('[E] si el token ya venció no borra lo que había', () => {
      const { auth, http } = crearAuth();
      auth.token.set('viejo');
      localStorage.setItem('token', 'viejo');

      auth.refrescar().subscribe({ error: () => undefined });
      http
        .expectOne(`${environment.API_URL}/auth/refrescar`)
        .flush({ codigo: 'TOKEN_INVALIDO' }, { status: 401, statusText: 'Unauthorized' });

      expect(auth.token()).toBe('viejo');
      expect(localStorage.getItem('token')).toBe('viejo');
    });
  });

  describe('autorizar', () => {
    it('[O] valida el token, guarda los datos actuales y conserva el token', () => {
      const { auth, http } = crearAuth();
      auth.token.set('vigente');

      auth.autorizar().subscribe();
      const pedido = http.expectOne(`${environment.API_URL}/auth/autorizar`);
      pedido.flush({ usuario: { ...sesion.usuario, nombre: 'Laurita' } });

      expect(pedido.request.method).toBe('POST');
      expect(auth.usuario()?.nombre).toBe('Laurita');
      expect(JSON.parse(localStorage.getItem('usuario') ?? '{}').nombre).toBe('Laurita');
      expect(auth.token()).toBe('vigente');
    });

    it('[E] si el token no sirve (401) no cambia nada guardado', () => {
      const { auth, http } = crearAuth();
      auth.token.set('vencido');
      auth.usuario.set(sesion.usuario);

      auth.autorizar().subscribe({ error: () => undefined });
      http
        .expectOne(`${environment.API_URL}/auth/autorizar`)
        .flush({ codigo: 'TOKEN_INVALIDO' }, { status: 401, statusText: 'Unauthorized' });

      expect(auth.usuario()?.nombre).toBe('Laura');
      expect(auth.token()).toBe('vencido');
    });
  });

  describe('accesoDocente', () => {
    it('[O] pide el acceso sin datos, guarda la sesión que devuelve y la deja lista para usar', () => {
      const { auth, http } = crearAuth();

      auth.accesoDocente().subscribe();
      const pedido = http.expectOne(`${environment.API_URL}/auth/acceso-docente`);
      pedido.flush({ ...sesion, usuario: { ...sesion.usuario, perfil: 'administrador' } });

      expect(pedido.request.method).toBe('POST');
      expect(pedido.request.body).toEqual({});
      expect(auth.token()).toBe('token-de-prueba');
      expect(auth.usuario()?.perfil).toBe('administrador');
      expect(JSON.parse(localStorage.getItem('usuario') ?? '{}').perfil).toBe('administrador');
    });

    it('[E] si no está disponible no guarda nada', () => {
      const { auth, http } = crearAuth();

      auth.accesoDocente().subscribe({ error: () => undefined });
      http
        .expectOne(`${environment.API_URL}/auth/acceso-docente`)
        .flush({ codigo: 'ACCESO_DOCENTE_NO_DISPONIBLE' }, { status: 404, statusText: 'x' });

      expect(auth.token()).toBeNull();
      expect(auth.usuario()).toBeNull();
    });
  });

  describe('editarPerfil', () => {
    it('[O] envía el formulario por PUT, guarda el usuario devuelto y conserva el token', () => {
      const { auth, http } = crearAuth();
      auth.token.set('vigente');
      auth.usuario.set(sesion.usuario);
      const datos = new FormData();

      auth.editarPerfil(datos).subscribe();
      const pedido = http.expectOne(`${environment.API_URL}/usuarios/yo`);
      pedido.flush({ ...sesion.usuario, nombre: 'Ana' });

      expect(pedido.request.method).toBe('PUT');
      expect(pedido.request.body).toBe(datos);
      expect(auth.usuario()?.nombre).toBe('Ana');
      expect(JSON.parse(localStorage.getItem('usuario') ?? '{}').nombre).toBe('Ana');
      expect(auth.token()).toBe('vigente');
    });

    it('[E] si falla (400) no cambia el usuario guardado', () => {
      const { auth, http } = crearAuth();
      auth.usuario.set(sesion.usuario);

      auth.editarPerfil(new FormData()).subscribe({ error: () => undefined });
      http
        .expectOne(`${environment.API_URL}/usuarios/yo`)
        .flush({ codigo: 'X' }, { status: 400, statusText: 'Bad Request' });

      expect(auth.usuario()?.nombre).toBe('Laura');
    });
  });

  describe('despertarServidor', () => {
    it('[I] hace un GET a la ruta de salud', () => {
      const { auth, http } = crearAuth();

      auth.despertarServidor().subscribe();
      const pedido = http.expectOne(`${environment.API_URL}/health`);
      pedido.flush({ status: 'ok' });

      expect(pedido.request.method).toBe('GET');
    });
  });

  describe('motivo de salida', () => {
    it('[Z] al iniciar no hay motivo', () => {
      const { auth } = crearAuth();

      expect(auth.motivoDeSalida()).toBeNull();
    });

    it('[O] salir con un motivo lo guarda para mostrarlo en el login', () => {
      const { auth } = crearAuth();

      auth.salir('api.SESION_VENCIDA');

      expect(auth.motivoDeSalida()).toBe('api.SESION_VENCIDA');
    });

    it('[I] salir sin motivo, como al apretar Salir, no deja ninguno', () => {
      const { auth } = crearAuth();
      auth.salir('api.SESION_VENCIDA');

      auth.salir();

      expect(auth.motivoDeSalida()).toBeNull();
    });

    it('[S] al ingresar de nuevo el motivo se borra', () => {
      const { auth, http } = crearAuth();
      auth.salir('api.SESION_VENCIDA');

      auth.ingresar('laura_c', 'Clave1234').subscribe();
      http.expectOne(`${environment.API_URL}/auth/ingresar`).flush(sesion);

      expect(auth.motivoDeSalida()).toBeNull();
    });
  });

  describe('vencimiento', () => {
    it('[Z] sin token no hay vencimiento', () => {
      const { auth } = crearAuth();

      expect(auth.vencimiento()).toBeNull();
    });

    it('[O] lee el vencimiento del token en milisegundos', () => {
      const { auth } = crearAuth();
      const ahora = Date.now();

      auth.token.set(tokenQueVenceEn(900, ahora));

      expect(auth.vencimiento()).toBe(Math.floor(ahora / 1000) * 1000 + 900 * 1000);
    });

    it.each(['no-es-un-token', 'a.b.c', 'a..c', 'a.e30.c'])(
      '[E] un token que no se puede leer (%s) no tiene vencimiento',
      (token) => {
        const { auth } = crearAuth();

        auth.token.set(token);

        expect(auth.vencimiento()).toBeNull();
      },
    );

    it('[S] al cambiar el token cambia el vencimiento', () => {
      const { auth } = crearAuth();
      auth.token.set(tokenQueVenceEn(60));
      const primero = auth.vencimiento();

      auth.token.set(tokenQueVenceEn(900));

      expect(auth.vencimiento()).toBeGreaterThan(primero ?? 0);
    });

    it('[S] al salir ya no hay vencimiento', () => {
      const { auth } = crearAuth();
      auth.token.set(tokenQueVenceEn(60));

      auth.salir();

      expect(auth.vencimiento()).toBeNull();
    });
  });

  describe('salir', () => {
    it('[Z] salir sin sesión no falla', () => {
      const { auth } = crearAuth();

      expect(() => auth.salir()).not.toThrow();
      expect(auth.token()).toBeNull();
    });

    it('[O] salir borra la sesión de la memoria y del almacenamiento', () => {
      localStorage.setItem('token', sesion.token);
      localStorage.setItem('usuario', JSON.stringify(sesion.usuario));
      const { auth } = crearAuth();

      auth.salir();

      expect(auth.token()).toBeNull();
      expect(auth.usuario()).toBeNull();
      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('usuario')).toBeNull();
    });
  });

  describe('sesión guardada', () => {
    it('[S] recupera la sesión del almacenamiento al iniciar', () => {
      localStorage.setItem('token', sesion.token);
      localStorage.setItem('usuario', JSON.stringify(sesion.usuario));

      const { auth } = crearAuth();

      expect(auth.token()).toBe('token-de-prueba');
      expect(auth.usuario()?.correo).toBe('laura@correo.com');
    });

    it('[E] un usuario guardado con formato roto se ignora', () => {
      localStorage.setItem('usuario', '{roto');

      const { auth } = crearAuth();

      expect(auth.usuario()).toBeNull();
    });
  });

  describe('almacenamiento no disponible', () => {
    const bloquear = (metodo: 'getItem' | 'setItem' | 'removeItem') =>
      vi.spyOn(Storage.prototype, metodo).mockImplementation(() => {
        throw new Error('bloqueado');
      });

    afterEach(() => vi.restoreAllMocks());

    it('[E] si no se puede leer, arranca sin sesión en lugar de romper', () => {
      bloquear('getItem');

      const { auth } = crearAuth();

      expect(auth.token()).toBeNull();
      expect(auth.usuario()).toBeNull();
    });

    it('[E] si no se puede escribir, ingresar deja la sesión en memoria', () => {
      bloquear('setItem');
      const { auth, http } = crearAuth();

      auth.ingresar('laura_c', 'Clave1234').subscribe();
      http.expectOne(`${environment.API_URL}/auth/ingresar`).flush(sesion);

      expect(auth.token()).toBe('token-de-prueba');
      expect(auth.usuario()?.nombreUsuario).toBe('laura_c');
    });

    it('[E] si no se puede escribir, refrescar deja el token nuevo en memoria', () => {
      bloquear('setItem');
      const { auth, http } = crearAuth();

      auth.refrescar().subscribe();
      http.expectOne(`${environment.API_URL}/auth/refrescar`).flush({ token: 'nuevo' });

      expect(auth.token()).toBe('nuevo');
    });

    it('[E] si no se puede borrar, salir limpia igual la memoria', () => {
      const { auth } = crearAuth();
      auth.token.set('vigente');
      bloquear('removeItem');

      auth.salir();

      expect(auth.token()).toBeNull();
      expect(auth.usuario()).toBeNull();
    });

    it('[E] sin almacenamiento, sincronizar no cierra la sesión que está en memoria', () => {
      bloquear('setItem');
      const { auth, http } = crearAuth();
      auth.ingresar('laura_c', 'Clave1234').subscribe();
      http.expectOne(`${environment.API_URL}/auth/ingresar`).flush(sesion);

      auth.sincronizar();

      expect(auth.token()).toBe('token-de-prueba');
    });
  });

  describe('sincronizar', () => {
    it('[Z] sin sesión en ningún lado no cambia nada', () => {
      const { auth } = crearAuth();

      auth.sincronizar();

      expect(auth.token()).toBeNull();
    });

    it('[O] si el token ya no está en el almacenamiento, vacía la sesión', () => {
      localStorage.setItem('token', sesion.token);
      localStorage.setItem('usuario', JSON.stringify(sesion.usuario));
      const { auth } = crearAuth();

      localStorage.removeItem('token');
      auth.sincronizar();

      expect(auth.token()).toBeNull();
      expect(auth.usuario()).toBeNull();
    });

    it('[O] si otra pestaña guardó un token distinto, lo toma junto con su usuario', () => {
      localStorage.setItem('token', sesion.token);
      localStorage.setItem('usuario', JSON.stringify(sesion.usuario));
      const { auth } = crearAuth();

      localStorage.setItem('token', 'otro');
      localStorage.setItem('usuario', JSON.stringify({ ...sesion.usuario, nombre: 'Ana' }));
      auth.sincronizar();

      expect(auth.token()).toBe('otro');
      expect(auth.usuario()?.nombre).toBe('Ana');
    });

    it('[I] si el almacenamiento coincide con la memoria no toca nada', () => {
      localStorage.setItem('token', sesion.token);
      const { auth } = crearAuth();
      auth.usuario.set(sesion.usuario);

      auth.sincronizar();

      expect(auth.token()).toBe('token-de-prueba');
      expect(auth.usuario()?.nombre).toBe('Laura');
    });

    it('[E] si leer falla en ese momento, conserva la sesión', () => {
      localStorage.setItem('token', sesion.token);
      const { auth } = crearAuth();
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('bloqueado');
      });

      auth.sincronizar();

      expect(auth.token()).toBe('token-de-prueba');
      vi.restoreAllMocks();
    });
  });
});
