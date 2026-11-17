import { randomInt } from 'node:crypto';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { RegistroDto } from '../auth/dto/registro.dto.js';

export const CORREO_DOCENTE_POR_DEFECTO = 'docente@administrador.com';

const MAYUSCULAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const NUMEROS = '23456789';
const TODOS = `${MAYUSCULAS}abcdefghijkmnpqrstuvwxyz${NUMEROS}`;
const LARGO_DE_CLAVE = 12;

const elegir = (caracteres: string) => caracteres[randomInt(caracteres.length)];

export function claveAleatoria() {
  const letras = [
    elegir(MAYUSCULAS),
    elegir(NUMEROS),
    ...Array.from({ length: LARGO_DE_CLAVE - 2 }, () => elegir(TODOS)),
  ];
  for (let i = letras.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [letras[i], letras[j]] = [letras[j], letras[i]];
  }
  return letras.join('');
}

export function datosDeLaCuentaDocente(
  entorno: Record<string, string | undefined> = process.env,
) {
  const datos = plainToInstance(RegistroDto, {
    nombre: 'Docente',
    apellido: 'Banquete',
    correo: entorno.ACCESO_DOCENTE_CORREO || CORREO_DOCENTE_POR_DEFECTO,
    nombreUsuario: 'docente',
    clave: entorno.DOCENTE_CLAVE || claveAleatoria(),
    fechaNacimiento: '1990-01-01',
    descripcion: 'Cuenta de demostración para la evaluación',
  });
  const errores = validateSync(datos, { whitelist: true });
  if (errores.length) {
    const detalle = errores
      .map(
        ({ property, constraints }) =>
          `${property}: ${Object.values(constraints ?? {}).join(', ')}`,
      )
      .join('; ');
    throw new Error(
      `Los datos de la cuenta docente no son válidos (${detalle})`,
    );
  }
  return datos;
}
