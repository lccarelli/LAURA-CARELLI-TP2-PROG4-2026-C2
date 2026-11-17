import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { Publicacion } from '../../interfaces/publicacion';
import { Auth } from '../../servicios/auth/auth';
import { Borrador } from '../../servicios/borrador/borrador';
import { NuevaPublicacion } from './nueva-publicacion';
import { proveerIdiomaDePrueba } from '../../../testing/idioma';
import { proveerRutaConId } from '../../../testing/ruta';
import { publicacionDePrueba } from '../../../testing/publicacion';
import { usuarioDePrueba } from '../../../testing/usuario';

const URL = `${environment.API_URL}/publicaciones/id1`;
const REFRESCAR = `${environment.API_URL}/auth/refrescar`;

const receta = (cambios?: Partial<Publicacion>) =>
  publicacionDePrueba(1, {
    tipo: 'receta',
    titulo: 'Tarta',
    mensaje: 'Rica',
    porciones: 4,
    tipoRinde: 'unidades',
    tiempoMinutos: 45,
    costo: 2,
    imagen: 'https://cdn.test/portada.jpg',
    ingredientes: [
      { nombre: 'Harina', cantidad: 200, unidad: 'g' },
      { nombre: 'Sal', unidad: 'a_gusto' },
    ],
    pasos: [
      {
        titulo: 'Masa',
        texto: 'Amasar',
        imagenes: ['https://cdn.test/a.jpg', 'https://cdn.test/b.jpg'],
      },
      { texto: 'Hornear' },
    ],
    ...cambios,
  });

