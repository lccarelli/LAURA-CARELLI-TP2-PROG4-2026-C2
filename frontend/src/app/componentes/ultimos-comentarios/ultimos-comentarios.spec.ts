import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { comentarioDePrueba } from '../../../testing/comentario';
import { proveerIdiomaDePrueba } from '../../../testing/idioma';
import { PaginaComentarios } from '../../interfaces/comentario';
import { Idioma } from '../../servicios/idioma/idioma';
import { COMENTARIOS_EN_EL_PERFIL, UltimosComentarios } from './ultimos-comentarios';

const URL = `${environment.API_URL}/publicaciones/p1/comentarios`;

const pagina = (cantidad: number): PaginaComentarios => ({
  datos: Array.from({ length: cantidad }, (_, i) =>
    comentarioDePrueba({ _id: `c${i + 1}`, mensaje: `Comentario ${i + 1}` }),
  ),
  offset: 0,
  limit: COMENTARIOS_EN_EL_PERFIL,
  hayMas: false,
});

describe('UltimosComentarios', () => {
  let fixture: ComponentFixture<UltimosComentarios>;
  let http: HttpTestingController;

  const actualizar = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
  };
  const abrir = async (cantidad: number) => {
    fixture.componentRef.setInput('publicacionId', 'p1');
    fixture.componentRef.setInput('cantidad', cantidad);
    await actualizar();
  };
  const pedido = () => http.expectOne((solicitud) => solicitud.url === URL);
  const texto = () => fixture.nativeElement.textContent as string;
  const items = () => fixture.nativeElement.querySelectorAll('li.comentario');

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UltimosComentarios],
      providers: [
        proveerIdiomaDePrueba(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(UltimosComentarios);
  });

  it('[Z] una publicación sin comentarios lo dice y no pide nada', async () => {
    await abrir(0);

    expect(http.match((solicitud) => solicitud.url === URL)).toHaveLength(0);
    expect(texto()).toContain('Todavía no tiene comentarios');
    expect(fixture.nativeElement.querySelector('a')).toBeNull();
  });

  it('[O] pide sólo los más recientes de esa publicación', async () => {
    await abrir(5);

    const solicitud = pedido();

    expect(solicitud.request.method).toBe('GET');
    expect(solicitud.request.params.get('offset')).toBe('0');
    expect(solicitud.request.params.get('limit')).toBe(String(COMENTARIOS_EN_EL_PERFIL));
    solicitud.flush(pagina(2));
  });

  it('[O] muestra quién comentó, la fecha y el mensaje', async () => {
    await abrir(2);
    pedido().flush(pagina(2));
    await actualizar();

    expect(items()).toHaveLength(2);
    expect(texto()).toContain('@laura_c');
    expect(texto()).toContain('22/10/2026');
    expect(texto()).toContain('Comentario 1');
    expect(texto()).toContain('Comentario 2');
  });

  it('[I] el enlace lleva a la publicación y dice cuántos comentarios tiene', async () => {
    await abrir(7);
    pedido().flush(pagina(2));
    await actualizar();

    const enlace = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;

    expect(enlace.getAttribute('href')).toBe('/publicaciones/p1');
    expect(enlace.textContent).toContain('Ver todos los comentarios (7)');
  });

  it('[Z] mientras carga muestra Cargando y todavía no el enlace de comentarios vacíos', async () => {
    await abrir(3);

    expect(texto()).toContain('Cargando');
    expect(texto()).not.toContain('Todavía no tiene comentarios');
    pedido().flush(pagina(1));
  });

  it('[E] si falla avisa y se puede reintentar', async () => {
    await abrir(3);
    pedido().flush(
      { codigo: 'PUBLICACION_NO_ENCONTRADA' },
      { status: 404, statusText: 'Not Found' },
    );
    await actualizar();

    expect(fixture.nativeElement.querySelector('app-aviso')).not.toBeNull();
    expect(items()).toHaveLength(0);

    (
      fixture.nativeElement.querySelector('app-aviso .boton-secundario') as HTMLButtonElement
    ).click();
    pedido().flush(pagina(1));
    await actualizar();

    expect(fixture.nativeElement.querySelector('app-aviso')).toBeNull();
    expect(items()).toHaveLength(1);
  });

  it('[E] un corte de red muestra el aviso de conexión', async () => {
    await abrir(3);
    pedido().error(new ProgressEvent('error'));
    await actualizar();

    expect(fixture.nativeElement.querySelector('app-aviso')).not.toBeNull();
  });

  it('[S] al salir de la pantalla cancela el pedido pendiente', async () => {
    await abrir(3);
    const pendiente = pedido();

    fixture.destroy();

    expect(pendiente.cancelled).toBe(true);
  });

  it('[I] el texto cambia con el idioma', async () => {
    TestBed.inject(Idioma).cambiar('en');
    await abrir(0);

    expect(texto()).toContain('No comments yet.');
  });
});
