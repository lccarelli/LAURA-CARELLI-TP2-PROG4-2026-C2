import en from '../../../../public/i18n/en.json';
import es from '../../../../public/i18n/es.json';

const CODIGOS_DE_LA_API = [
  'DATOS_INVALIDOS',
  'FECHA_FUTURA',
  'CORREO_REPETIDO',
  'USUARIO_REPETIDO',
  'IMAGEN_TIPO_INVALIDO',
  'CREDENCIALES_INVALIDAS',
  'TOKEN_AUSENTE',
  'TOKEN_INVALIDO',
  'DEMASIADAS_SOLICITUDES',
  'NO_ES_ADMINISTRADOR',
];

function aplanar(objeto: object, prefijo = ''): Record<string, string> {
  return Object.entries(objeto).reduce<Record<string, string>>((claves, [clave, valor]) => {
    const ruta = prefijo ? `${prefijo}.${clave}` : clave;
    return typeof valor === 'object'
      ? { ...claves, ...aplanar(valor, ruta) }
      : { ...claves, [ruta]: valor };
  }, {});
}

const porNombre = (a: string, b: string) => a.localeCompare(b);

const parametros = (texto: string) => (texto.match(/{{\s*\w+\s*}}/g) ?? []).sort(porNombre);

describe('traducciones', () => {
  const textosEs = aplanar(es);
  const textosEn = aplanar(en);

  it('[Z] el español tiene textos', () => {
    expect(Object.keys(textosEs).length).toBeGreaterThan(0);
  });

  it('[I] español e inglés tienen exactamente las mismas claves', () => {
    expect(Object.keys(textosEn).sort(porNombre)).toEqual(Object.keys(textosEs).sort(porNombre));
  });

  it('[I] cada clave usa los mismos parámetros en los dos idiomas', () => {
    for (const clave of Object.keys(textosEs)) {
      expect(parametros(textosEn[clave]), clave).toEqual(parametros(textosEs[clave]));
    }
  });

  it('[I] cada código de error de la API tiene su texto en los dos idiomas', () => {
    for (const codigo of CODIGOS_DE_LA_API) {
      expect(textosEs[`api.${codigo}`], codigo).toBeTruthy();
      expect(textosEn[`api.${codigo}`], codigo).toBeTruthy();
    }
  });

  it('[E] ningún texto está vacío', () => {
    for (const textos of [textosEs, textosEn]) {
      for (const [clave, texto] of Object.entries(textos)) {
        expect(texto.trim(), clave).not.toBe('');
      }
    }
  });
});