describe('NuevaPublicacion editando', () => {
  let fixture: ComponentFixture<NuevaPublicacion>;
  let http: HttpTestingController;
  let navegar: ReturnType<typeof vi.fn>;

  const abrir = async (datos: Publicacion) => {
    http.expectOne({ method: 'GET', url: URL }).flush(datos);
    fixture.detectChanges();
    await fixture.whenStable();
  };

  const guardar = async () => {
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    return http.expectOne({ method: 'PUT', url: URL });
  };

  const cuerpoDe = (pedido: { request: { body: unknown } }) => pedido.request.body as FormData;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [NuevaPublicacion],
      providers: [
        proveerIdiomaDePrueba(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        proveerRutaConId('id1'),
      ],
    }).compileComponents();

    navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true) as never;
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(Auth).token.set('token');
    TestBed.inject(Auth).usuario.set(usuarioDePrueba);
    fixture = TestBed.createComponent(NuevaPublicacion);
    await fixture.whenStable();
    http.match({ method: 'POST', url: REFRESCAR });
  });

  it('[I] pide la publicación y no muestra el formulario hasta tenerla', () => {
    http.expectOne({ method: 'GET', url: URL });

    expect(fixture.nativeElement.querySelector('form')).toBeNull();
  });

  it('[O] carga todos los datos en el formulario y no deja cambiar el tipo', async () => {
    await abrir(receta());
    const { formulario, ingredientes, pasos, costo, tipoRinde } = fixture.componentInstance;

    expect(fixture.nativeElement.querySelector('h1').textContent).toContain('Editar publicación');
    expect(fixture.nativeElement.querySelector('.solapas')).toBeNull();
    expect(formulario.getRawValue()).toMatchObject({
      titulo: 'Tarta',
      mensaje: 'Rica',
      porciones: '4',
      tiempoMinutos: '45',
      calorias: '',
    });
    expect(ingredientes.getRawValue()).toEqual([
      { nombre: 'Harina', cantidad: 200, unidad: 'g' },
      { nombre: 'Sal', cantidad: null, unidad: 'a_gusto' },
    ]);
    expect(pasos.getRawValue()).toEqual([
      { titulo: 'Masa', texto: 'Amasar' },
      { titulo: '', texto: 'Hornear' },
    ]);
    expect(costo()).toBe(2);
    expect(tipoRinde()).toBe('unidades');
    expect(fixture.componentInstance.fotosDe(pasos.at(0)).map(({ url }) => url)).toEqual([
      'https://cdn.test/a.jpg',
      'https://cdn.test/b.jpg',
    ]);
  });

  it('[E] si la publicación es de otra persona vuelve al detalle sin mostrar el formulario', async () => {
    await abrir(receta({ usuario: { ...receta().usuario, _id: 'otra' } }));

    expect(navegar).toHaveBeenCalledWith(['/publicaciones', 'id1']);
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
  });

  it('[E] si no se puede cargar muestra el error y no el formulario', async () => {
    http
      .expectOne({ method: 'GET', url: URL })
      .flush(
        { message: 'x', codigo: 'PUBLICACION_NO_ENCONTRADA' },
        { status: 404, statusText: 'x' },
      );
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.mensajeError()).not.toBeNull();
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
  });

  it('[I] guarda con PUT, sin tipo, conservando las fotos y la portada', async () => {
    await abrir(receta());

    const cuerpo = cuerpoDe(await guardar());

    expect(cuerpo.get('tipo')).toBeNull();
    expect(cuerpo.get('titulo')).toBe('Tarta');
    expect(cuerpo.get('quitarImagen')).toBeNull();
    expect(cuerpo.get('imagen')).toBeNull();
    expect(JSON.parse(cuerpo.get('pasos') as string)).toEqual([
      {
        titulo: 'Masa',
        texto: 'Amasar',
        imagenes: ['https://cdn.test/a.jpg', 'https://cdn.test/b.jpg'],
      },
      { texto: 'Hornear' },
    ]);
    expect(cuerpo.getAll('imagenesPasos')).toHaveLength(0);
  });

  it('[O] al terminar vuelve al detalle de la publicación', async () => {
    await abrir(receta());

    (await guardar()).flush(receta());

    expect(navegar).toHaveBeenCalledWith(['/publicaciones', 'id1']);
  });

  it('[S] quitar una foto de un paso la saca de las que se conservan', async () => {
    await abrir(receta());
    const { componente } = { componente: fixture.componentInstance };
    componente.quitarFotoPaso(componente.pasos.at(0), 0);

    const cuerpo = cuerpoDe(await guardar());

    expect(JSON.parse(cuerpo.get('pasos') as string)[0].imagenes).toEqual([
      'https://cdn.test/b.jpg',
    ]);
  });

  it('[S] una foto nueva en un paso viaja como archivo junto a las que se conservan', async () => {
    await abrir(receta());
    const archivo = new File(['x'], 'nueva.png', { type: 'image/png' });
    const componente = fixture.componentInstance;
    componente.fotosPasos.update((fotos) =>
      new Map(fotos).set(componente.pasos.at(1), [{ archivo, url: 'blob:nueva' }]),
    );

    const cuerpo = cuerpoDe(await guardar());

    expect(JSON.parse(cuerpo.get('pasos') as string)[1]).toEqual({ texto: 'Hornear', fotos: [0] });
    expect((cuerpo.getAll('imagenesPasos')[0] as File).name).toBe('nueva.png');
  });

  it('[S] quitar la portada pide quitarla', async () => {
    await abrir(receta());
    fixture.componentInstance.quitarImagen();

    const cuerpo = cuerpoDe(await guardar());

    expect(cuerpo.get('quitarImagen')).toBe('true');
    expect(cuerpo.get('imagen')).toBeNull();
  });

  it('[S] elegir otra portada la envía y no pide quitarla', async () => {
    await abrir(receta());
    fixture.componentInstance.imagen.set(new File(['x'], 'otra.png', { type: 'image/png' }));

    const cuerpo = cuerpoDe(await guardar());

    expect((cuerpo.get('imagen') as File).name).toBe('otra.png');
    expect(cuerpo.get('quitarImagen')).toBeNull();
  });

  it('[Z] una publicación sin portada no pide quitarla', async () => {
    await abrir(receta({ imagen: undefined }));

    expect(cuerpoDe(await guardar()).get('quitarImagen')).toBeNull();
  });

  it('[E] un error del servidor se muestra y se puede reintentar', async () => {
    await abrir(receta());

    (await guardar()).flush(
      { message: 'x', codigo: 'PUBLICACION_AJENA' },
      { status: 403, statusText: 'x' },
    );

    expect(fixture.componentInstance.mensajeError()).not.toBeNull();
    expect(fixture.componentInstance.publicando()).toBe(false);
    expect(navegar).not.toHaveBeenCalled();
  });

  it('[I] no guarda borrador mientras se edita', async () => {
    await abrir(receta());
    fixture.componentInstance.guardarBorrador();

    expect(TestBed.inject(Borrador).leer()).toBeNull();
  });
});
