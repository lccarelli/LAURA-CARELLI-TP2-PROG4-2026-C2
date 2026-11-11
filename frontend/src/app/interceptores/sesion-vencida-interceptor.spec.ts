import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { Auth } from '../servicios/auth/auth';
import { sesionVencidaInterceptor } from './sesion-vencida-interceptor';
import { tokenInterceptor } from './token-interceptor';

const API = environment.API_URL;
const VENCIDO = { status: 401, statusText: 'Unauthorized' };

describe('sesionVencidaInterceptor', () => {
  let http: HttpClient;
  let controlador: HttpTestingController;
  let auth: Auth;
  let irA: ReturnType<typeof vi.spyOn>;

  const pedir = (ruta: string, metodo: 'get' | 'post' = 'get') =>
    http.request(metodo, `${API}${ruta}`).subscribe({ error: () => undefined });
  const rechazar = (ruta: string, body: object | null = { codigo: 'TOKEN_INVALIDO' }) =>
    controlador.expectOne(`${API}${ruta}`).flush(body, VENCIDO);

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([tokenInterceptor, sesionVencidaInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    controlador = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(Auth);
    auth.token.set('vigente');
    auth.usuario.set({ _id: '1' } as never);
    irA = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  });

  it('[O] un 401 cierra la sesión y lleva al login con el motivo', () => {
    localStorage.setItem('token', 'vigente');

    pedir('/publicaciones');
    rechazar('/publicaciones', { codigo: 'SESION_VENCIDA' });

    expect(auth.token()).toBeNull();
    expect(auth.usuario()).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
    expect(auth.motivoDeSalida()).toBe('api.SESION_VENCIDA');
    expect(irA).toHaveBeenCalledWith('/login');
  });

  it('[I] el error sigue llegando a quien hizo el pedido', () => {
    const errores: number[] = [];

    http.get(`${API}/publicaciones`).subscribe({ error: (error) => errores.push(error.status) });
    rechazar('/publicaciones');

    expect(errores).toEqual([401]);
  });

  it.each(['TOKEN_AUSENTE', 'TOKEN_INVALIDO', 'SESION_VENCIDA', 'USUARIO_NO_AUTORIZADO'])(
    '[I] el código %s se guarda como motivo de salida',
    (codigo) => {
      pedir('/publicaciones');
      rechazar('/publicaciones', { codigo });

      expect(auth.motivoDeSalida()).toBe(`api.${codigo}`);
    },
  );

  it('[B] un 401 sin código usa el motivo de sesión inválida', () => {
    pedir('/publicaciones');
    rechazar('/publicaciones', null);

    expect(auth.motivoDeSalida()).toBe('api.TOKEN_INVALIDO');
  });

  it.each(['/auth/ingresar', '/auth/registro', '/auth/refrescar'])(
    '[I] el 401 de %s no cierra la sesión: lo maneja quien lo pidió',
    (ruta) => {
      pedir(ruta, 'post');
      rechazar(ruta);

      expect(auth.token()).toBe('vigente');
      expect(irA).not.toHaveBeenCalled();
    },
  );

  it.each([0, 403, 404, 500])('[E] un error %i no cierra la sesión', (status) => {
    pedir('/publicaciones');
    controlador.expectOne(`${API}/publicaciones`).flush(null, { status, statusText: 'Error' });

    expect(auth.token()).toBe('vigente');
    expect(irA).not.toHaveBeenCalled();
  });

  it('[S] varios 401 a la vez producen una sola redirección', () => {
    pedir('/publicaciones');
    pedir('/publicaciones/1');
    pedir('/publicaciones/2/comentarios');

    rechazar('/publicaciones');
    rechazar('/publicaciones/1');
    rechazar('/publicaciones/2/comentarios');

    expect(irA).toHaveBeenCalledTimes(1);
  });

  it('[S] el 401 de un pedido hecho con una sesión anterior no cierra la sesión nueva', () => {
    pedir('/publicaciones');
    auth.token.set('nuevo');

    rechazar('/publicaciones');

    expect(auth.token()).toBe('nuevo');
    expect(irA).not.toHaveBeenCalled();
  });

  it('[Z] un 401 sin sesión iniciada no redirige', () => {
    auth.token.set(null);

    pedir('/publicaciones');
    rechazar('/publicaciones');

    expect(irA).not.toHaveBeenCalled();
  });

  it('[I] el 401 de una dirección que no es de la API se ignora', () => {
    http.get('https://otro-sitio.com/datos').subscribe({ error: () => undefined });

    controlador.expectOne('https://otro-sitio.com/datos').flush(null, VENCIDO);

    expect(auth.token()).toBe('vigente');
    expect(irA).not.toHaveBeenCalled();
  });
});
