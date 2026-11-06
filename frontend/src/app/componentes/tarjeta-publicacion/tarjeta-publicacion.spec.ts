import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Publicacion } from '../../interfaces/publicacion';
import { TarjetaPublicacion } from './tarjeta-publicacion';
import { proveerIdiomaDePrueba } from '../../../testing/idioma';

const base: Publicacion = {
  _id: '1',
  usuario: {
    _id: 'u1',
    nombre: 'Laura',
    apellido: 'Carelli',
    nombreUsuario: 'laura_c',
  },
  tipo: 'tip',
  cantidadMeGusta: 7,
  cantidadComentarios: 2,
  titulo: 'Mi título',
  mensaje: 'Mi mensaje',
  fecha: '2026-10-22T15:30:00.000Z',
};

describe('TarjetaPublicacion', () => {
  async function crear(publicacion: Publicacion) {
    await TestBed.configureTestingModule({
      imports: [TarjetaPublicacion],
      providers: [proveerIdiomaDePrueba(), provideRouter([])],
    }).compileComponents();
    const fixture: ComponentFixture<TarjetaPublicacion> =
      TestBed.createComponent(TarjetaPublicacion);
    fixture.componentRef.setInput('publicacion', publicacion);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('[O] muestra el título y el autor', async () => {
    const texto = (await crear(base)).textContent;

    expect(texto).toContain('Mi título');
    expect(texto).toContain('@laura_c');
  });

  it('[O] muestra la cantidad de me gusta y de comentarios', async () => {
    const elemento = await crear(base);
    const etiquetas = Array.from(elemento.querySelectorAll('.metrica')).map((m) =>
      m.getAttribute('aria-label'),
    );

    expect(etiquetas).toEqual(['7 me gusta', '2 comentarios']);
  });

  it('[Z] sin imagen en la publicación muestra el mensaje en un recuadro', async () => {
    const elemento = await crear(base);

    expect(elemento.querySelector('.pin-imagen')).toBeNull();
    expect(elemento.querySelector('.pin-texto')!.textContent).toContain('Mi mensaje');
    expect(elemento.querySelectorAll('img')).toHaveLength(1);
  });

  it('[Z] un autor sin foto muestra la imagen por defecto', async () => {
    const elemento = await crear(base);

    expect(elemento.querySelector('img')!.getAttribute('src')).toBe('/sin-foto.svg');
  });

  it('[M] con imagen la muestra en lugar del mensaje, junto a la foto del autor', async () => {
    const elemento = await crear({
      ...base,
      imagen: 'https://res.cloudinary.com/nube/image/upload/banquete/aaa.png',
      usuario: {
        ...base.usuario,
        imagenPerfil: 'https://res.cloudinary.com/nube/image/upload/banquete/bbb.png',
      },
    });
    const fuentes = Array.from(elemento.querySelectorAll('img')).map((img) =>
      img.getAttribute('src'),
    );

    expect(fuentes).toEqual([
      'https://res.cloudinary.com/nube/image/upload/banquete/aaa.png',
      'https://res.cloudinary.com/nube/image/upload/banquete/bbb.png',
    ]);
    expect(elemento.querySelector('.pin-texto')).toBeNull();
  });

  it('[I] es un enlace a la página de la publicación', async () => {
    const elemento = await crear(base);

    expect(elemento.querySelector('a.pin')!.getAttribute('href')).toBe('/publicaciones/1');
  });
});
