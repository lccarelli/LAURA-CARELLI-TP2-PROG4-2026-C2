import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { File as ArchivoDeNode } from 'node:buffer';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { Usuario } from '../../interfaces/usuario';
import { Auth } from '../auth/auth';
import { FotosBorrador } from './fotos-borrador';

const usuario = (id: string): Usuario => ({
  _id: id,
  nombre: 'Laura',
  apellido: 'Carelli',
  correo: 'laura@correo.com',
  nombreUsuario: 'laura_c',
  fechaNacimiento: '1990-05-20T00:00:00.000Z',
  descripcion: '',
  perfil: 'usuario',
  habilitado: true,
});

const foto = (nombre: string, tipo = 'image/png', tamano = 10) =>
  new ArchivoDeNode([new Uint8Array(tamano)], nombre, { type: tipo }) as unknown as File;

const nombres = (pasos: File[][]) => pasos.map((fotos) => fotos.map((foto) => foto.name));

describe('FotosBorrador', () => {
  let fotos: FotosBorrador;
  let auth: Auth;

  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    fotos = TestBed.inject(FotosBorrador);
    auth = TestBed.inject(Auth);
    auth.usuario.set(usuario('u1'));
  });

  it('[Z] sin nada guardado no devuelve fotos', async () => {
    const guardadas = await fotos.leer();

    expect(guardadas).toEqual({ portada: null, pasos: [] });
  });

  it('[O] guarda la portada y las fotos de los pasos y las devuelve con su nombre y tipo', async () => {
    await fotos.guardar({
      portada: foto('portada.png'),
      pasos: [
        [foto('uno.jpg', 'image/jpeg'), foto('uno-b.png')],
        [],
        [foto('tres.webp', 'image/webp')],
      ],
    });

    const guardadas = await fotos.leer();

    expect(guardadas!.portada!.name).toBe('portada.png');
    expect(nombres(guardadas!.pasos)).toEqual([['uno.jpg', 'uno-b.png'], [], ['tres.webp']]);
    expect(guardadas!.pasos[0][0].type).toBe('image/jpeg');
  });

  it('[O] guardar de nuevo reemplaza lo anterior', async () => {
    await fotos.guardar({ portada: foto('vieja.png'), pasos: [[foto('a.png')]] });
    await fotos.guardar({ portada: null, pasos: [[], [foto('b.png')]] });

    const guardadas = await fotos.leer();

    expect(guardadas!.portada).toBeNull();
    expect(nombres(guardadas!.pasos)).toEqual([[], ['b.png']]);
  });

  it('[O] sin ninguna foto borra lo guardado', async () => {
    await fotos.guardar({ portada: foto('portada.png'), pasos: [] });
    await fotos.guardar({ portada: null, pasos: [[]] });

    expect(await fotos.leer()).toEqual({ portada: null, pasos: [] });
  });

  it('[O] borrar deja el borrador sin fotos', async () => {
    await fotos.guardar({ portada: foto('portada.png'), pasos: [] });

    await fotos.borrar();

    expect(await fotos.leer()).toEqual({ portada: null, pasos: [] });
  });

  it('[M] cada persona tiene sus fotos', async () => {
    await fotos.guardar({ portada: foto('de-laura.png'), pasos: [] });
    auth.usuario.set(usuario('u2'));

    expect(await fotos.leer()).toEqual({ portada: null, pasos: [] });

    await fotos.guardar({ portada: foto('de-juan.png'), pasos: [] });
    auth.usuario.set(usuario('u1'));

    expect((await fotos.leer())!.portada!.name).toBe('de-laura.png');
  });

  it('[E] sin sesión no guarda ni lee nada', async () => {
    auth.usuario.set(null);

    await fotos.guardar({ portada: foto('portada.png'), pasos: [] });

    expect(await fotos.leer()).toBeNull();
  });

  it('[E] lo guardado que no es una imagen permitida o pesa más de 2 MB se descarta al leer', async () => {
    await fotos.guardar({
      portada: foto('script.png', 'text/html'),
      pasos: [[foto('grande.png', 'image/png', 2 * 1024 * 1024 + 1), foto('buena.png')]],
    });

    const guardadas = await fotos.leer();

    expect(guardadas!.portada).toBeNull();
    expect(nombres(guardadas!.pasos)).toEqual([['buena.png']]);
  });

  it('[E] si el navegador no tiene IndexedDB no falla', async () => {
    const original = globalThis.indexedDB;
    // @ts-expect-error simula un navegador sin IndexedDB
    delete globalThis.indexedDB;

    await expect(
      fotos.guardar({ portada: foto('portada.png'), pasos: [] }),
    ).resolves.toBeUndefined();
    expect(await fotos.leer()).toBeNull();

    globalThis.indexedDB = original;
  });
});
