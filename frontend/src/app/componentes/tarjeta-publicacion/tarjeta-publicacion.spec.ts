import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
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
      providers: [proveerIdiomaDePrueba()],
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
      imagen: '/imagenes/aaa',
      usuario: { ...base.usuario, imagenPerfil: '/imagenes/bbb' },
    });
    const fuentes = Array.from(elemento.querySelectorAll('img')).map((img) =>
      img.getAttribute('src'),
    );

    expect(fuentes).toEqual([
      `${environment.API_URL}/imagenes/aaa`,
      `${environment.API_URL}/imagenes/bbb`,
    ]);
    expect(elemento.querySelector('.pin-texto')).toBeNull();
  });

  it('[I] al tocarla avisa que se quiere abrir', async () => {
    await TestBed.configureTestingModule({
      imports: [TarjetaPublicacion],
      providers: [proveerIdiomaDePrueba()],
    }).compileComponents();
    const fixture = TestBed.createComponent(TarjetaPublicacion);
    fixture.componentRef.setInput('publicacion', base);
    let avisos = 0;
    fixture.componentInstance.abrir.subscribe(() => avisos++);
    await fixture.whenStable();

    (fixture.nativeElement as HTMLElement).querySelector('button')!.click();

    expect(avisos).toBe(1);
  });
});
