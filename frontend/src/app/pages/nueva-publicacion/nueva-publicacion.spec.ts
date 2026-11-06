import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { Publicacion } from '../../interfaces/publicacion';
import { Usuario } from '../../interfaces/usuario';
import { Auth } from '../../servicios/auth/auth';
import { Borrador } from '../../servicios/borrador/borrador';
import { NuevaPublicacion } from './nueva-publicacion';
import { proveerIdiomaDePrueba } from '../../../testing/idioma';

const URL = `${environment.API_URL}/publicaciones`;
const REFRESCAR = `${environment.API_URL}/auth/refrescar`;

const usuarioPrueba: Usuario = {
  _id: 'u1',
  nombre: 'Laura',
  apellido: 'Carelli',
  correo: 'laura@correo.com',
  nombreUsuario: 'laura_c',
  fechaNacimiento: '1990-05-20T00:00:00.000Z',
  descripcion: '',
  perfil: 'usuario',
  habilitado: true,
};

const publicacion = (numero: number): Publicacion => ({
  _id: `id${numero}`,
  usuario: { _id: 'u1', nombre: 'Laura', apellido: 'Carelli', nombreUsuario: 'laura_c' },
  tipo: 'experiencia',
  cantidadMeGusta: 0,
  cantidadComentarios: 0,
  titulo: `Título ${numero}`,
  mensaje: `Mensaje ${numero}`,
  fecha: '2026-10-22T15:30:00.000Z',
});

