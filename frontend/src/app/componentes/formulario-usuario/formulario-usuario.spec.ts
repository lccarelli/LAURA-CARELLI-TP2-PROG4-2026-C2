import { ComponentFixture, TestBed } from '@angular/core/testing';
import { proveerIdiomaDePrueba } from '../../../testing/idioma';
import { ESCRITURA_LITERAL, atributosDeEscrituraLiteral } from '../../../testing/teclado';
import { datosDelFormulario } from '../../../testing/usuario';
import { Idioma } from '../../servicios/idioma/idioma';
import { FormularioUsuario } from './formulario-usuario';

describe('FormularioUsuario', () => {
  let fixture: ComponentFixture<FormularioUsuario>;
  let componente: FormularioUsuario;
  let guardar: ReturnType<typeof vi.fn<(datos: FormData) => void>>;

  const elemento = () => fixture.nativeElement as HTMLElement;
  const radios = () =>
    Array.from(elemento().querySelectorAll<HTMLInputElement>('input[type="radio"]'));

  const enviar = async () => {
    elemento().querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  };

  const enviado = () => guardar.mock.calls.at(-1)![0];

  const actualizar = async (entradas: Record<string, unknown>) => {
    for (const [nombre, valor] of Object.entries(entradas)) {
      fixture.componentRef.setInput(nombre, valor);
    }
    fixture.detectChanges();
    await fixture.whenStable();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormularioUsuario],
      providers: [proveerIdiomaDePrueba()],
    }).compileComponents();

    fixture = TestBed.createComponent(FormularioUsuario);
    componente = fixture.componentInstance;
    fixture.componentRef.setInput('boton', 'registro.boton');
    fixture.componentRef.setInput('botonEnviando', 'registro.boton_enviando');
    guardar = vi.fn<(datos: FormData) => void>();
    componente.guardar.subscribe(guardar);
    await fixture.whenStable();
  });

  it('[I] el correo y el nombre de usuario no se capitalizan ni se corrigen en el teléfono', () => {
    for (const nombre of ['correo', 'nombreUsuario']) {
      const campo = elemento().querySelector(`[formcontrolname="${nombre}"]`);

      expect(atributosDeEscrituraLiteral(campo)).toEqual(ESCRITURA_LITERAL);
    }
  });

  it('[Z] con el formulario vacío no envía nada y marca los campos', async () => {
    await enviar();

    expect(guardar).not.toHaveBeenCalled();
    expect(componente.mensajeDeError('nombre')).toBe('Este campo es obligatorio');
    expect(componente.mensajeDeError('correo')).toBe('Este campo es obligatorio');
  });

  it('[B] nombre y apellido: 30 caracteres valen y 31 no', () => {
    for (const campo of ['nombre', 'apellido'] as const) {
      componente.formulario.controls[campo].setValue('a'.repeat(30));
      expect(componente.formulario.controls[campo].valid, campo).toBe(true);

      componente.formulario.controls[campo].setValue('a'.repeat(31));
      expect(componente.formulario.controls[campo].valid, campo).toBe(false);
    }
  });

  it('[B] el correo de 30 caracteres vale y el de 31 no', () => {
    const correo = (largo: number) => 'a'.repeat(largo - '@correo.com'.length) + '@correo.com';

    componente.formulario.controls.correo.setValue(correo(30));
    expect(componente.formulario.controls.correo.valid).toBe(true);

    componente.formulario.controls.correo.setValue(correo(31));
    expect(componente.formulario.controls.correo.valid).toBe(false);
  });

  it('[I] las dos claves tienen un botón para verlas', () => {
    expect(elemento().querySelectorAll('app-campo-clave')).toHaveLength(2);
  });

  it('[S] el mensaje de error de un campo cambia al cambiar de idioma', async () => {
    await enviar();
    expect(componente.mensajeDeError('nombre')).toBe('Este campo es obligatorio');

    TestBed.inject(Idioma).cambiar('en');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(elemento().textContent).toContain('This field is required');
    expect(elemento().textContent).not.toContain('Este campo es obligatorio');
  });

  it('[O] con datos válidos emite los datos para guardar', async () => {
    componente.formulario.setValue(datosDelFormulario);

    await enviar();

    expect(guardar).toHaveBeenCalledTimes(1);
    expect(enviado().get('correo')).toBe('laura@correo.com');
    expect(enviado().get('nombreUsuario')).toBe('laura_c');
  });

  it('[I] no incluye repetirClave y adjunta la imagen elegida', async () => {
    componente.formulario.setValue(datosDelFormulario);
    componente.imagen.set(new File(['x'], 'foto.png', { type: 'image/png' }));

    await enviar();

    expect(enviado().has('repetirClave')).toBe(false);
    expect((enviado().get('imagen') as File).name).toBe('foto.png');
  });

  it('[I] descarta los espacios alrededor del texto pero no de la clave', async () => {
    componente.formulario.setValue({
      ...datosDelFormulario,
      nombre: '  Laura  ',
      clave: 'Clave1234',
      repetirClave: 'Clave1234',
    });

    await enviar();

    expect(enviado().get('nombre')).toBe('Laura');
  });

  it('[B] claves que no coinciden bloquean el envío y avisan', async () => {
    componente.formulario.setValue({ ...datosDelFormulario, repetirClave: 'Clave1235' });

    await enviar();

    expect(guardar).not.toHaveBeenCalled();
    expect(componente.mensajeDeError('repetirClave')).toBe('Las claves no coinciden');
  });

  it('[B] una clave de 7 caracteres bloquea el envío', async () => {
    componente.formulario.setValue({
      ...datosDelFormulario,
      clave: 'Clave12',
      repetirClave: 'Clave12',
    });

    await enviar();

    expect(guardar).not.toHaveBeenCalled();
    expect(componente.mensajeDeError('clave')).toContain('8 y 12');
  });

  it('[E] una imagen inválida muestra el error y no se adjunta', () => {
    const evento = {
      target: { files: [new File(['x'], 'nota.pdf', { type: 'application/pdf' })] },
    } as unknown as Event;

    componente.elegirImagen(evento);

    expect(componente.errorImagen()).toBe('imagen.tipo');
    expect(componente.imagen()).toBeNull();
  });

  it('[E] con una imagen inválida no envía aunque el resto esté bien', async () => {
    componente.formulario.setValue(datosDelFormulario);
    componente.errorImagen.set('imagen.tipo');

    await enviar();

    expect(guardar).not.toHaveBeenCalled();
  });

  it('[S] mientras el padre indica que está enviando no emite otra vez', async () => {
    componente.formulario.setValue(datosDelFormulario);
    await actualizar({ enviando: true });

    await enviar();

    expect(guardar).not.toHaveBeenCalled();
  });

  it('[I] el botón dice lo que le indica el padre y se bloquea mientras envía', async () => {
    const boton = elemento().querySelector<HTMLButtonElement>('button[type="submit"]')!;
    expect(boton.textContent).toContain('Registrarme');
    expect(boton.disabled).toBe(false);

    await actualizar({ enviando: true });

    expect(boton.textContent).toContain('Creando cuenta');
    expect(boton.disabled).toBe(true);
  });

  describe('el perfil', () => {
    it('[I] por defecto no hay radio buttons y el envío no incluye perfil', async () => {
      componente.formulario.setValue(datosDelFormulario);

      await enviar();

      expect(radios()).toHaveLength(0);
      expect(enviado().has('perfil')).toBe(false);
    });

    it('[O] con perfil ofrece dos radio buttons, Usuario y Administrador, con Usuario elegido', async () => {
      await actualizar({ conPerfil: true });

      expect(radios().map((radio) => radio.value)).toEqual(['usuario', 'administrador']);
      expect(radios().map((radio) => radio.checked)).toEqual([true, false]);
      expect(elemento().textContent).toContain('Usuario');
      expect(elemento().textContent).toContain('Administrador');
    });

    it('[S] elegir Administrador lo manda en el perfil', async () => {
      await actualizar({ conPerfil: true });
      componente.formulario.setValue(datosDelFormulario);

      radios()[1].click();
      await enviar();

      expect(enviado().get('perfil')).toBe('administrador');
    });

    it('[S] sin tocar los radios manda perfil usuario', async () => {
      await actualizar({ conPerfil: true });
      componente.formulario.setValue(datosDelFormulario);

      await enviar();

      expect(enviado().get('perfil')).toBe('usuario');
    });

    it('[S] los radios están agrupados con una leyenda', async () => {
      await actualizar({ conPerfil: true });

      const grupo = elemento().querySelector('fieldset')!;

      expect(grupo.querySelector('legend')!.textContent).toContain('Perfil');
      expect(grupo.querySelectorAll('input[type="radio"]')).toHaveLength(2);
    });
  });
});
