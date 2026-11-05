import {
  CallHandler,
  ExecutionContext,
  ForbiddenException,
  HttpException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { lastValueFrom, of, throwError } from 'rxjs';
import { LoggerFactory } from './logs.factory.js';
import { LogsHttpInterceptor } from './logs-http.interceptor.js';

function contexto(estado = 200, usuario?: { id: string }) {
  const solicitud = {
    method: 'GET',
    originalUrl: '/publicaciones?offset=0',
    path: '/publicaciones',
    ip: '203.0.113.7',
    usuario,
  };
  const respuesta = { statusCode: estado };
  return {
    ejecucion: {
      switchToHttp: () => ({
        getRequest: () => solicitud,
        getResponse: () => respuesta,
      }),
    } as ExecutionContext,
  };
}

const respondeBien: CallHandler = { handle: () => of('ok') };
const fallaCon = (error: unknown): CallHandler => ({
  handle: () => throwError(() => error),
});

describe('LogsHttpInterceptor', () => {
  const interceptor = new LogsHttpInterceptor(new LoggerFactory());
  const salida = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
  const lineas = () =>
    salida.mock.calls.map(([linea]) => JSON.parse(String(linea)));

  beforeEach(() => {
    salida.mockClear();
  });

  it('[Z] sin usuario la línea no lleva id_usuario', async () => {
    const { ejecucion } = contexto();
    await lastValueFrom(interceptor.intercept(ejecucion, respondeBien));
    expect(lineas()).toHaveLength(1);
    expect(lineas()[0]).toMatchObject({
      nivel: 'info',
      modulo: 'LogsHttpInterceptor',
      evento: 'solicitud_exitosa',
      mensaje: 'GET /publicaciones 200',
      metodo: 'GET',
      path: '/publicaciones',
      estado_http: 200,
      ip: '203.0.113.7',
    });
    expect(lineas()[0]).not.toHaveProperty('id_usuario');
    expect(lineas()[0].latencia_ms).toEqual(expect.any(Number));
  });

  it('[O] devuelve lo mismo que el controlador', async () => {
    const { ejecucion } = contexto();
    const resultado = await lastValueFrom(
      interceptor.intercept(ejecucion, respondeBien),
    );
    expect(resultado).toBe('ok');
  });

  it('[M] con usuario la línea lleva su id', async () => {
    const { ejecucion } = contexto(201, { id: 'abc123' });
    await lastValueFrom(interceptor.intercept(ejecucion, respondeBien));
    expect(lineas()[0]).toMatchObject({
      estado_http: 201,
      id_usuario: 'abc123',
    });
  });

  it('[B] un 404 se registra como advertencia', async () => {
    const { ejecucion } = contexto();
    await expect(
      lastValueFrom(
        interceptor.intercept(ejecucion, fallaCon(new NotFoundException())),
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(lineas()[0]).toMatchObject({
      nivel: 'warn',
      evento: 'solicitud_rechazada',
      estado_http: 404,
    });
  });

  it('[B] una redirección (304) es información, no advertencia', async () => {
    const { ejecucion } = contexto(304);
    await lastValueFrom(interceptor.intercept(ejecucion, respondeBien));
    expect(lineas()[0]).toMatchObject({ nivel: 'info', estado_http: 304 });
  });

  it('[B] el último error del cliente (499) es advertencia', async () => {
    const { ejecucion } = contexto();
    await expect(
      lastValueFrom(
        interceptor.intercept(ejecucion, fallaCon(new HttpException('x', 499))),
      ),
    ).rejects.toBeInstanceOf(HttpException);
    expect(lineas()[0]).toMatchObject({ nivel: 'warn', estado_http: 499 });
  });

  it('[B] un 403 también es advertencia', async () => {
    const { ejecucion } = contexto();
    await expect(
      lastValueFrom(
        interceptor.intercept(ejecucion, fallaCon(new ForbiddenException())),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(lineas()[0]).toMatchObject({ nivel: 'warn', estado_http: 403 });
  });

  it('[I] un 500 explícito se registra como error', async () => {
    const { ejecucion } = contexto();
    await expect(
      lastValueFrom(
        interceptor.intercept(
          ejecucion,
          fallaCon(new InternalServerErrorException()),
        ),
      ),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
    expect(lineas()[0]).toMatchObject({
      nivel: 'error',
      evento: 'solicitud_fallida',
      estado_http: 500,
    });
  });

  it('[E] una excepción desconocida se registra como 500 y se vuelve a lanzar', async () => {
    const { ejecucion } = contexto();
    const fallo = new Error('caído');
    await expect(
      lastValueFrom(interceptor.intercept(ejecucion, fallaCon(fallo))),
    ).rejects.toBe(fallo);
    expect(lineas()[0]).toMatchObject({
      nivel: 'error',
      evento: 'solicitud_fallida',
      estado_http: 500,
    });
  });
});