describe('NuevaPublicacion', () => {
  let fixture: ComponentFixture<NuevaPublicacion>;
  let http: HttpTestingController;
  let navegar: ReturnType<typeof vi.fn>;

  const actualizar = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
  };

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [NuevaPublicacion],
      providers: [
        proveerIdiomaDePrueba(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true) as never;
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(Auth).token.set('token-inicial');
    TestBed.inject(Auth).usuario.set(usuarioPrueba);
    fixture = TestBed.createComponent(NuevaPublicacion);
    await fixture.whenStable();
  });

  it('[I] es una página completa con el formulario y un enlace para volver al muro', () => {
    const raiz = fixture.nativeElement as HTMLElement;

    expect(raiz.querySelector('h1')!.textContent).toContain('Nueva publicación');
    expect(raiz.querySelector('form')).not.toBeNull();
    expect(raiz.querySelector('a[href="/publicaciones"]')).not.toBeNull();
    expect(raiz.querySelector('[role="dialog"], [aria-modal]')).toBeNull();
  });

  describe('publicar', () => {
    const formularioValido = { titulo: 'Hola', mensaje: 'Primer mensaje' };

    const enviar = async () => {
      fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
      await fixture.whenStable();
    };

    it('[Z] con el formulario vacío no envía nada y marca los campos', async () => {
      await enviar();

      http.expectNone({ method: 'POST', url: URL });
      expect(fixture.componentInstance.mensajeDeError('titulo')).toBe('Este campo es obligatorio');
      expect(fixture.componentInstance.mensajeDeError('mensaje')).toBe('Este campo es obligatorio');
    });

    it('[O] publica y vuelve al muro', async () => {
      fixture.componentInstance.formulario.patchValue(formularioValido);

      await enviar();
      http.expectOne({ method: 'POST', url: URL }).flush({ ...publicacion(99), titulo: 'Hola' });

      expect(navegar).toHaveBeenCalledWith(['/publicaciones']);
    });

    it('[I] envía título y mensaje sin espacios alrededor, y la imagen si hay', async () => {
      fixture.componentInstance.formulario.patchValue({ titulo: '  Hola ', mensaje: ' Mundo  ' });
      fixture.componentInstance.imagen.set(new File(['x'], 'foto.png', { type: 'image/png' }));

      await enviar();
      const cuerpo = http.expectOne({ method: 'POST', url: URL }).request.body as FormData;

      expect(cuerpo.get('titulo')).toBe('Hola');
      expect(cuerpo.get('mensaje')).toBe('Mundo');
      expect((cuerpo.get('imagen') as File).name).toBe('foto.png');
    });

    it('[I] envía el tipo receta por defecto', async () => {
      fixture.componentInstance.formulario.patchValue(formularioValido);
      await enviar();
      const cuerpo = http.expectOne({ method: 'POST', url: URL }).request.body as FormData;

      expect(cuerpo.get('tipo')).toBe('receta');
    });

    it('[I] envía el tipo que se eligió', async () => {
      fixture.componentInstance.tipo.set('experiencia');
      fixture.componentInstance.formulario.patchValue(formularioValido);
      await enviar();
      const cuerpo = http.expectOne({ method: 'POST', url: URL }).request.body as FormData;

      expect(cuerpo.get('tipo')).toBe('experiencia');
    });

    const cargarPasos = (textos: string[]) => {
      const { pasos } = fixture.componentInstance;
      pasos.clear();
      textos.forEach(() => fixture.componentInstance.agregarPaso());
      pasos.setValue(textos);
    };

    const cargarIngredientes = (filas: object[]) => {
      const { ingredientes } = fixture.componentInstance;
      ingredientes.clear();
      filas.forEach(() => fixture.componentInstance.agregarIngrediente());
      ingredientes.patchValue(filas);
    };

    it('[I] con receta o completa envía los ingredientes como lista y los pasos si hay', async () => {
      fixture.componentInstance.formulario.patchValue(formularioValido);
      cargarPasos([' Mezclar ', '', 'Hornear']);
      cargarIngredientes([
        { nombre: ' Harina ', cantidad: 250, unidad: 'g' },
        { nombre: 'Huevo', cantidad: 2, unidad: 'unidad' },
      ]);
      await enviar();
      const cuerpo = http.expectOne({ method: 'POST', url: URL }).request.body as FormData;

      expect(JSON.parse(cuerpo.get('ingredientes') as string)).toEqual([
        { nombre: 'Harina', cantidad: 250, unidad: 'g' },
        { nombre: 'Huevo', cantidad: 2, unidad: 'unidad' },
      ]);
      expect(JSON.parse(cuerpo.get('pasos') as string)).toEqual(['Mezclar', 'Hornear']);
    });

    it('[I] "a gusto" se envía sin cantidad', async () => {
      fixture.componentInstance.formulario.patchValue(formularioValido);
      cargarIngredientes([{ nombre: 'Sal', cantidad: 5, unidad: 'a_gusto' }]);
      await enviar();
      const cuerpo = http.expectOne({ method: 'POST', url: URL }).request.body as FormData;

      expect(JSON.parse(cuerpo.get('ingredientes') as string)).toEqual([
        { nombre: 'Sal', unidad: 'a_gusto' },
      ]);
    });

    it('[I] las filas vacías se ignoran y, si no queda ninguna, no se envía la lista', async () => {
      fixture.componentInstance.formulario.patchValue(formularioValido);
      await enviar();
      const cuerpo = http.expectOne({ method: 'POST', url: URL }).request.body as FormData;

      expect(cuerpo.has('ingredientes')).toBe(false);
    });

    it('[E] un ingrediente sin cantidad, o con cantidad y sin nombre, bloquea el envío', async () => {
      fixture.componentInstance.formulario.patchValue(formularioValido);

      cargarIngredientes([{ nombre: 'Harina', cantidad: null, unidad: 'g' }]);
      await enviar();
      http.expectNone({ method: 'POST', url: URL });

      cargarIngredientes([{ nombre: '  ', cantidad: 3, unidad: 'g' }]);
      await enviar();
      http.expectNone({ method: 'POST', url: URL });
    });

    describe('mensajes del ingrediente', () => {
      const mensaje = () =>
        (
          fixture.nativeElement.querySelector('.ingrediente-error') as HTMLElement | null
        )?.textContent?.trim() ?? null;

      beforeEach(() => {
        fixture.componentInstance.formulario.patchValue(formularioValido);
      });

      it('[I] con el nombre vacío dice que falta el nombre', async () => {
        cargarIngredientes([{ nombre: '', cantidad: 1, unidad: 'g' }]);
        await enviar();
        await actualizar();

        expect(mensaje()).toBe('Falta el nombre del ingrediente');
      });

      it('[I] con la cantidad vacía dice que falta la cantidad', async () => {
        cargarIngredientes([{ nombre: 'Harina', cantidad: null, unidad: 'g' }]);
        await enviar();
        await actualizar();

        expect(mensaje()).toBe('Falta la cantidad del ingrediente');
      });

      it('[I] "a gusto" sin cantidad no pide cantidad', async () => {
        cargarIngredientes([{ nombre: 'Sal', cantidad: null, unidad: 'a_gusto' }]);
        await enviar();
        await actualizar();

        expect(mensaje()).toBeNull();
      });

      it('[B] no avisa lo que falta hasta intentar publicar', async () => {
        cargarIngredientes([{ nombre: 'Harina', cantidad: null, unidad: 'g' }]);
        fixture.componentInstance.ingredientes.at(0).markAllAsTouched();
        await actualizar();

        expect(mensaje()).toBeNull();
      });

      it('[E] una cantidad inválida lo dice apenas se toca el campo', async () => {
        cargarIngredientes([{ nombre: 'Harina', cantidad: 0.255, unidad: 'g' }]);
        fixture.componentInstance.ingredientes.at(0).markAllAsTouched();
        await actualizar();

        expect(mensaje()).toContain('mayor que 0');
      });

      it('[E] un nombre de más de 100 caracteres dice el máximo', async () => {
        cargarIngredientes([{ nombre: 'a'.repeat(101), cantidad: 1, unidad: 'g' }]);
        fixture.componentInstance.ingredientes.at(0).markAllAsTouched();
        await actualizar();

        expect(mensaje()).toContain('100');
      });
    });

    it('[I] los campos numéricos de la ficha aclaran con un ejemplo que sólo aceptan números', () => {
      const campos = Array.from(
        fixture.nativeElement.querySelectorAll('.fila-campos input'),
      ) as HTMLInputElement[];

      expect(campos.map((campo) => campo.placeholder)).toEqual([
        'Sólo números, ej. 4',
        'Sólo números, ej. 30',
        'Sólo números, ej. 250',
      ]);
    });

    it('[B] la cantidad debe ser mayor que 0 y tener hasta 2 decimales', async () => {
      fixture.componentInstance.formulario.patchValue(formularioValido);

      for (const cantidad of [0, -1, 0.255, 100001]) {
        cargarIngredientes([{ nombre: 'Harina', cantidad, unidad: 'g' }]);
        await enviar();
        http.expectNone({ method: 'POST', url: URL });
      }

      cargarIngredientes([{ nombre: 'Harina', cantidad: 0.25, unidad: 'kg' }]);
      await enviar();
      http.expectOne({ method: 'POST', url: URL });
    });

    it('[I] se pueden agregar y quitar ingredientes, hasta 40', async () => {
      const { componentInstance } = fixture;
      const filas = () => fixture.nativeElement.querySelectorAll('.ingrediente-fila').length;
      expect(filas()).toBe(1);

      fixture.nativeElement.querySelector('fieldset .boton-agregar').click();
      await actualizar();
      expect(filas()).toBe(2);

      fixture.nativeElement.querySelector('.ingrediente-fila .boton-icono').click();
      await actualizar();
      expect(filas()).toBe(1);

      const agregar = () => fixture.nativeElement.querySelector('fieldset .boton-agregar');
      for (let vez = 0; vez < 50; vez++) {
        agregar().click();
        await actualizar();
      }
      expect(componentInstance.ingredientes.length).toBe(40);
      expect(agregar().disabled).toBe(true);
    });

    it('[I] la ficha se envía con sus números y el costo elegido', async () => {
      fixture.componentInstance.formulario.patchValue({
        ...formularioValido,
        porciones: '4',
        tiempoMinutos: '19',
        calorias: '270',
      });
      fixture.componentInstance.elegirCosto(2);
      await enviar();
      const cuerpo = http.expectOne({ method: 'POST', url: URL }).request.body as FormData;

      expect(cuerpo.get('porciones')).toBe('4');
      expect(cuerpo.get('tiempoMinutos')).toBe('19');
      expect(cuerpo.get('calorias')).toBe('270');
      expect(cuerpo.get('costo')).toBe('2');
    });

    it('[I] la ficha es opcional: vacía no envía ningún dato', async () => {
      fixture.componentInstance.formulario.patchValue(formularioValido);
      await enviar();
      const cuerpo = http.expectOne({ method: 'POST', url: URL }).request.body as FormData;

      for (const campo of ['porciones', 'tiempoMinutos', 'calorias', 'costo']) {
        expect(cuerpo.has(campo), campo).toBe(false);
      }
    });

    it('[E] la ficha sólo acepta enteros de 1 al máximo, escritos con dígitos', async () => {
      fixture.componentInstance.formulario.patchValue(formularioValido);
      const malos = [
        ' 4',
        'abc',
        '0',
        '1.5',
        '-2',
        '1e2',
        '0x10',
        '101',
        '2; DROP TABLE x',
        "1' OR '1'='1",
        '<b>1</b>',
        '{"$gt":0}',
      ];

      for (const valor of malos) {
        fixture.componentInstance.formulario.patchValue({ porciones: valor });
        await enviar();
        http.expectNone({ method: 'POST', url: URL });
        expect(fixture.componentInstance.mensajeDeError('porciones'), valor).toContain('entero');
      }

      fixture.componentInstance.formulario.patchValue({ porciones: '100' });
      await enviar();
      http.expectOne({ method: 'POST', url: URL });
    });

    it('[B] el tiempo llega hasta 10080 y las calorías hasta 10000', async () => {
      fixture.componentInstance.formulario.patchValue({
        ...formularioValido,
        tiempoMinutos: '10081',
      });
      await enviar();
      http.expectNone({ method: 'POST', url: URL });

      fixture.componentInstance.formulario.patchValue({
        tiempoMinutos: '10080',
        calorias: '10001',
      });
      await enviar();
      http.expectNone({ method: 'POST', url: URL });

      fixture.componentInstance.formulario.patchValue({ calorias: '10000' });
      await enviar();
      http.expectOne({ method: 'POST', url: URL });
    });

    it('[I] los campos numéricos de la ficha descartan lo que no es un dígito al escribir', async () => {
      const campos = fixture.nativeElement.querySelectorAll(
        '.fila-campos input',
      ) as NodeListOf<HTMLInputElement>;
      expect(campos).toHaveLength(3);

      for (const campo of Array.from(campos)) {
        campo.value = 'a1-b2.3e4 ';
        campo.dispatchEvent(new Event('input'));
      }
      await actualizar();

      const { porciones, tiempoMinutos, calorias } =
        fixture.componentInstance.formulario.getRawValue();
      expect([porciones, tiempoMinutos, calorias]).toEqual(['1234', '1234', '1234']);
      expect(Array.from(campos).map((campo) => campo.value)).toEqual(['1234', '1234', '1234']);
    });

    it('[I] cada ingrediente es una sola línea: cantidad, medida y nombre', async () => {
      const fila = fixture.nativeElement.querySelector('.ingrediente-fila') as HTMLElement;
      const controles = Array.from(fila.querySelectorAll('input, select, button')).map(
        (control) => control.getAttribute('formcontrolname') ?? 'quitar',
      );

      expect(controles).toEqual(['cantidad', 'unidad', 'nombre', 'quitar']);
    });

    it('[I] tocar el costo elegido de nuevo lo quita', async () => {
      fixture.componentInstance.elegirCosto(3);
      expect(fixture.componentInstance.costo()).toBe(3);

      fixture.componentInstance.elegirCosto(3);
      expect(fixture.componentInstance.costo()).toBeNull();
    });

    it('[I] con tip o experiencia no envía la ficha', async () => {
      fixture.componentInstance.tipo.set('tip');
      fixture.componentInstance.formulario.patchValue({ ...formularioValido, porciones: '4' });
      fixture.componentInstance.elegirCosto(2);
      await enviar();
      const cuerpo = http.expectOne({ method: 'POST', url: URL }).request.body as FormData;

      expect(cuerpo.has('porciones')).toBe(false);
      expect(cuerpo.has('costo')).toBe(false);
    });

    it('[I] se pueden agregar y quitar pasos, hasta 40, y se numeran en orden', async () => {
      const filas = () => fixture.nativeElement.querySelectorAll('.paso-fila');
      const agregar = () => fixture.nativeElement.querySelectorAll('fieldset .boton-agregar')[1];
      expect(filas()).toHaveLength(1);

      agregar().click();
      await actualizar();
      expect(
        Array.from(filas()).map(
          (fila) => (fila as HTMLElement).querySelector('.numero-paso')!.textContent,
        ),
      ).toEqual(['1', '2']);

      filas()[0].querySelector('.boton-icono').click();
      await actualizar();
      expect(filas()).toHaveLength(1);

      for (let vez = 0; vez < 50; vez++) {
        agregar().click();
        await actualizar();
      }
      expect(fixture.componentInstance.pasos.length).toBe(40);
      expect(agregar().disabled).toBe(true);
    });

    describe('reordenar pasos', () => {
      const textos = () => fixture.componentInstance.pasos.getRawValue();
      const numeros = () =>
        Array.from(fixture.nativeElement.querySelectorAll('.paso-fila .numero-paso')).map(
          (numero) => (numero as HTMLElement).textContent,
        );

      beforeEach(async () => {
        const agregar = () =>
          fixture.nativeElement.querySelectorAll('fieldset .boton-agregar')[1] as HTMLButtonElement;
        agregar().click();
        await actualizar();
        agregar().click();
        await actualizar();
        fixture.componentInstance.pasos.setValue(['Mezclar', 'Hornear', 'Servir']);
        await actualizar();
      });

      it('[O] al soltar un paso en otra posición se reordenan los pasos', async () => {
        fixture.componentInstance.soltarPaso({ previousIndex: 0, currentIndex: 2 } as never);

        expect(textos()).toEqual(['Hornear', 'Servir', 'Mezclar']);
      });

      it('[B] soltarlo en el mismo lugar, o mover afuera de los extremos, no cambia nada', () => {
        fixture.componentInstance.soltarPaso({ previousIndex: 1, currentIndex: 1 } as never);
        fixture.componentInstance.moverPaso(0, -1);
        fixture.componentInstance.moverPaso(2, 3);

        expect(textos()).toEqual(['Mezclar', 'Hornear', 'Servir']);
      });

      it('[I] con el teclado, flecha abajo y arriba en la manija mueven el paso', async () => {
        const manija = (posicion: number) =>
          fixture.nativeElement.querySelectorAll('.paso-fila .manija')[posicion] as HTMLElement;

        manija(0).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
        await actualizar();
        expect(textos()).toEqual(['Hornear', 'Mezclar', 'Servir']);
        const areas = fixture.nativeElement.querySelectorAll('.paso-fila textarea');
        expect(Array.from(areas).map((area) => (area as HTMLTextAreaElement).value)).toEqual([
          'Hornear',
          'Mezclar',
          'Servir',
        ]);
        expect(numeros()).toEqual(['1', '2', '3']);

        manija(2).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
        await actualizar();
        expect(textos()).toEqual(['Hornear', 'Servir', 'Mezclar']);
      });

      it('[I] se envían en el orden nuevo', async () => {
        fixture.componentInstance.formulario.patchValue(formularioValido);
        fixture.componentInstance.moverPaso(2, 0);
        await enviar();
        const cuerpo = http.expectOne({ method: 'POST', url: URL }).request.body as FormData;

        expect(JSON.parse(cuerpo.get('pasos') as string)).toEqual(['Servir', 'Mezclar', 'Hornear']);
      });

      it('[I] cada paso tiene una manija con nombre accesible', () => {
        const manijas = fixture.nativeElement.querySelectorAll('.paso-fila .manija');

        expect(manijas).toHaveLength(3);
        expect(manijas[1].getAttribute('aria-label')).toContain('2');
      });
    });

    it('[B] un paso de 500 caracteres envía y uno de 501 no', async () => {
      fixture.componentInstance.formulario.patchValue(formularioValido);
      cargarPasos(['a'.repeat(501)]);
      await enviar();
      http.expectNone({ method: 'POST', url: URL });

      cargarPasos(['a'.repeat(500)]);
      await enviar();
      http.expectOne({ method: 'POST', url: URL });
    });

    it('[I] al elegir "a gusto" la cantidad se vacía y se desactiva', async () => {
      const fila = fixture.componentInstance.ingredientes.at(0);
      fila.patchValue({ cantidad: 3 });

      fila.controls.unidad.setValue('a_gusto');
      fixture.componentInstance.alCambiarUnidad(fila);
      expect(fila.controls.cantidad.disabled).toBe(true);
      expect(fila.controls.cantidad.value).toBeNull();

      fila.controls.unidad.setValue('kg');
      fixture.componentInstance.alCambiarUnidad(fila);
      expect(fila.controls.cantidad.enabled).toBe(true);
    });

    it('[I] con tip o experiencia no envía ingredientes ni pasos', async () => {
      fixture.componentInstance.tipo.set('tip');
      fixture.componentInstance.formulario.patchValue(formularioValido);
      cargarPasos(['Tostar']);
      cargarIngredientes([{ nombre: 'Pan', cantidad: 1, unidad: 'unidad' }]);
      await enviar();
      const cuerpo = http.expectOne({ method: 'POST', url: URL }).request.body as FormData;

      expect(cuerpo.has('ingredientes')).toBe(false);
      expect(cuerpo.has('pasos')).toBe(false);
    });

    it('[I] ingredientes y pasos sólo aparecen en receta y completa', async () => {
      const campos = () => fixture.nativeElement.querySelectorAll('textarea').length;
      const filas = () => fixture.nativeElement.querySelectorAll('.ingrediente-fila').length;
      expect([campos(), filas()]).toEqual([2, 1]);

      fixture.componentInstance.tipo.set('tip');
      await actualizar();
      expect([campos(), filas()]).toEqual([1, 0]);

      fixture.componentInstance.tipo.set('completa');
      await actualizar();
      expect([campos(), filas()]).toEqual([2, 1]);
    });

    it('[B] un título de 55 caracteres envía y uno de 56 no', async () => {
      fixture.componentInstance.formulario.patchValue({ titulo: 'a'.repeat(56), mensaje: 'x' });
      await enviar();
      http.expectNone({ method: 'POST', url: URL });
      expect(fixture.componentInstance.mensajeDeError('titulo')).toContain('55');

      fixture.componentInstance.formulario.patchValue({ titulo: 'a'.repeat(55), mensaje: 'x' });
      await enviar();
      http.expectOne({ method: 'POST', url: URL });
    });

    it('[B] un mensaje de 2000 caracteres envía y uno de 2001 no', async () => {
      fixture.componentInstance.formulario.patchValue({ titulo: 'x', mensaje: 'a'.repeat(2001) });
      await enviar();
      http.expectNone({ method: 'POST', url: URL });
      expect(fixture.componentInstance.mensajeDeError('mensaje')).toContain('2000');

      fixture.componentInstance.formulario.patchValue({ titulo: 'x', mensaje: 'a'.repeat(2000) });
      await enviar();
      http.expectOne({ method: 'POST', url: URL });
    });

    it('[E] una imagen inválida muestra el error y bloquea el envío', async () => {
      fixture.componentInstance.formulario.patchValue(formularioValido);
      fixture.componentInstance.elegirImagen({
        target: { files: [new File(['x'], 'nota.pdf', { type: 'application/pdf' })] },
      } as unknown as Event);

      await enviar();

      http.expectNone({ method: 'POST', url: URL });
      expect(fixture.componentInstance.errorImagen()).toBe('imagen.tipo');
    });

    it('[E] si la API rechaza la publicación avisa y conserva lo escrito', async () => {
      fixture.componentInstance.formulario.patchValue(formularioValido);

      await enviar();
      http
        .expectOne({ method: 'POST', url: URL })
        .flush(
          { message: ['titulo should not be empty'] },
          { status: 400, statusText: 'Bad Request' },
        );
      await actualizar();

      expect(fixture.nativeElement.querySelector('app-aviso')).not.toBeNull();
      expect(fixture.componentInstance.formulario.getRawValue().titulo).toBe('Hola');
      expect(fixture.componentInstance.publicando()).toBe(false);
    });

    it('[S] mientras espera la respuesta no publica dos veces', async () => {
      fixture.componentInstance.formulario.patchValue(formularioValido);

      await enviar();
      await enviar();

      http.expectOne({ method: 'POST', url: URL });
    });
  });

  describe('sesión', () => {
    const quitarVisibilidad = () =>
      delete (document as unknown as Record<string, unknown>)['visibilityState'];

    afterEach(() => {
      quitarVisibilidad();
      vi.useRealTimers();
    });

    it('[O] al entrar pide extender la sesión y guarda el token nuevo', () => {
      http.expectOne({ method: 'POST', url: REFRESCAR }).flush({ token: 'token-nuevo' });

      expect(TestBed.inject(Auth).token()).toBe('token-nuevo');
    });

    it('[S] mientras la pantalla está abierta la extiende cada 5 minutos', () => {
      http.match(REFRESCAR);
      vi.useFakeTimers();
      const otra = TestBed.createComponent(NuevaPublicacion);
      otra.detectChanges();
      expect(http.match(REFRESCAR)).toHaveLength(1);

      vi.advanceTimersByTime(5 * 60 * 1000 - 1);
      expect(http.match(REFRESCAR)).toHaveLength(0);
      vi.advanceTimersByTime(1);
      expect(http.match(REFRESCAR)).toHaveLength(1);
      vi.advanceTimersByTime(5 * 60 * 1000);
      expect(http.match(REFRESCAR)).toHaveLength(1);

      otra.destroy();
      vi.advanceTimersByTime(60 * 60 * 1000);
      expect(http.match(REFRESCAR)).toHaveLength(0);
    });

    it('[I] al volver a mostrar la pestaña la extiende enseguida', () => {
      http.match(REFRESCAR);
      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });

      document.dispatchEvent(new Event('visibilitychange'));

      expect(http.match(REFRESCAR)).toHaveLength(1);
    });

    it('[E] si la sesión ya venció avisa, conserva lo escrito y ofrece ingresar de nuevo', async () => {
      fixture.componentInstance.formulario.patchValue({ titulo: 'Hola' });
      http
        .expectOne({ method: 'POST', url: REFRESCAR })
        .flush({ codigo: 'TOKEN_INVALIDO' }, { status: 401, statusText: 'Unauthorized' });
      await actualizar();

      const texto = fixture.nativeElement.textContent as string;
      expect(texto).toContain('No se pudo extender tu sesión');
      expect(texto).toContain('Tu sesión no es válida o venció');
      expect(texto).toContain('Tu borrador está guardado');
      expect(fixture.componentInstance.formulario.getRawValue().titulo).toBe('Hola');
    });

    it('[E] "Ingresar de nuevo" guarda el borrador, cierra la sesión y va al login', async () => {
      fixture.componentInstance.formulario.patchValue({ titulo: 'Hola' });
      http
        .expectOne({ method: 'POST', url: REFRESCAR })
        .flush({ codigo: 'TOKEN_INVALIDO' }, { status: 401, statusText: 'Unauthorized' });
      await actualizar();

      const boton = Array.from(
        fixture.nativeElement.querySelectorAll('app-aviso button') as NodeListOf<HTMLButtonElement>,
      ).find((candidato) => candidato.textContent?.includes('Ingresar de nuevo'))!;
      boton.click();

      expect(navegar).toHaveBeenCalledWith(['/login']);
      expect(TestBed.inject(Auth).token()).toBeNull();
      expect(JSON.parse(localStorage.getItem('borrador:u1')!).titulo).toBe('Hola');
    });

    it('[B] un corte de red al extender no muestra ningún aviso', async () => {
      http.expectOne({ method: 'POST', url: REFRESCAR }).error(new ProgressEvent('error'));
      await actualizar();

      expect(fixture.nativeElement.querySelector('app-aviso')).toBeNull();
    });
  });

  describe('borrador', () => {
    const formularioValido = { titulo: 'Hola', mensaje: 'Primer mensaje' };
    const guardado = () => JSON.parse(localStorage.getItem('borrador:u1') ?? 'null');
    const texto = () => fixture.nativeElement.textContent as string;

    const enviar = async () => {
      fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
      await fixture.whenStable();
    };

    const abrirConBorrador = async () => {
      TestBed.inject(Borrador).guardar({
        tipo: 'completa',
        titulo: 'Crema de albahaca',
        mensaje: 'Versátil',
        porciones: '4',
        tiempoMinutos: '19',
        calorias: '270',
        costo: 2,
        ingredientes: [
          { cantidad: 1, unidad: 'taza', nombre: 'albahaca' },
          { cantidad: null, unidad: 'a_gusto', nombre: 'sal' },
        ],
        pasos: ['Cortar', 'Mezclar'],
      });
      const otra = TestBed.createComponent(NuevaPublicacion);
      otra.detectChanges();
      await otra.whenStable();
      return otra;
    };

    afterEach(() => vi.useRealTimers());

    it('[O] guarda lo escrito después de una pausa, no en cada tecla', () => {
      vi.useFakeTimers();
      const otra = TestBed.createComponent(NuevaPublicacion);
      otra.detectChanges();

      otra.componentInstance.formulario.patchValue({ titulo: 'Hol' });
      vi.advanceTimersByTime(500);
      otra.componentInstance.formulario.patchValue({ titulo: 'Hola' });
      vi.advanceTimersByTime(799);
      expect(guardado()).toBeNull();

      vi.advanceTimersByTime(1);
      expect(guardado().titulo).toBe('Hola');
    });

    it('[O] elegir el tipo o el costo también cuenta como cambio', () => {
      vi.useFakeTimers();
      const otra = TestBed.createComponent(NuevaPublicacion);
      otra.detectChanges();

      otra.componentInstance.elegirCosto(3);
      otra.detectChanges();
      vi.advanceTimersByTime(800);

      expect(guardado().costo).toBe(3);
    });

    it('[Z] si no hay nada escrito no deja borrador ni lo anuncia', async () => {
      fixture.componentInstance.guardarBorrador();
      await actualizar();

      expect(guardado()).toBeNull();
      expect(texto()).not.toContain('Borrador guardado');
    });

    it('[I] avisa cuándo se guardó el borrador', async () => {
      fixture.componentInstance.formulario.patchValue(formularioValido);
      fixture.componentInstance.guardarBorrador();
      await actualizar();

      expect(texto()).toContain('Borrador guardado el');
    });

    it('[O] al volver a abrir recupera todo lo que había y lo avisa', async () => {
      const otra = await abrirConBorrador();
      const pagina = otra.componentInstance;

      expect(pagina.tipo()).toBe('completa');
      expect(pagina.costo()).toBe(2);
      expect(pagina.formulario.getRawValue()).toEqual({
        titulo: 'Crema de albahaca',
        mensaje: 'Versátil',
        porciones: '4',
        tiempoMinutos: '19',
        calorias: '270',
        ingredientes: [
          { cantidad: 1, unidad: 'taza', nombre: 'albahaca' },
          { cantidad: null, unidad: 'a_gusto', nombre: 'sal' },
        ],
        pasos: ['Cortar', 'Mezclar'],
      });
      expect(pagina.ingredientes.at(1).controls.cantidad.disabled).toBe(true);
      expect(otra.nativeElement.querySelectorAll('.ingrediente-fila')).toHaveLength(2);
      expect(otra.nativeElement.querySelectorAll('.paso-fila')).toHaveLength(2);
      expect(otra.nativeElement.textContent).toContain('Recuperamos tu borrador');
      expect(otra.nativeElement.textContent).toContain('La foto no se guarda en el borrador');
    });

    it('[I] recuperar el borrador no lo vuelve a guardar con otra fecha', async () => {
      vi.useFakeTimers();
      TestBed.inject(Borrador).guardar({
        tipo: 'receta',
        titulo: 'Hola',
        mensaje: '',
        porciones: '',
        tiempoMinutos: '',
        calorias: '',
        costo: null,
        ingredientes: [],
        pasos: [],
      });
      const antes = guardado().guardadoEn;
      vi.advanceTimersByTime(60 * 1000);
      const otra = TestBed.createComponent(NuevaPublicacion);
      otra.detectChanges();
      vi.advanceTimersByTime(5000);

      expect(guardado().guardadoEn).toBe(antes);
      expect(otra.componentInstance.borradorRecuperado()).toBe(antes);
    });

    it('[I] "Descartar borrador" vacía el formulario y borra lo guardado', async () => {
      const otra = await abrirConBorrador();
      const descartar = Array.from(
        otra.nativeElement.querySelectorAll('app-aviso button') as NodeListOf<HTMLButtonElement>,
      ).find((boton) => boton.textContent?.includes('Descartar borrador'))!;

      descartar.click();
      otra.detectChanges();

      expect(guardado()).toBeNull();
      expect(otra.componentInstance.formulario.getRawValue().titulo).toBe('');
      expect(otra.componentInstance.tipo()).toBe('receta');
      expect(otra.componentInstance.costo()).toBeNull();
      expect(otra.nativeElement.textContent).not.toContain('Recuperamos tu borrador');
    });

    it('[I] cerrar el aviso de recuperado no borra el borrador', async () => {
      const otra = await abrirConBorrador();

      otra.componentInstance.borradorRecuperado.set(null);

      expect(guardado().titulo).toBe('Crema de albahaca');
    });

    it('[I] salir de la pantalla guarda lo escrito sin esperar la pausa', () => {
      fixture.componentInstance.formulario.patchValue(formularioValido);

      fixture.destroy();

      expect(guardado().titulo).toBe('Hola');
    });

    it('[I] cerrar o recargar la pestaña guarda lo escrito', () => {
      fixture.componentInstance.formulario.patchValue(formularioValido);

      window.dispatchEvent(new Event('beforeunload'));

      expect(guardado().mensaje).toBe('Primer mensaje');
    });

    it('[I] ocultar la pestaña guarda lo escrito', () => {
      fixture.componentInstance.formulario.patchValue(formularioValido);
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });

      document.dispatchEvent(new Event('visibilitychange'));
      delete (document as unknown as Record<string, unknown>)['visibilityState'];

      expect(guardado().titulo).toBe('Hola');
    });

    it('[O] al publicar se borra el borrador y no reaparece al salir', async () => {
      fixture.componentInstance.formulario.patchValue(formularioValido);
      fixture.componentInstance.guardarBorrador();
      expect(guardado()).not.toBeNull();

      await enviar();
      http.expectOne({ method: 'POST', url: URL }).flush(publicacion(1));
      fixture.destroy();

      expect(guardado()).toBeNull();
    });

    it('[E] si la API rechaza la publicación el borrador sigue guardado', async () => {
      fixture.componentInstance.formulario.patchValue(formularioValido);

      await enviar();
      http
        .expectOne({ method: 'POST', url: URL })
        .flush({ codigo: 'DATOS_INVALIDOS' }, { status: 400, statusText: 'Bad Request' });
      fixture.destroy();

      expect(guardado().titulo).toBe('Hola');
    });

    it('[S] el borrador de otra persona no se muestra', async () => {
      TestBed.inject(Borrador).guardar({
        tipo: 'receta',
        titulo: 'Ajeno',
        mensaje: '',
        porciones: '',
        tiempoMinutos: '',
        calorias: '',
        costo: null,
        ingredientes: [],
        pasos: [],
      });
      TestBed.inject(Auth).usuario.set({ ...usuarioPrueba, _id: 'u2' });

      const otra = TestBed.createComponent(NuevaPublicacion);
      otra.detectChanges();

      expect(otra.componentInstance.formulario.getRawValue().titulo).toBe('');
      expect(otra.componentInstance.borradorRecuperado()).toBeNull();
    });
  });
});
