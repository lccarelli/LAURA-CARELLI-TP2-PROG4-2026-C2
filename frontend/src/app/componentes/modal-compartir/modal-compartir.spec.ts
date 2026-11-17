import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { proveerIdiomaDePrueba } from '../../../testing/idioma';
import { ESPERA_BUSQUEDA_MS, MAXIMO_DESTINATARIOS, ModalCompartir } from './modal-compartir';

const RAIZ = environment.API_URL;
const ANA = { _id: 'u1', nombre: 'Ana', apellido: 'Gómez', nombreUsuario: 'ana_g' };
const JUAN = { _id: 'u2', nombre: 'Juan', apellido: 'Pérez', nombreUsuario: 'juan_p' };

describe('ModalCompartir', () => {
  let fixture: ComponentFixture<ModalCompartir>;
  let http: HttpTestingController;
  let compartidas: number[];
  let cancelaciones: number;

  const raiz = () => fixture.nativeElement as HTMLElement;
  const actualizar = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
  };
  const escribir = async (texto: string) => {
    const campo = raiz().querySelector('input[type="search"]') as HTMLInputElement;
    campo.value = texto;
    campo.dispatchEvent(new Event('input'));
    vi.advanceTimersByTime(ESPERA_BUSQUEDA_MS);
    await actualizar();
  };
  const pedirDirectorio = (texto: string) =>
    http.expectOne(
      (s) => s.url === `${RAIZ}/usuarios/directorio` && s.params.get('texto') === texto,
    );
  const buscarYResponder = async (texto: string, personas = [ANA, JUAN]) => {
    await escribir(texto);
    pedirDirectorio(texto).flush({ datos: personas });
    await actualizar();
  };
  const personas = () => Array.from(raiz().querySelectorAll('.persona'));
  const elegidas = () =>
    Array.from(raiz().querySelectorAll('.destinatario')).map((e) => e.textContent!.trim());
  const botonCompartir = () =>
    raiz().querySelector('.modal-acciones .boton-principal') as HTMLButtonElement;

  beforeEach(async () => {
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'],
    });
    compartidas = [];
    cancelaciones = 0;
    await TestBed.configureTestingModule({
      imports: [ModalCompartir],
      providers: [proveerIdiomaDePrueba(), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(ModalCompartir);
    fixture.componentRef.setInput('publicacionId', 'p1');
    fixture.componentInstance.compartida.subscribe((n) => compartidas.push(n));
    fixture.componentInstance.cancelado.subscribe(() => cancelaciones++);
    http = TestBed.inject(HttpTestingController);
    await actualizar();
  });

  afterEach(() => vi.useRealTimers());

  it('[I] es una ventana con foco y etiqueta para lectores de pantalla', () => {
    const ventana = raiz().querySelector('[role="dialog"]')!;

    expect(ventana.getAttribute('aria-modal')).toBe('true');
    expect(ventana.getAttribute('aria-labelledby')).toBe('modal-compartir-titulo');
  });

  it('[Z] al abrir no busca nada y el botón Compartir está deshabilitado', () => {
    expect(http.match(`${RAIZ}/usuarios/directorio`)).toHaveLength(0);
    expect(personas()).toHaveLength(0);
    expect(botonCompartir().disabled).toBe(true);
  });

  it('[B] busca recién cuando hay 2 letras y pasó la espera, no con cada tecla', async () => {
    await escribir('a');
    expect(http.match((s) => s.url === `${RAIZ}/usuarios/directorio`)).toHaveLength(0);

    const campo = raiz().querySelector('input[type="search"]') as HTMLInputElement;
    for (const texto of ['an', 'ana']) {
      campo.value = texto;
      campo.dispatchEvent(new Event('input'));
    }
    vi.advanceTimersByTime(ESPERA_BUSQUEDA_MS);

    pedirDirectorio('ana').flush({ datos: [ANA] });
    expect(http.match((s) => s.url === `${RAIZ}/usuarios/directorio`)).toHaveLength(0);
  });

  it('[O] muestra las personas encontradas con nombre y usuario', async () => {
    await buscarYResponder('an');

    expect(personas().map((p) => p.textContent!.replace(/\s+/g, ' ').trim())).toEqual([
      'Ana Gómez@ana_g Agregar',
      'Juan Pérez@juan_p Agregar',
    ]);
  });

  it('[I] cada persona (resultado y elegida) se muestra con su foto', async () => {
    await buscarYResponder('an');
    expect(raiz().querySelectorAll('.persona img.avatar')).toHaveLength(2);

    (personas()[0] as HTMLButtonElement).click();
    await actualizar();

    expect(raiz().querySelectorAll('.destinatario img.avatar-chico')).toHaveLength(1);
  });

  it('[S] la búsqueda no muestra el indicador de espera global', async () => {
    await escribir('an');

    const solicitud = pedirDirectorio('an');

    expect(solicitud.request.context.get(SIN_INDICADOR)).toBe(true);
    solicitud.flush({ datos: [] });
  });

  it('[O] elegir una persona la pasa a los elegidos y la saca de los resultados', async () => {
    await buscarYResponder('an');

    (personas()[0] as HTMLButtonElement).click();
    await actualizar();

    expect(elegidas()).toEqual(['@ana_g']);
    expect(personas()).toHaveLength(1);
    expect(botonCompartir().disabled).toBe(false);
    expect(botonCompartir().textContent).toContain('Compartir (1)');
  });

  it('[S] se pueden elegir varias personas y quitar una', async () => {
    await buscarYResponder('an');
    (personas()[0] as HTMLButtonElement).click();
    await actualizar();
    (personas()[0] as HTMLButtonElement).click();
    await actualizar();
    expect(elegidas()).toEqual(['@ana_g', '@juan_p']);

    (raiz().querySelector('.destinatario-quitar') as HTMLButtonElement).click();
    await actualizar();

    expect(elegidas()).toEqual(['@juan_p']);
    expect(personas()).toHaveLength(1);
  });

  it('[Z] sin coincidencias avisa que no encontró a nadie', async () => {
    await buscarYResponder('zz', []);

    expect(raiz().textContent).toContain('No encontramos a nadie');
  });

  it('[E] si falla la búsqueda no rompe: simplemente no hay resultados', async () => {
    await escribir('an');
    pedirDirectorio('an').flush({}, { status: 500, statusText: 'Error' });
    await actualizar();

    expect(personas()).toHaveLength(0);
    expect(raiz().querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('[B] no deja elegir más de 20 personas', async () => {
    const muchas = Array.from({ length: MAXIMO_DESTINATARIOS + 1 }, (_, i) => ({
      _id: `u${i}`,
      nombre: 'P',
      apellido: `${i}`,
      nombreUsuario: `p_${i}`,
    }));
    await buscarYResponder('pe', muchas);

    for (let i = 0; i < MAXIMO_DESTINATARIOS; i++) {
      (personas()[0] as HTMLButtonElement).click();
      await actualizar();
    }

    expect(elegidas()).toHaveLength(MAXIMO_DESTINATARIOS);
    expect((personas()[0] as HTMLButtonElement).disabled).toBe(true);
    expect(raiz().textContent).toContain('hasta 20 personas');
  });

  it('[O] Compartir manda los ids de todas las personas elegidas y avisa cuántas fueron', async () => {
    await buscarYResponder('an');
    (personas()[0] as HTMLButtonElement).click();
    await actualizar();
    (personas()[0] as HTMLButtonElement).click();
    await actualizar();

    botonCompartir().click();
    const solicitud = http.expectOne({ method: 'POST', url: `${RAIZ}/publicaciones/p1/compartir` });
    solicitud.flush({ compartida: true, destinatarios: 2, cantidadCompartidas: 2 });

    expect(solicitud.request.body).toEqual({ usuarios: ['u1', 'u2'] });
    expect(compartidas).toEqual([2]);
  });

  it('[S] mientras envía no se puede enviar dos veces ni cancelar', async () => {
    await buscarYResponder('an');
    (personas()[0] as HTMLButtonElement).click();
    await actualizar();

    botonCompartir().click();
    botonCompartir().click();
    await actualizar();
    raiz()
      .querySelector('[role="dialog"]')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(http.match(`${RAIZ}/publicaciones/p1/compartir`)).toHaveLength(1);
    expect(cancelaciones).toBe(0);
    expect(botonCompartir().disabled).toBe(true);
  });

  it('[E] si el servidor rechaza, muestra el motivo y deja reintentar', async () => {
    await buscarYResponder('an');
    (personas()[0] as HTMLButtonElement).click();
    await actualizar();

    botonCompartir().click();
    http
      .expectOne(`${RAIZ}/publicaciones/p1/compartir`)
      .flush({ codigo: 'USUARIO_NO_ENCONTRADO' }, { status: 404, statusText: 'Not Found' });
    await actualizar();

    expect(raiz().querySelector('app-aviso')).not.toBeNull();
    expect(botonCompartir().disabled).toBe(false);
    expect(compartidas).toEqual([]);
  });

  it('[S] Cancelar y la tecla Escape cierran la ventana', async () => {
    (raiz().querySelector('.modal-acciones .boton-secundario') as HTMLButtonElement).click();
    raiz()
      .querySelector('[role="dialog"]')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(cancelaciones).toBe(2);
  });
});

import { SIN_INDICADOR_DE_CARGA as SIN_INDICADOR } from '../../servicios/carga/carga';
