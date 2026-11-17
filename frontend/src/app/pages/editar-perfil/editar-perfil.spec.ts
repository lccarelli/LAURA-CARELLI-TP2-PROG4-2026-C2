import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { Usuario } from '../../interfaces/usuario';
import { Auth } from '../../servicios/auth/auth';
import { Imagenes } from '../../servicios/imagenes/imagenes';
import { EditarPerfil } from './editar-perfil';
import { proveerIdiomaDePrueba } from '../../../testing/idioma';
import { usuarioDePrueba } from '../../../testing/usuario';

const RUTA = `${environment.API_URL}/usuarios/yo`;
const FOTO = 'https://res.cloudinary.com/nube/image/upload/banquete/abc.png';

describe('EditarPerfil', () => {
  let fixture: ComponentFixture<EditarPerfil>;
  let http: HttpTestingController;
  let navegar: ReturnType<typeof vi.fn>;

  const abrir = async (usuario: Usuario | null = usuarioDePrueba) => {
    TestBed.inject(Auth).usuario.set(usuario);
    fixture = TestBed.createComponent(EditarPerfil);
    fixture.detectChanges();
    await fixture.whenStable();
  };

  const campo = (nombre: string) =>
    fixture.nativeElement.querySelector(`[formControlName="${nombre}"]`) as HTMLInputElement;
  const botones = () =>
    Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>);
  const botonQuitar = () => botones().find((b) => b.textContent?.includes('Quitar foto'));
  const texto = () => fixture.nativeElement.textContent as string;

  const guardar = async () => {
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  };
  const pedido = () => http.expectOne({ method: 'PUT', url: RUTA });
  const cuerpo = (solicitud: { request: { body: unknown } }) => solicitud.request.body as FormData;

  const elegirFoto = async (archivo: File) => {
    vi.spyOn(TestBed.inject(Imagenes), 'preparar').mockResolvedValueOnce(archivo);
    fixture.componentInstance.elegirImagen({
      target: { files: [archivo], value: '' },
    } as unknown as Event);
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [EditarPerfil],
      providers: [
        proveerIdiomaDePrueba(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
    navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true) as never;
    http = TestBed.inject(HttpTestingController);
  });

  it('[O] empieza con los datos actuales de la persona', async () => {
    await abrir();

    expect(campo('nombre').value).toBe('Laura');
    expect(campo('apellido').value).toBe('Carelli');
    expect(campo('descripcion').value).toBe('');
    expect(fixture.nativeElement.querySelector('h1').textContent).toContain('Editar mi perfil');
  });

  it('[I] no ofrece cambiar el correo, el usuario, la clave ni la fecha de nacimiento', async () => {
    await abrir();

    expect(
      fixture.nativeElement.querySelectorAll('input:not([type="file"]), textarea'),
    ).toHaveLength(3);
  });

  it('[O] guarda con PUT sólo nombre, apellido y descripción sin espacios alrededor', async () => {
    await abrir();
    campo('nombre').value = '  Ana ';
    campo('nombre').dispatchEvent(new Event('input'));
    campo('apellido').value = 'Gómez';
    campo('apellido').dispatchEvent(new Event('input'));
    campo('descripcion').value = ' Cocino ';
    campo('descripcion').dispatchEvent(new Event('input'));

    await guardar();
    const datos = cuerpo(pedido());

    expect(datos.get('nombre')).toBe('Ana');
    expect(datos.get('apellido')).toBe('Gómez');
    expect(datos.get('descripcion')).toBe('Cocino');
    expect(datos.get('imagen')).toBeNull();
    expect(datos.get('quitarImagen')).toBeNull();
  });

  it('[O] al terminar guarda al usuario nuevo en la sesión y vuelve al perfil', async () => {
    await abrir({ ...usuarioDePrueba, descripcion: 'Hola' });

    await guardar();
    pedido().flush({ ...usuarioDePrueba, nombre: 'Ana' });

    expect(TestBed.inject(Auth).usuario()?.nombre).toBe('Ana');
    expect(navegar).toHaveBeenCalledWith(['/perfil']);
  });

  describe('validación', () => {
    it.each([
      ['nombre', '', 'Este campo es obligatorio'],
      ['nombre', 'A', 'Debe tener al menos 2 caracteres'],
      ['nombre', 'A'.repeat(31), 'Debe tener como máximo 30 caracteres'],
      ['apellido', '', 'Este campo es obligatorio'],
      ['descripcion', '', 'Este campo es obligatorio'],
      ['descripcion', 'a'.repeat(201), 'Debe tener como máximo 200 caracteres'],
    ])('[E] %s con «%s» no envía y muestra «%s»', async (nombre, valor, mensaje) => {
      await abrir({ ...usuarioDePrueba, descripcion: 'Hola' });
      campo(nombre).value = valor;
      campo(nombre).dispatchEvent(new Event('input'));

      await guardar();
      fixture.detectChanges();

      http.expectNone(RUTA);
      expect(texto()).toContain(mensaje);
    });
  });

  describe('foto', () => {
    it('[B] sin foto muestra la imagen por defecto y no ofrece quitar', async () => {
      await abrir();

      expect(fixture.nativeElement.querySelector('img').getAttribute('src')).toBe('/sin-foto.svg');
      expect(botonQuitar()).toBeUndefined();
      expect(texto()).toContain('Elegir foto');
    });

    it('[O] con foto la muestra y ofrece cambiarla o quitarla', async () => {
      await abrir({ ...usuarioDePrueba, imagenPerfil: FOTO });

      expect(fixture.nativeElement.querySelector('img').getAttribute('src')).toBe(FOTO);
      expect(texto()).toContain('Cambiar foto');
      expect(botonQuitar()).toBeDefined();
    });

    it('[Z] guardar sin tocar la foto no la envía ni pide quitarla', async () => {
      await abrir({ ...usuarioDePrueba, imagenPerfil: FOTO, descripcion: 'Hola' });

      await guardar();
      const datos = cuerpo(pedido());

      expect(datos.get('imagen')).toBeNull();
      expect(datos.get('quitarImagen')).toBeNull();
    });

    it('[S] elegir una foto la muestra y la envía', async () => {
      await abrir({ ...usuarioDePrueba, descripcion: 'Hola' });
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:vista');

      await elegirFoto(new File(['x'], 'yo.png', { type: 'image/png' }));
      await guardar();
      const datos = cuerpo(pedido());

      expect(fixture.nativeElement.querySelector('img').getAttribute('src')).toBe('blob:vista');
      expect((datos.get('imagen') as File).name).toBe('yo.png');
      expect(datos.get('quitarImagen')).toBeNull();
    });

    it('[S] quitar la foto vuelve a la imagen por defecto y pide quitarla', async () => {
      await abrir({ ...usuarioDePrueba, imagenPerfil: FOTO, descripcion: 'Hola' });

      botonQuitar()!.click();
      fixture.detectChanges();
      await guardar();
      const datos = cuerpo(pedido());

      expect(fixture.nativeElement.querySelector('img').getAttribute('src')).toBe('/sin-foto.svg');
      expect(datos.get('quitarImagen')).toBe('true');
      expect(datos.get('imagen')).toBeNull();
    });

    it('[Z] quitar cuando no había foto no pide nada', async () => {
      await abrir({ ...usuarioDePrueba, descripcion: 'Hola' });
      fixture.componentInstance.quitarFoto();

      await guardar();

      expect(cuerpo(pedido()).get('quitarImagen')).toBeNull();
    });

    it('[E] un archivo que no es imagen se rechaza con un mensaje y no cambia la foto', async () => {
      await abrir({ ...usuarioDePrueba, imagenPerfil: FOTO });

      await elegirFoto(new File(['x'], 'nota.txt', { type: 'text/plain' }));

      expect(fixture.componentInstance.errorImagen()).not.toBeNull();
      expect(fixture.componentInstance.imagen()).toBeNull();
      expect(fixture.nativeElement.querySelector('img').getAttribute('src')).toBe(FOTO);
    });
  });

  describe('errores del servidor', () => {
    it('[E] muestra el aviso, no navega y deja reintentar', async () => {
      await abrir({ ...usuarioDePrueba, descripcion: 'Hola' });

      await guardar();
      pedido().flush({ message: 'x', codigo: 'ERROR' }, { status: 500, statusText: 'x' });
      fixture.detectChanges();

      expect(fixture.componentInstance.mensajeError()).not.toBeNull();
      expect(fixture.componentInstance.enviando()).toBe(false);
      expect(navegar).not.toHaveBeenCalled();
    });

    it('[S] mientras guarda no envía dos veces', async () => {
      await abrir({ ...usuarioDePrueba, descripcion: 'Hola' });

      await guardar();
      await guardar();

      expect(http.match({ method: 'PUT', url: RUTA })).toHaveLength(1);
    });
  });
});
