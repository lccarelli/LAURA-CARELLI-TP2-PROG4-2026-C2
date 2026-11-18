import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { proveerIdiomaDePrueba } from '../../../testing/idioma';
import { publicacionDePrueba } from '../../../testing/publicacion';
import { Publicacion } from '../../interfaces/publicacion';
import { UltimaPublicacion } from './ultima-publicacion';

describe('UltimaPublicacion', () => {
  const crear = async (publicacion: Publicacion) => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [UltimaPublicacion],
      providers: [
        proveerIdiomaDePrueba(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(UltimaPublicacion);
    fixture.componentRef.setInput('publicacion', publicacion);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  };

  it('[O] con imagen muestra la foto y no la portada genérica', async () => {
    const raiz = await crear(
      publicacionDePrueba(1, { imagen: 'https://res.cloudinary.com/nube/image/upload/a.png' }),
    );

    expect(raiz.querySelector('img.ultima-imagen')!.getAttribute('src')).toBe(
      'https://res.cloudinary.com/nube/image/upload/a.png',
    );
    expect(raiz.querySelector('app-portada-generica')).toBeNull();
  });

  it.each(['receta', 'tip', 'experiencia'] as const)(
    '[Z] sin imagen (%s) muestra la portada genérica en tamaño miniatura, del mismo tamaño que una foto',
    async (tipo) => {
      const raiz = await crear(publicacionDePrueba(1, { tipo, imagen: undefined }));

      const portada = raiz.querySelector('.portada-generica')!;

      expect(raiz.querySelector('img.ultima-imagen')).toBeNull();
      expect(portada.classList).toContain('portada-generica-chica');
      expect(portada.getAttribute('data-tipo')).toBe(tipo);
    },
  );

  it('[I] la portada genérica está dentro del enlace a la publicación: se puede tocar igual que una foto', async () => {
    const raiz = await crear(publicacionDePrueba(1, { imagen: undefined }));

    const enlace = raiz.querySelector('a.ultima-cabecera') as HTMLAnchorElement;

    expect(enlace.getAttribute('href')).toBe('/publicaciones/id1');
    expect(enlace.querySelector('.portada-generica')).not.toBeNull();
  });
});
