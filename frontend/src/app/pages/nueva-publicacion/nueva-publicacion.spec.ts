import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { Publicacion } from '../../interfaces/publicacion';
import { Auth } from '../../servicios/auth/auth';
import { FotosBorrador } from '../../servicios/fotos-borrador/fotos-borrador';
import { Idioma } from '../../servicios/idioma/idioma';
import { Borrador } from '../../servicios/borrador/borrador';
import { NuevaPublicacion } from './nueva-publicacion';
import { proveerIdiomaDePrueba } from '../../../testing/idioma';
import { usuarioDePrueba } from '../../../testing/usuario';

const URL = `${environment.API_URL}/publicaciones`;
const REFRESCAR = `${environment.API_URL}/auth/refrescar`;

const publicacion = (numero: number): Publicacion => ({
  _id: `id${numero}`,
  usuario: { _id: 'u1', nombre: 'Laura', apellido: 'Carelli', nombreUsuario: 'laura_c' },
  tipo: 'experiencia',
  cantidadMeGusta: 0,
  cantidadComentarios: 0,
  titulo: `Título ${numero}`,
  mensaje: `Mensaje ${numero}`,
  fecha: '2026-10-22T15:30:00',
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
    TestBed.inject(Auth).usuario.set(usuarioDePrueba);
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

      expect(http.match({ method: 'POST', url: URL })).toHaveLength(0);
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
      const body = http.expectOne({ method: 'POST', url: URL }).request.body as FormData;

      expect(body.get('titulo')).toBe('Hola');
      expect(body.get('mensaje')).toBe('Mundo');
      expect((body.get('imagen') as File).name).toBe('foto.png');
    });

    it('[I] envía el tipo receta por defecto', async () => {
      fixture.componentInstance.formulario.patchValue(formularioValido);
      await enviar();
      const body = http.expectOne({ method: 'POST', url: URL }).request.body as FormData;

      expect(body.get('tipo')).toBe('receta');
    });

    it('[I] envía el tipo que se eligió', async () => {
      fixture.componentInstance.tipo.set('experiencia');
      fixture.componentInstance.formulario.patchValue(formularioValido);
      await enviar();
      const body = http.expectOne({ method: 'POST', url: URL }).request.body as FormData;

      expect(body.get('tipo')).toBe('experiencia');
    });

    const cargarPasos = (textos: string[]) => {
      const { pasos } = fixture.componentInstance;
      pasos.clear();
      textos.forEach(() => fixture.componentInstance.agregarPaso());
      pasos.setValue(textos.map((texto) => ({ titulo: '', texto })));
    };

    const cargarIngredientes = (filas: object[]) => {
      const { ingredientes } = fixture.componentInstance;
      ingredientes.clear();
      filas.forEach(() => fixture.componentInstance.agregarIngrediente());
      ingredientes.patchValue(filas);
    };

    it('[I] con receta envía los ingredientes como lista y los pasos si hay', async () => {
      fixture.componentInstance.formulario.patchValue(formularioValido);
      cargarPasos([' Mezclar ', '', 'Hornear']);
      cargarIngredientes([
        { nombre: ' Harina ', cantidad: 250, unidad: 'g' },
        { nombre: 'Huevo', cantidad: 2, unidad: 'unidad' },
      ]);
      await enviar();
      const body = http.expectOne({ method: 'POST', url: URL }).request.body as FormData;

      expect(JSON.parse(body.get('ingredientes') as string)).toEqual([
        { nombre: 'Harina', cantidad: 250, unidad: 'g' },
        { nombre: 'Huevo', cantidad: 2, unidad: 'unidad' },
      ]);
      expect(JSON.parse(body.get('pasos') as string)).toEqual([
        { texto: 'Mezclar' },
        { texto: 'Hornear' },
      ]);
    });

    it('[I] "a gusto" se envía sin cantidad', async () => {
      fixture.componentInstance.formulario.patchValue(formularioValido);
      cargarIngredientes([{ nombre: 'Sal', cantidad: 5, unidad: 'a_gusto' }]);
      await enviar();
      const body = http.expectOne({ method: 'POST', url: URL }).request.body as FormData;

      expect(JSON.parse(body.get('ingredientes') as string)).toEqual([
        { nombre: 'Sal', unidad: 'a_gusto' },
      ]);
    });

    it('[I] las filas vacías se ignoran y, si no queda ninguna, no se envía la lista', async () => {
      fixture.componentInstance.formulario.patchValue(formularioValido);
      await enviar();
      const body = http.expectOne({ method: 'POST', url: URL }).request.body as FormData;

      expect(body.has('ingredientes')).toBe(false);
    });

    it('[E] un ingrediente sin cantidad, o con cantidad y sin nombre, bloquea el envío', async () => {
      fixture.componentInstance.formulario.patchValue(formularioValido);

      cargarIngredientes([{ nombre: 'Harina', cantidad: null, unidad: 'g' }]);
      await enviar();
      expect(http.match({ method: 'POST', url: URL })).toHaveLength(0);

      cargarIngredientes([{ nombre: '  ', cantidad: 3, unidad: 'g' }]);
      await enviar();
      expect(http.match({ method: 'POST', url: URL })).toHaveLength(0);
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
        fixture.nativeElement.querySelectorAll('.ficha-campos input'),
      ) as HTMLInputElement[];

      expect(campos.map((campo) => campo.placeholder)).toEqual([
        'Sólo números, ej. 4',
        'Sólo números, ej. 250',
        'Sólo números, ej. 30',
      ]);
    });

    it('[B] la cantidad debe ser mayor que 0 y tener hasta 2 decimales', async () => {
      fixture.componentInstance.formulario.patchValue(formularioValido);

      for (const cantidad of [0, -1, 0.255, 100001]) {
        cargarIngredientes([{ nombre: 'Harina', cantidad, unidad: 'g' }]);
        await enviar();
        expect(http.match({ method: 'POST', url: URL })).toHaveLength(0);
      }

      cargarIngredientes([{ nombre: 'Harina', cantidad: 0.25, unidad: 'kg' }]);
      await enviar();
      expect(http.match({ method: 'POST', url: URL })).toHaveLength(1);
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
      const body = http.expectOne({ method: 'POST', url: URL }).request.body as FormData;

      expect(body.get('porciones')).toBe('4');
      expect(body.get('tiempoMinutos')).toBe('19');
      expect(body.get('calorias')).toBe('270');
      expect(body.get('costo')).toBe('2');
    });

    it('[I] la ficha es opcional: vacía no envía ningún dato', async () => {
      fixture.componentInstance.formulario.patchValue(formularioValido);
      await enviar();
      const body = http.expectOne({ method: 'POST', url: URL }).request.body as FormData;

      for (const campo of ['porciones', 'tiempoMinutos', 'calorias', 'costo']) {
        expect(body.has(campo), campo).toBe(false);
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
        expect(http.match({ method: 'POST', url: URL })).toHaveLength(0);
        expect(fixture.componentInstance.mensajeDeError('porciones'), valor).toContain('entero');
      }

      fixture.componentInstance.formulario.patchValue({ porciones: '100' });
      await enviar();
      expect(http.match({ method: 'POST', url: URL })).toHaveLength(1);
    });

    it('[B] el tiempo llega hasta 10080 y las calorías hasta 10000', async () => {
      fixture.componentInstance.formulario.patchValue({
        ...formularioValido,
        tiempoMinutos: '10081',
      });
      await enviar();
      expect(http.match({ method: 'POST', url: URL })).toHaveLength(0);

      fixture.componentInstance.formulario.patchValue({
        tiempoMinutos: '10080',
        calorias: '10001',
      });
      await enviar();
      expect(http.match({ method: 'POST', url: URL })).toHaveLength(0);

      fixture.componentInstance.formulario.patchValue({ calorias: '10000' });
      await enviar();
      expect(http.match({ method: 'POST', url: URL })).toHaveLength(1);
    });

    it('[I] los campos numéricos de la ficha descartan lo que no es un dígito al escribir', async () => {
      const campos = fixture.nativeElement.querySelectorAll(
        '.ficha-campos input',
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

    it('[I] cada ingrediente pide primero el nombre, luego la medida y al final la cantidad', async () => {
      const fila = fixture.nativeElement.querySelector('.ingrediente-fila') as HTMLElement;
      const controles = Array.from(fila.querySelectorAll('[formcontrolname]')).map((control) =>
        control.getAttribute('formcontrolname'),
      );

      expect(controles).toEqual(['nombre', 'cantidad']);
      expect(fila.querySelector('.medidas')).not.toBeNull();
    });

    it('[I] los ingredientes se numeran en el orden en que se agregan', async () => {
      const agregar = Array.from(fixture.nativeElement.querySelectorAll('.boton-agregar')).find(
        (boton) => (boton as HTMLElement).textContent?.includes('Agregar ingrediente'),
      );
      (agregar as HTMLButtonElement).click();
      (agregar as HTMLButtonElement).click();
      await actualizar();

      const numeros = Array.from(
        fixture.nativeElement.querySelectorAll('.ingrediente-fila .numero-paso'),
      ).map((numero) => (numero as HTMLElement).textContent?.trim());
      expect(numeros).toEqual(['1', '2', '3']);
    });

    const nombresDeMedidas = () =>
      Array.from(fixture.nativeElement.querySelectorAll('.ingrediente-fila .medidas-grupo')).map(
        (grupo) =>
          Array.from((grupo as HTMLElement).querySelectorAll('button')).map((boton) =>
            boton.textContent?.trim(),
          ),
      );

    it('[I] las medidas van por tamaño, de menor a mayor, en tres líneas y con la palabra completa', () => {
      expect(nombresDeMedidas()).toEqual([
        ['a gusto', 'pizca', 'cucharadita', 'cucharada'],
        ['gramos', 'kilogramos', 'mililitros', 'litros'],
        ['taza', 'unidad'],
      ]);
    });

    it('[S] al cambiar a inglés las medidas se traducen y mantienen su orden', async () => {
      TestBed.inject(Idioma).cambiar('en');
      await actualizar();

      expect(nombresDeMedidas()).toEqual([
        ['to taste', 'pinch', 'teaspoon', 'tablespoon'],
        ['grams', 'kilograms', 'milliliters', 'liters'],
        ['cup', 'unit'],
      ]);
    });

    it('[O] la medida elegida queda marcada y las demás no', async () => {
      const botones = Array.from(
        fixture.nativeElement.querySelectorAll('.medidas button'),
      ) as HTMLButtonElement[];
      botones.find((boton) => boton.textContent?.trim() === 'kilogramos')!.click();
      await actualizar();

      const marcadas = Array.from(
        fixture.nativeElement.querySelectorAll('.medidas [aria-pressed="true"]'),
      ).map((boton) => (boton as HTMLElement).textContent?.trim());
      expect(marcadas).toEqual(['kilogramos']);
    });

    describe('plantillas con solapa', () => {
      const solapas = () =>
        Array.from(
          fixture.nativeElement.querySelectorAll('.solapa') as NodeListOf<HTMLButtonElement>,
        );

      it('[O] cada plantilla es una solapa con el nombre de su categoría', () => {
        expect(solapas().map((solapa) => solapa.textContent!.trim())).toEqual([
          'Receta',
          'Tip culinario',
          'Experiencia',
        ]);
        expect(fixture.nativeElement.querySelector('.plantilla')).not.toBeNull();
      });

      it('[O] la solapa elegida queda marcada y cambia la plantilla', async () => {
        solapas()[1].click();
        await actualizar();

        expect(fixture.componentInstance.tipo()).toBe('tip');
        expect(solapas().map((solapa) => solapa.getAttribute('aria-pressed'))).toEqual([
          'false',
          'true',
          'false',
        ]);
        expect(solapas()[1].classList.contains('activa')).toBe(true);
        expect(fixture.nativeElement.querySelector('.ingrediente-fila')).toBeNull();
      });

      it('[B] no existe la plantilla de publicación completa', () => {
        expect(solapas().map((solapa) => solapa.textContent)).not.toContain(
          expect.stringContaining('completa'),
        );
      });
    });

    describe('porciones o unidades', () => {
      const opciones = () =>
        Array.from(
          fixture.nativeElement.querySelectorAll('.rinde-opcion') as NodeListOf<HTMLButtonElement>,
        );

      it('[O] por defecto rinde porciones y se puede cambiar a unidades', async () => {
        expect(opciones().map((opcion) => opcion.textContent!.trim())).toEqual([
          'Porciones',
          'Unidades',
        ]);
        expect(fixture.componentInstance.tipoRinde()).toBe('porciones');
        expect(opciones()[0].getAttribute('aria-pressed')).toBe('true');

        opciones()[1].click();
        await actualizar();

        expect(fixture.componentInstance.tipoRinde()).toBe('unidades');
        expect(opciones()[1].getAttribute('aria-pressed')).toBe('true');
      });

      it('[O] los botones y las calorías hablan de unidades cuando se elige unidades', async () => {
        opciones()[1].click();
        await actualizar();

        const etiquetas = Array.from(
          fixture.nativeElement.querySelectorAll('.contador button') as NodeListOf<HTMLElement>,
        ).map((boton) => boton.getAttribute('aria-label'));
        expect(etiquetas).toContain('Aumentar Unidades');
        expect(fixture.nativeElement.textContent).toContain('Calorías por unidad');
        expect(fixture.nativeElement.textContent).not.toContain('Calorías por porción');
      });

      it('[I] al publicar envía el tipo junto con la cantidad', async () => {
        fixture.componentInstance.formulario.patchValue({ ...formularioValido, porciones: '12' });
        opciones()[1].click();
        await actualizar();

        await enviar();

        const body = http.expectOne({ method: 'POST', url: URL }).request.body as FormData;
        expect(body.get('porciones')).toBe('12');
        expect(body.get('tipoRinde')).toBe('unidades');
      });

      it('[B] sin cantidad no envía el tipo', async () => {
        fixture.componentInstance.formulario.patchValue(formularioValido);
        opciones()[1].click();
        await actualizar();

        await enviar();

        const body = http.expectOne({ method: 'POST', url: URL }).request.body as FormData;
        expect(body.has('tipoRinde')).toBe(false);
        expect(body.has('porciones')).toBe(false);
      });
    });

    describe('ficha en columnas', () => {
      it('[O] porciones, calorías, tiempo y costo son cuatro cajas de la misma grilla', () => {
        const grilla = fixture.nativeElement.querySelector('.ficha-campos') as HTMLElement;
        const cajas = Array.from(grilla.children) as HTMLElement[];

        expect(cajas).toHaveLength(4);
        expect(cajas.every((caja) => caja.classList.contains('caja'))).toBe(true);
        expect(cajas[2].textContent).toContain('Tiempo de preparación');
        expect(cajas[3].textContent).toContain('Costo');
      });
    });

    describe('controles inteligentes', () => {
      const botonDe = (selector: string, etiqueta: string) =>
        Array.from(
          fixture.nativeElement.querySelectorAll(selector) as NodeListOf<HTMLButtonElement>,
        ).find((boton) => boton.getAttribute('aria-label') === etiqueta)!;
      const ficha = () => fixture.componentInstance.formulario.getRawValue();

      it('[O] el más de porciones arranca en 4 y suma de a uno; el menos baja y vuelve a vacío', async () => {
        botonDe('.contador button', 'Aumentar Porciones').click();
        expect(ficha().porciones).toBe('4');
        botonDe('.contador button', 'Aumentar Porciones').click();
        expect(ficha().porciones).toBe('5');

        for (let i = 0; i < 5; i++) {
          botonDe('.contador button', 'Disminuir Porciones').click();
        }
        expect(ficha().porciones).toBe('');
      });

      it('[O] las calorías suben y bajan de a 50', () => {
        botonDe('.contador button', 'Aumentar Calorías por porción').click();
        botonDe('.contador button', 'Aumentar Calorías por porción').click();

        expect(ficha().calorias).toBe('300');
      });

      it('[B] el contador no pasa del máximo de la ficha ni baja de 1', () => {
        fixture.componentInstance.formulario.patchValue({ porciones: '100' });
        botonDe('.contador button', 'Aumentar Porciones').click();
        expect(ficha().porciones).toBe('100');

        fixture.componentInstance.formulario.patchValue({ porciones: '1' });
        botonDe('.contador button', 'Disminuir Porciones').click();
        expect(ficha().porciones).toBe('');
      });

      it('[O] un tiempo habitual carga los minutos, lo marca y al tocarlo de nuevo lo quita', async () => {
        const chip = () =>
          Array.from(
            fixture.nativeElement.querySelectorAll(
              '.tipos button',
            ) as NodeListOf<HTMLButtonElement>,
          ).find((boton) => boton.textContent!.trim() === '1 h 30 min')!;

        chip().click();
        await actualizar();
        expect(ficha().tiempoMinutos).toBe('90');
        expect(chip().getAttribute('aria-pressed')).toBe('true');
        expect(fixture.nativeElement.textContent).toContain('Equivale a 1 h 30 min');

        chip().click();
        expect(ficha().tiempoMinutos).toBe('');
      });

      it('[O] el costo se ilumina hasta el nivel elegido y dice cuál es', async () => {
        const signos = () =>
          Array.from(
            fixture.nativeElement.querySelectorAll('.costo-signo') as NodeListOf<HTMLElement>,
          );

        signos()[2].click();
        await actualizar();

        expect(signos().map((signo) => signo.classList.contains('activo'))).toEqual([
          true,
          true,
          true,
          false,
        ]);
        expect(fixture.nativeElement.textContent).toContain('Algo caro');
      });

      it('[O] el más y el menos de la cantidad usan el paso de la medida', async () => {
        const fila = fixture.componentInstance.ingredientes.at(0);
        const mas = () =>
          fixture.nativeElement.querySelector(
            '.cantidad-paso button:last-of-type',
          ) as HTMLButtonElement;
        const menos = () =>
          fixture.nativeElement.querySelector('.cantidad-paso button') as HTMLButtonElement;

        mas().click();
        expect(fila.controls.cantidad.value).toBe(50);

        fila.controls.unidad.setValue('taza');
        fila.controls.cantidad.setValue(1);
        mas().click();
        expect(fila.controls.cantidad.value).toBe(1.25);

        fila.controls.cantidad.setValue(0.25);
        menos().click();
        expect(fila.controls.cantidad.value).toBeNull();
      });

      const elegirUnidad = async (unidad: string) => {
        const nombre = {
          g: 'gramos',
          kg: 'kilogramos',
          ml: 'mililitros',
          l: 'litros',
          taza: 'taza',
          cucharada: 'cucharada',
          cucharadita: 'cucharadita',
          unidad: 'unidad',
          pizca: 'pizca',
          a_gusto: 'a gusto',
        }[unidad];
        const botones = Array.from(
          fixture.nativeElement.querySelectorAll('.medidas button'),
        ) as HTMLButtonElement[];
        botones.find((boton) => boton.textContent?.trim() === nombre)!.click();
        await actualizar();
      };
      const fraccion = (texto: string) =>
        Array.from(
          fixture.nativeElement.querySelectorAll('.fraccion') as NodeListOf<HTMLButtonElement>,
        ).find((boton) => boton.textContent!.trim() === texto)!;

      it('[O] las fracciones se ven siempre, sin pasar el mouse, sólo en medidas que las usan', async () => {
        expect(fixture.nativeElement.querySelector('.fracciones')).toBeNull();

        for (const unidad of ['taza', 'cucharada', 'cucharadita', 'unidad', 'kg', 'l']) {
          await elegirUnidad(unidad);
          expect(fixture.nativeElement.querySelectorAll('.fraccion'), unidad).toHaveLength(3);
        }
        for (const unidad of ['g', 'ml', 'pizca', 'a_gusto']) {
          await elegirUnidad(unidad);
          expect(fixture.nativeElement.querySelector('.fracciones'), unidad).toBeNull();
        }
      });

      it('[O] las fracciones suman a la parte entera y al tocarlas de nuevo se quitan', async () => {
        const fila = fixture.componentInstance.ingredientes.at(0);
        await elegirUnidad('taza');

        fila.controls.cantidad.setValue(2);
        fraccion('½').click();
        expect(fila.controls.cantidad.value).toBe(2.5);

        fraccion('¾').click();
        expect(fila.controls.cantidad.value).toBe(2.75);

        fraccion('¾').click();
        expect(fila.controls.cantidad.value).toBe(2);
      });

      it('[E] con la medida "a gusto" no hay fracciones ni botones de cantidad activos', async () => {
        const fila = fixture.componentInstance.ingredientes.at(0);
        fila.controls.unidad.setValue('a_gusto');
        fixture.componentInstance.alCambiarUnidad(fila);
        await actualizar();

        expect(fixture.nativeElement.querySelector('.fraccion')).toBeNull();
        expect(
          (fixture.nativeElement.querySelector('.cantidad-paso button') as HTMLButtonElement)
            .disabled,
        ).toBe(true);
      });
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
      const body = http.expectOne({ method: 'POST', url: URL }).request.body as FormData;

      expect(body.has('porciones')).toBe(false);
      expect(body.has('costo')).toBe(false);
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

      filas()[0].querySelector('button.boton-icono').click();
      await actualizar();
      expect(filas()).toHaveLength(1);

      for (let vez = 0; vez < 50; vez++) {
        agregar().click();
        await actualizar();
      }
      expect(fixture.componentInstance.pasos.length).toBe(40);
      expect(agregar().disabled).toBe(true);
    });

    describe('foto de portada', () => {
      const foto = (nombre = 'portada.png', tipo = 'image/png', tamano = 10) =>
        new File([new Uint8Array(tamano)], nombre, { type: tipo });
      const elegirPortada = async (archivo: File) => {
        const entrada = fixture.nativeElement.querySelector(
          '.portada input[type="file"]',
        ) as HTMLInputElement;
        Object.defineProperty(entrada, 'files', { value: [archivo], configurable: true });
        entrada.dispatchEvent(new Event('change'));
        await actualizar();
      };

      beforeEach(() => {
        let contador = 0;
        globalThis.URL.createObjectURL = vi.fn(() => `blob:portada-${++contador}`);
        globalThis.URL.revokeObjectURL = vi.fn();
      });

      it('[O] la portada está arriba de todo, antes del título y de la descripción', () => {
        const portada = fixture.nativeElement.querySelector('.portada') as HTMLElement;
        const titulo = fixture.nativeElement.querySelector(
          'input[formcontrolname="titulo"]',
        ) as HTMLElement;
        const mensaje = fixture.nativeElement.querySelector(
          'textarea[formcontrolname="mensaje"]',
        ) as HTMLElement;

        expect(
          portada.compareDocumentPosition(titulo) & Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();
        expect(
          portada.compareDocumentPosition(mensaje) & Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();
        expect(fixture.nativeElement.querySelector('.portada-vacia')).not.toBeNull();
      });

      it('[O] al elegir la foto se ve una previsualización y se puede cambiar o quitar', async () => {
        await elegirPortada(foto());

        const vista = fixture.nativeElement.querySelector('.portada-vista') as HTMLImageElement;
        expect(vista.getAttribute('src')).toBe('blob:portada-1');
        expect(fixture.nativeElement.querySelector('.portada-vacia')).toBeNull();

        await elegirPortada(foto('otra.png'));
        expect(
          (fixture.nativeElement.querySelector('.portada-vista') as HTMLImageElement).getAttribute(
            'src',
          ),
        ).toBe('blob:portada-2');
        expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledWith('blob:portada-1');

        (
          fixture.nativeElement.querySelector('.portada .boton-secundario') as HTMLButtonElement
        ).click();
        await actualizar();
        expect(fixture.nativeElement.querySelector('.portada-vista')).toBeNull();
        expect(fixture.componentInstance.imagen()).toBeNull();
      });

      it('[E] un archivo inválido muestra el error, no deja vista previa y bloquea la portada anterior', async () => {
        await elegirPortada(foto());
        await elegirPortada(foto('nota.pdf', 'application/pdf'));

        expect(fixture.nativeElement.querySelector('.portada-vista')).toBeNull();
        expect(fixture.componentInstance.imagen()).toBeNull();
        expect(fixture.nativeElement.querySelector('.portada .mensaje-error')).not.toBeNull();
      });

      it('[I] al publicar envía la portada como imagen', async () => {
        fixture.componentInstance.formulario.patchValue(formularioValido);
        const archivo = foto('portada.png');
        await elegirPortada(archivo);

        await enviar();

        const body = http.expectOne({ method: 'POST', url: URL }).request.body as FormData;
        expect((body.get('imagen') as File).name).toBe('portada.png');
      });
    });

    describe('fotos de los pasos', () => {
      const foto = (nombre = 'paso.png', tipo = 'image/png', tamano = 10) =>
        new File([new Uint8Array(tamano)], nombre, { type: tipo });
      const elegir = async (indice: number, ...archivos: File[]) => {
        const fila = fixture.nativeElement.querySelectorAll('.paso-fila')[indice] as HTMLElement;
        const entrada = fila.querySelector('input[type="file"]') as HTMLInputElement;
        Object.defineProperty(entrada, 'files', { value: archivos, configurable: true });
        entrada.dispatchEvent(new Event('change'));
        await actualizar();
      };
      const cargarCon = async (textos: string[]) => {
        const agregar = fixture.nativeElement.querySelectorAll(
          'fieldset .boton-agregar',
        )[1] as HTMLButtonElement;
        for (let i = 1; i < textos.length; i++) {
          agregar.click();
          await actualizar();
        }
        const areas = fixture.nativeElement.querySelectorAll(
          '.paso-fila textarea',
        ) as NodeListOf<HTMLTextAreaElement>;
        textos.forEach((texto, indice) => {
          areas[indice].value = texto;
          areas[indice].dispatchEvent(new Event('input'));
        });
        await actualizar();
      };
      const vistas = (indice = 0) =>
        (
          fixture.nativeElement.querySelectorAll('.paso-fila')[indice] as HTMLElement
        ).querySelectorAll('.paso-foto-vista');

      beforeEach(() => {
        let contador = 0;
        globalThis.URL.createObjectURL = vi.fn(() => `blob:paso-${++contador}`);
        globalThis.URL.revokeObjectURL = vi.fn();
      });

      it('[O] un paso sin fotos ofrece un botón con una cámara y el texto "Agregar foto", no un +', async () => {
        await cargarCon(['Mezclar']);

        const boton = fixture.nativeElement.querySelector('.boton-foto') as HTMLElement;
        expect(boton.textContent).toContain('Agregar foto');
        expect(boton.classList.contains('boton-icono')).toBe(false);
        const trazos = Array.from(boton.querySelectorAll('svg > *')).map((n) => n.tagName);
        expect(trazos).toContain('circle');
        expect(boton.querySelector('input')!.getAttribute('aria-label')).toBe(
          'Agregar una foto al paso 1',
        );
      });

      it('[O] con fotos, el botón pasa a ser redondo, con la cámara y sin texto', async () => {
        await cargarCon(['Mezclar']);
        await elegir(0, foto('uno.png'));

        const boton = fixture.nativeElement.querySelector('.boton-foto') as HTMLElement;
        expect(boton.classList.contains('boton-icono')).toBe(true);
        expect(boton.textContent!.trim()).toBe('');
        expect(boton.getAttribute('title')).toBe('Agregar otra foto');
        expect(boton.querySelector('input')!.getAttribute('aria-label')).toBe(
          'Agregar otra foto al paso 1',
        );
      });

      it('[I] el botón de fotos no se parece al de agregar paso: no usa el signo +', async () => {
        await cargarCon(['Mezclar']);
        await elegir(0, foto('uno.png'));

        const botonesDeFoto = fixture.nativeElement.querySelectorAll('.boton-foto');
        for (const boton of Array.from(botonesDeFoto) as HTMLElement[]) {
          const trazado = Array.from(boton.querySelectorAll('path')).map((p) =>
            p.getAttribute('d'),
          );
          expect(trazado).not.toContain('M12 5v14M5 12h14');
        }
      });

      it('[O] al elegir una foto se ve la vista previa y el botón + sigue para agregar más', async () => {
        await cargarCon(['Mezclar']);

        await elegir(0, foto('uno.png'));

        expect(vistas()).toHaveLength(1);
        expect(vistas()[0].getAttribute('src')).toBe('blob:paso-1');
        expect(fixture.nativeElement.querySelector('.boton-foto')).not.toBeNull();

        await elegir(0, foto('dos.png'));
        expect(vistas()).toHaveLength(2);
        expect(vistas()[1].getAttribute('src')).toBe('blob:paso-2');
      });

      it('[O] se pueden elegir varias fotos a la vez', async () => {
        await cargarCon(['Mezclar']);

        await elegir(0, foto('a.png'), foto('b.png'), foto('c.png'));

        expect(vistas()).toHaveLength(3);
      });

      it('[O] quitar una foto saca sólo esa y libera su vista previa', async () => {
        await cargarCon(['Mezclar']);
        await elegir(0, foto('a.png'), foto('b.png'));

        (fixture.nativeElement.querySelector('.paso-foto-quitar') as HTMLButtonElement).click();
        await actualizar();

        expect(vistas()).toHaveLength(1);
        expect(vistas()[0].getAttribute('src')).toBe('blob:paso-2');
        expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledWith('blob:paso-1');
      });

      it('[E] un archivo que no es imagen o que pesa más de 2 MB se rechaza con su aviso', async () => {
        await cargarCon(['Mezclar']);

        await elegir(0, foto('nota.txt', 'text/plain'));
        expect(fixture.nativeElement.textContent).toContain(
          'La imagen debe ser JPG, PNG, WEBP o GIF',
        );
        expect(vistas()).toHaveLength(0);

        await elegir(0, foto('grande.png', 'image/png', 2 * 1024 * 1024 + 1));
        expect(fixture.nativeElement.textContent).toContain('2 MB');
        expect(vistas()).toHaveLength(0);
      });

      it('[B] un paso admite hasta 5 fotos: con la quinta desaparece el botón +', async () => {
        await cargarCon(['Mezclar']);

        await elegir(0, ...Array.from({ length: 5 }, (_, i) => foto(`${i}.png`)));

        expect(vistas()).toHaveLength(5);
        expect(fixture.nativeElement.querySelector('.boton-foto')).toBeNull();
      });

      it('[B] si se eligen más de las que entran avisa y deja las primeras 5', async () => {
        await cargarCon(['Mezclar']);

        await elegir(0, ...Array.from({ length: 7 }, (_, i) => foto(`${i}.png`)));

        expect(vistas()).toHaveLength(5);
        expect(fixture.nativeElement.textContent).toContain('hasta 5 fotos');
      });

      it('[B] entre todos los pasos entran hasta 20 fotos y la 21 avisa', async () => {
        await cargarCon(['a', 'b', 'c', 'd', 'e']);

        for (let paso = 0; paso < 4; paso++) {
          await elegir(paso, ...Array.from({ length: 5 }, (_, i) => foto(`${paso}-${i}.png`)));
        }
        expect(fixture.componentInstance['totalFotosDePasos']()).toBe(20);

        await elegir(4, foto('21.png'));
        expect(vistas(4)).toHaveLength(0);
        expect(fixture.nativeElement.textContent).toContain('hasta 20 fotos de pasos en total');
      });

      it('[I] al publicar envía las fotos y cada paso dice cuáles son las suyas', async () => {
        fixture.componentInstance.formulario.patchValue(formularioValido);
        await cargarCon(['Mezclar', 'Reposar', 'Hornear']);
        await elegir(0, foto('mezclar-1.png'), foto('mezclar-2.png'));
        await elegir(2, foto('hornear.png'));

        await enviar();

        const body = http.expectOne({ method: 'POST', url: URL }).request.body as FormData;
        expect(JSON.parse(body.get('pasos') as string)).toEqual([
          { texto: 'Mezclar', fotos: [0, 1] },
          { texto: 'Reposar' },
          { texto: 'Hornear', fotos: [2] },
        ]);
        expect((body.getAll('imagenesPasos') as File[]).map((archivo) => archivo.name)).toEqual([
          'mezclar-1.png',
          'mezclar-2.png',
          'hornear.png',
        ]);
      });

      it('[O] las fotos se quedan con su paso al reordenar', async () => {
        fixture.componentInstance.formulario.patchValue(formularioValido);
        await cargarCon(['Mezclar', 'Hornear']);
        await elegir(0, foto('mezclar.png'));

        fixture.componentInstance.moverPaso(0, 1);
        await enviar();

        const body = http.expectOne({ method: 'POST', url: URL }).request.body as FormData;
        expect(JSON.parse(body.get('pasos') as string)).toEqual([
          { texto: 'Hornear' },
          { texto: 'Mezclar', fotos: [0] },
        ]);
      });

      it('[E] un paso con foto pero sin texto avisa y no envía', async () => {
        fixture.componentInstance.formulario.patchValue(formularioValido);
        await cargarCon(['']);
        await elegir(0, foto());

        await enviar();

        expect(http.match({ method: 'POST', url: URL })).toHaveLength(0);
        expect(fixture.nativeElement.textContent).toContain('Escribí la descripción de este paso');
      });

      it('[I] quitar un paso también quita sus fotos', async () => {
        await cargarCon(['Mezclar', 'Hornear']);
        await elegir(0, foto('a.png'), foto('b.png'));

        fixture.componentInstance.quitarPaso(0);
        await actualizar();

        expect(fixture.componentInstance.fotosPasos().size).toBe(0);
        expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledWith('blob:paso-1');
        expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledWith('blob:paso-2');
      });
    });

    describe('título y texto de cada paso', () => {
      const completar = async (titulo: string, texto: string) => {
        const fila = fixture.nativeElement.querySelector('.paso-fila') as HTMLElement;
        const campoTitulo = fila.querySelector('.paso-titulo') as HTMLInputElement;
        const area = fila.querySelector('textarea') as HTMLTextAreaElement;
        campoTitulo.value = titulo;
        campoTitulo.dispatchEvent(new Event('input'));
        area.value = texto;
        area.dispatchEvent(new Event('input'));
        await actualizar();
      };

      it('[O] cada paso tiene un título opcional y una descripción más alta de entrada', () => {
        const fila = fixture.nativeElement.querySelector('.paso-fila') as HTMLElement;

        expect(fila.querySelector('.paso-titulo')).not.toBeNull();
        expect(
          Number((fila.querySelector('textarea') as HTMLTextAreaElement).getAttribute('rows')),
        ).toBeGreaterThanOrEqual(5);
      });

      it('[O] el título viaja con el paso y si está vacío no se envía', async () => {
        fixture.componentInstance.formulario.patchValue(formularioValido);
        await completar('  La masa  ', 'Mezclar');

        await enviar();

        const body = http.expectOne({ method: 'POST', url: URL }).request.body as FormData;
        expect(JSON.parse(body.get('pasos') as string)).toEqual([
          { titulo: 'La masa', texto: 'Mezclar' },
        ]);
      });

      it('[E] un título sin descripción avisa y no envía', async () => {
        fixture.componentInstance.formulario.patchValue(formularioValido);
        await completar('La masa', '');

        await enviar();

        expect(http.match({ method: 'POST', url: URL })).toHaveLength(0);
        expect(fixture.nativeElement.textContent).toContain('Escribí la descripción de este paso');
      });

      it('[B] el título admite 80 caracteres y la descripción 2000; uno más marca el error', async () => {
        fixture.componentInstance.formulario.patchValue(formularioValido);
        await completar('a'.repeat(80), 'b'.repeat(2000));
        await enviar();
        http.expectOne({ method: 'POST', url: URL }).flush({});

        await completar('a'.repeat(81), 'b');
        fixture.componentInstance.pasos.at(0).markAllAsTouched();
        await actualizar();
        expect(fixture.componentInstance.pasos.at(0).controls.titulo.invalid).toBe(true);

        await completar('a', 'b'.repeat(2001));
        expect(fixture.componentInstance.pasos.at(0).controls.texto.invalid).toBe(true);
      });
    });

    describe('reordenar pasos', () => {
      const textos = () => fixture.componentInstance.pasos.getRawValue().map(({ texto }) => texto);
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
        fixture.componentInstance.pasos.setValue(
          ['Mezclar', 'Hornear', 'Servir'].map((texto) => ({ titulo: '', texto })),
        );
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
        const body = http.expectOne({ method: 'POST', url: URL }).request.body as FormData;

        expect(JSON.parse(body.get('pasos') as string)).toEqual([
          { texto: 'Servir' },
          { texto: 'Mezclar' },
          { texto: 'Hornear' },
        ]);
      });

      it('[I] cada paso tiene una manija con nombre accesible', () => {
        const manijas = fixture.nativeElement.querySelectorAll('.paso-fila .manija');

        expect(manijas).toHaveLength(3);
        expect(manijas[1].getAttribute('aria-label')).toContain('2');
      });
    });

    it('[B] un paso de 2000 caracteres envía y uno de 2001 no', async () => {
      fixture.componentInstance.formulario.patchValue(formularioValido);
      cargarPasos(['a'.repeat(2001)]);
      await enviar();
      expect(http.match({ method: 'POST', url: URL })).toHaveLength(0);
      expect(fixture.componentInstance.pasos.at(0).controls.texto.invalid).toBe(true);

      cargarPasos(['a'.repeat(2000)]);
      await enviar();
      const body = http.expectOne({ method: 'POST', url: URL }).request.body as FormData;
      expect(JSON.parse(body.get('pasos') as string)[0].texto).toHaveLength(2000);
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
      const body = http.expectOne({ method: 'POST', url: URL }).request.body as FormData;

      expect(body.has('ingredientes')).toBe(false);
      expect(body.has('pasos')).toBe(false);
    });

    it('[I] ingredientes y pasos sólo aparecen en receta', async () => {
      const campos = () => fixture.nativeElement.querySelectorAll('textarea').length;
      const filas = () => fixture.nativeElement.querySelectorAll('.ingrediente-fila').length;
      expect([campos(), filas()]).toEqual([2, 1]);

      fixture.componentInstance.tipo.set('tip');
      await actualizar();
      expect([campos(), filas()]).toEqual([1, 0]);

      fixture.componentInstance.tipo.set('receta');
      await actualizar();
      expect([campos(), filas()]).toEqual([2, 1]);
    });

    it('[B] un título de 55 caracteres envía y uno de 56 no', async () => {
      fixture.componentInstance.formulario.patchValue({ titulo: 'a'.repeat(56), mensaje: 'x' });
      await enviar();
      expect(http.match({ method: 'POST', url: URL })).toHaveLength(0);
      expect(fixture.componentInstance.mensajeDeError('titulo')).toContain('55');

      fixture.componentInstance.formulario.patchValue({ titulo: 'a'.repeat(55), mensaje: 'x' });
      await enviar();
      expect(http.match({ method: 'POST', url: URL })).toHaveLength(1);
    });

    it('[B] un mensaje de 2000 caracteres envía y uno de 2001 no', async () => {
      fixture.componentInstance.formulario.patchValue({ titulo: 'x', mensaje: 'a'.repeat(2001) });
      await enviar();
      expect(http.match({ method: 'POST', url: URL })).toHaveLength(0);
      expect(fixture.componentInstance.mensajeDeError('mensaje')).toContain('2000');

      fixture.componentInstance.formulario.patchValue({ titulo: 'x', mensaje: 'a'.repeat(2000) });
      await enviar();
      expect(http.match({ method: 'POST', url: URL })).toHaveLength(1);
    });

    it('[E] una imagen inválida muestra el error y bloquea el envío', async () => {
      fixture.componentInstance.formulario.patchValue(formularioValido);
      fixture.componentInstance.elegirImagen({
        target: { files: [new File(['x'], 'nota.pdf', { type: 'application/pdf' })] },
      } as unknown as Event);

      await enviar();

      expect(http.match({ method: 'POST', url: URL })).toHaveLength(0);
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

      expect(http.match({ method: 'POST', url: URL })).toHaveLength(1);
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
        tipo: 'receta',
        tipoRinde: 'porciones',
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
        pasos: [
          { titulo: '', texto: 'Cortar' },
          { titulo: '', texto: 'Mezclar' },
        ],
        conFotos: false,
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

      expect(pagina.tipo()).toBe('receta');
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
        pasos: [
          { titulo: '', texto: 'Cortar' },
          { titulo: '', texto: 'Mezclar' },
        ],
      });
      expect(pagina.ingredientes.at(1).controls.cantidad.disabled).toBe(true);
      expect(otra.nativeElement.querySelectorAll('.ingrediente-fila')).toHaveLength(2);
      expect(otra.nativeElement.querySelectorAll('.paso-fila')).toHaveLength(2);
      expect(otra.nativeElement.textContent).toContain('Recuperamos tu borrador');
      expect(otra.nativeElement.textContent).toContain('Lo guardaste el');
    });

    it('[I] recuperar el borrador no lo vuelve a guardar con otra fecha', async () => {
      vi.useFakeTimers();
      TestBed.inject(Borrador).guardar({
        tipo: 'receta',
        tipoRinde: 'porciones',
        titulo: 'Hola',
        mensaje: '',
        porciones: '',
        tiempoMinutos: '',
        calorias: '',
        costo: null,
        ingredientes: [],
        pasos: [],
        conFotos: false,
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
        tipoRinde: 'porciones',
        titulo: 'Ajeno',
        mensaje: '',
        porciones: '',
        tiempoMinutos: '',
        calorias: '',
        costo: null,
        ingredientes: [],
        pasos: [],
        conFotos: false,
      });
      TestBed.inject(Auth).usuario.set({ ...usuarioDePrueba, _id: 'u2' });

      const otra = TestBed.createComponent(NuevaPublicacion);
      otra.detectChanges();

      expect(otra.componentInstance.formulario.getRawValue().titulo).toBe('');
      expect(otra.componentInstance.borradorRecuperado()).toBeNull();
    });

    describe('fotos en el borrador', () => {
      const foto = (nombre: string) =>
        new File([new Uint8Array(10)], nombre, { type: 'image/png' });
      let fotosGuardadas: FotosBorrador;

      beforeEach(() => {
        let contador = 0;
        globalThis.URL.createObjectURL = vi.fn(() => `blob:borrador-${++contador}`);
        globalThis.URL.revokeObjectURL = vi.fn();
        fotosGuardadas = TestBed.inject(FotosBorrador);
        vi.spyOn(fotosGuardadas, 'guardar').mockResolvedValue();
        vi.spyOn(fotosGuardadas, 'borrar').mockResolvedValue();
      });

      it('[O] al elegir la portada se guarda en el borrador junto con las fotos de los pasos', async () => {
        vi.useFakeTimers();
        const portada = foto('portada.png');
        const paso = foto('paso.png');
        fixture.componentInstance.formulario.patchValue({ titulo: 'Hola' });
        fixture.componentInstance['colocarPortada'](portada);
        fixture.componentInstance['colocarFotoPaso'](fixture.componentInstance.pasos.at(0), paso);
        await vi.advanceTimersByTimeAsync(1000);
        vi.useRealTimers();

        expect(fotosGuardadas.guardar).toHaveBeenLastCalledWith({ portada, pasos: [[paso]] });
        expect(guardado().conFotos).toBe(true);
      });

      it('[O] el tipo de rinde se guarda en el borrador y se recupera', async () => {
        fixture.componentInstance.formulario.patchValue({ titulo: 'Alfajores', porciones: '12' });
        fixture.componentInstance.elegirTipoRinde('unidades');
        fixture.componentInstance.guardarBorrador();

        expect(guardado().tipoRinde).toBe('unidades');
        const otra = TestBed.createComponent(NuevaPublicacion);
        expect(otra.componentInstance.tipoRinde()).toBe('unidades');
      });

      it('[O] un borrador sólo con fotos se guarda igual', async () => {
        fixture.componentInstance['colocarPortada'](foto('portada.png'));
        fixture.componentInstance.guardarBorrador();

        expect(guardado().conFotos).toBe(true);
      });

      it('[O] al volver a abrir recupera la portada y las fotos de los pasos con su vista previa', async () => {
        const portada = foto('portada.png');
        const paso = foto('paso.png');
        const paso2 = foto('paso-2.png');
        vi.spyOn(fotosGuardadas, 'leer').mockResolvedValue({ portada, pasos: [[], [paso, paso2]] });
        TestBed.inject(Borrador).guardar({
          tipo: 'receta',
          tipoRinde: 'porciones',
          titulo: 'Con fotos',
          mensaje: 'x',
          porciones: '',
          tiempoMinutos: '',
          calorias: '',
          costo: null,
          ingredientes: [],
          pasos: [
            { titulo: '', texto: 'Uno' },
            { titulo: '', texto: 'Dos' },
          ],
          conFotos: true,
        });

        const otra = TestBed.createComponent(NuevaPublicacion);
        await otra.whenStable();
        otra.detectChanges();
        await otra.whenStable();

        expect(otra.componentInstance.imagen()).toBe(portada);
        expect(otra.nativeElement.querySelector('.portada-vista')).not.toBeNull();
        const vistas = otra.nativeElement.querySelectorAll('.paso-foto-vista');
        expect(vistas).toHaveLength(2);
        expect(
          otra.componentInstance.fotosDe(otra.componentInstance.pasos.at(1)).map((f) => f.archivo),
        ).toEqual([paso, paso2]);
      });

      it('[O] sin fotos en el borrador no las busca', async () => {
        const leer = vi.spyOn(fotosGuardadas, 'leer');
        TestBed.inject(Borrador).guardar({
          tipo: 'receta',
          tipoRinde: 'porciones',
          titulo: 'Sólo texto',
          mensaje: 'x',
          porciones: '',
          tiempoMinutos: '',
          calorias: '',
          costo: null,
          ingredientes: [],
          pasos: [],
          conFotos: false,
        });

        TestBed.createComponent(NuevaPublicacion);

        expect(leer).not.toHaveBeenCalled();
      });

      it('[O] descartar el borrador también borra las fotos guardadas', async () => {
        fixture.componentInstance['colocarPortada'](foto('portada.png'));
        fixture.componentInstance.descartarBorrador();

        expect(fotosGuardadas.borrar).toHaveBeenCalled();
        expect(fixture.componentInstance.imagen()).toBeNull();
      });

      it('[O] al publicar borra el borrador y sus fotos', async () => {
        fixture.componentInstance.formulario.patchValue(formularioValido);
        fixture.componentInstance['colocarPortada'](foto('portada.png'));

        await enviar();
        http.expectOne({ method: 'POST', url: URL }).flush({});

        expect(fotosGuardadas.borrar).toHaveBeenCalled();
      });
    });
  });
});
