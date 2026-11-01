import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Usuario } from '../../interfaces/usuario';
import { Auth } from '../../servicios/auth/auth';
import { Idioma } from '../../servicios/idioma/idioma';
import { Perfil } from './perfil';
import { proveerIdiomaDePrueba } from '../../../testing/idioma';

const usuario: Usuario = {
  _id: '1',
  nombre: 'Laura',
  apellido: 'Carelli',
  correo: 'laura@correo.com',
  nombreUsuario: 'laura_c',
  fechaNacimiento: '1990-05-20T00:00:00.000Z',
  descripcion: 'Estudiante de programación',
  perfil: 'usuario',
  habilitado: true,
};

describe('Perfil', () => {
  let fixture: ComponentFixture<Perfil>;

  const mostrar = async (datos: Usuario | null) => {
    TestBed.inject(Auth).usuario.set(datos);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [Perfil],
      providers: [proveerIdiomaDePrueba(), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(Perfil);
  });

  it('[Z] sin usuario en la sesión no muestra datos y no falla', async () => {
    const pagina = await mostrar(null);

    expect(pagina.querySelector('dl')).toBeNull();
  });

  it('[O] con sesión muestra todos los datos del usuario', async () => {
    const texto = (await mostrar(usuario)).textContent;

    expect(texto).toContain('Laura Carelli');
    expect(texto).toContain('@laura_c');
    expect(texto).toContain('laura@correo.com');
    expect(texto).toContain('Estudiante de programación');
    expect(texto).toContain('usuario');
  });

  it('[B] sin foto muestra la imagen por defecto', async () => {
    const pagina = await mostrar(usuario);

    expect(pagina.querySelector('img')!.getAttribute('src')).toBe('/sin-foto.svg');
  });

  it('[B] con foto muestra la imagen guardada en Cloudinary', async () => {
    const pagina = await mostrar({
      ...usuario,
      imagenPerfil: 'https://res.cloudinary.com/nube/image/upload/banquete/abc.png',
    });

    expect(pagina.querySelector('img')!.getAttribute('src')).toBe(
      'https://res.cloudinary.com/nube/image/upload/banquete/abc.png',
    );
  });

  it('[B] una descripción de 200 caracteres sin espacios se puede cortar', async () => {
    const pagina = await mostrar({ ...usuario, descripcion: 'a'.repeat(200) });

    expect(pagina.querySelector('dd.whitespace-pre-line')!.textContent).toHaveLength(200);
  });

  it('[I] en inglés la fecha se muestra con el mes primero', async () => {
    TestBed.inject(Idioma).cambiar('en');
    const pagina = await mostrar(usuario);

    expect(pagina.textContent).toContain('05/20/1990');
  });

  it('[I] la fecha de nacimiento no se corre un día por la zona horaria', async () => {
    const pagina = await mostrar(usuario);

    expect(pagina.textContent).toContain('20/05/1990');
  });

  it('[I] no muestra ningún dato de clave', async () => {
    const texto = (await mostrar(usuario)).textContent!.toLowerCase();

    expect(texto).not.toContain('clave');
    expect(texto).not.toContain('contraseña');
  });
});
