import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { retry, throwError, timer } from 'rxjs';

const ESTADOS_TRANSITORIOS = [0, 429, 502, 503, 504];
const REINTENTOS = 2;

export const reintentoInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.method !== 'GET') {
    return next(req);
  }

  return next(req).pipe(
    retry({
      count: REINTENTOS,
      delay: (error: HttpErrorResponse, intento) =>
        ESTADOS_TRANSITORIOS.includes(error.status)
          ? timer(500 * 2 ** (intento - 1) + Math.random() * 250)
          : throwError(() => error),
    }),
  );
};
