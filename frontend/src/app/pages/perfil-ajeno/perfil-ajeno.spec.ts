import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PaginaPublicaciones, Publicacion } from '../../interfaces/publicacion';
import { PerfilPublico } from '../../interfaces/usuario';
import { Auth } from '../../servicios/auth/auth';
import { PerfilAjeno } from './perfil-ajeno';
import { proveerIdiomaDePrueba } from '../../../testing/idioma';
import { publicacionDePrueba } from '../../../testing/publicacion';
import { usuarioDePrueba } from '../../../testing/usuario';

const RAIZ = environment.API_URL;

const perfil: PerfilPublico = {
  _id: 'u7',
  nombre: 'Ana',
  apellido: 'Gómez',
  nombreUsuario: 'ana_g',
  descripcion: 'Cocino los domingos',
};

const pagina = (datos: Publicacion[]): PaginaPublicaciones => ({
  datos,
  offset: 0,
  limit: 3,
  hayMas: false,
});

describe('PerfilAjeno', () => {
  let fixture: ComponentFixture<PerfilAjeno>;
  let http: HttpTestingController;
  let parametros: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

  const actualizar = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
  };
  const abrir = async (id = 'u7') => {
    parametros.next(convertToParamMap({ id }));
    fixture = TestBed.createComponent(PerfilAjeno);
    await actualizar();
  };
  const pedirPerfil = (id = 'u7') =>
    http.expectOne({ method: 'GET', url: `${RAIZ}/usuarios/${id}` });
  const pedirPublicaciones = (id = 'u7') =>
    http.expectOne(
      (s) =>
        s.url === `${RAIZ}/publicaciones` &&
        s.params.get('usuario') === id &&
        s.params.get('limit') === '3' &&
        s.params.get('orden') === 'fecha',
    );
  const texto = () => fixture.nativeElement.textContent as string;

  beforeEach(async () => {
    localStorage.clear();
    parametros = new BehaviorSubject(convertToParamMap({ id: 'u7' }));
    await TestBed.configureTestingModule({
      imports: [PerfilAjeno],
      providers: [
        proveerIdiomaDePrueba(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { paramMap: parametros } },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(Auth).usuario.set(usuarioDePrueba);
  });

  it('[O] al mostrar el perfil registra la visita a esa persona', async () => {
    await abrir();
    pedirPerfil().flush(perfil);
    await actualizar();

    const visita = http.expectOne({ method: 'POST', url: `${RAIZ}/usuarios/u7/visitas` });

    expect(visita.request.method).toBe('POST');
    visita.flush({ registrada: true });
    pedirPublicaciones().flush(pagina([]));
  });

  it('[E] si el perfil no existe no registra ninguna visita', async () => {
    await abrir();
    pedirPerfil().flush(
      { codigo: 'USUARIO_NO_ENCONTRADO' },
      { status: 404, statusText: 'Not Found' },
    );
    await actualizar();

    expect(http.match(`${RAIZ}/usuarios/u7/visitas`)).toHaveLength(0);
  });

  it('[E] si falla el registro de la visita la pantalla sigue mostrando el perfil', async () => {
    await abrir();
    pedirPerfil().flush(perfil);
    await actualizar();
    http
      .expectOne({ method: 'POST', url: `${RAIZ}/usuarios/u7/visitas` })
      .flush({}, { status: 500, statusText: 'Error' });
    pedirPublicaciones().flush(pagina([]));
    await actualizar();

    expect(texto()).toContain('ana_g');
    expect(fixture.componentInstance.mensajeError()).toBeNull();
  });

  it('[O] pide el perfil por el id de la dirección y muestra nombre, usuario y descripción', async () => {
    await abrir();
    pedirPerfil().flush(perfil);
    pedirPublicaciones().flush(pagina([]));
    await actualizar();

    expect(fixture.nativeElement.querySelector('h1').textContent).toContain('Ana Gómez');
    expect(texto()).toContain('@ana_g');
    expect(texto()).toContain('Cocino los domingos');
  });

  it('[I] no muestra datos privados: ni correo ni fecha de nacimiento', async () => {
    await abrir();
    pedirPerfil().flush(perfil);
    pedirPublicaciones().flush(pagina([]));
    await actualizar();

    expect(texto()).not.toContain('Correo');
    expect(texto()).not.toContain('Fecha de nacimiento');
  });

  it('[O] muestra sus últimas 3 publicaciones con la misma tarjeta', async () => {
    await abrir();
    pedirPerfil().flush(perfil);
    pedirPublicaciones().flush(
      pagina([publicacionDePrueba(1), publicacionDePrueba(2), publicacionDePrueba(3)]),
    );
    await actualizar();

    expect(fixture.nativeElement.querySelectorAll('app-tarjeta-publicacion')).toHaveLength(3);
    expect(texto()).toContain('Título 1');
  });

  it('[S] mantiene la baja del administrador: la tarjeta ofrece eliminar y al hacerlo la saca de la lista', async () => {
    TestBed.inject(Auth).usuario.set({ ...usuarioDePrueba, _id: 'admin', perfil: 'administrador' });
    await abrir();
    pedirPerfil().flush(perfil);
    pedirPublicaciones().flush(pagina([publicacionDePrueba(1), publicacionDePrueba(2)]));
    await actualizar();
    expect(fixture.nativeElement.querySelectorAll('.boton-eliminar')).toHaveLength(2);

    fixture.componentInstance.quitar('id1');
    await actualizar();

    expect(fixture.nativeElement.querySelectorAll('app-tarjeta-publicacion')).toHaveLength(1);
  });

  it('[Z] sin publicaciones lo dice', async () => {
    await abrir();
    pedirPerfil().flush(perfil);
    pedirPublicaciones().flush(pagina([]));
    await actualizar();

    expect(texto()).toContain('Todavía no publicó nada.');
  });

  it('[E] si la persona no existe (404) muestra el aviso, no pide publicaciones y no muestra un perfil', async () => {
    await abrir('u0');
    pedirPerfil('u0').flush(
      { message: 'x', codigo: 'USUARIO_NO_ENCONTRADO' },
      { status: 404, statusText: 'Not Found' },
    );
    await actualizar();

    expect(texto()).toContain('No pudimos cargar este perfil');
    expect(fixture.nativeElement.querySelector('h1')).toBeNull();
    http.expectNone((s) => s.url === `${RAIZ}/publicaciones`);
  });

  it('[E] si fallan las publicaciones el perfil se ve igual', async () => {
    await abrir();
    pedirPerfil().flush(perfil);
    pedirPublicaciones().flush({ message: 'x', codigo: 'E' }, { status: 500, statusText: 'x' });
    await actualizar();

    expect(texto()).toContain('Ana Gómez');
    expect(texto()).toContain('Todavía no publicó nada.');
  });

  it('[S] si el id es el de la propia persona, lleva a Mi perfil sin pedir nada', async () => {
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    await abrir(usuarioDePrueba._id);

    expect(navegar).toHaveBeenCalledWith(['/perfil'], { replaceUrl: true });
    http.expectNone((s) => s.url.includes('/usuarios/'));
  });

  it('[S] al cambiar de persona en la dirección, vuelve a pedir todo', async () => {
    await abrir();
    pedirPerfil().flush(perfil);
    pedirPublicaciones().flush(pagina([publicacionDePrueba(1)]));
    await actualizar();

    parametros.next(convertToParamMap({ id: 'u8' }));
    pedirPerfil('u8').flush({ ...perfil, _id: 'u8', nombre: 'Beto' });
    pedirPublicaciones('u8').flush(pagina([]));
    await actualizar();

    expect(fixture.nativeElement.querySelector('h1').textContent).toContain('Beto');
    expect(fixture.nativeElement.querySelectorAll('app-tarjeta-publicacion')).toHaveLength(0);
  });
});
