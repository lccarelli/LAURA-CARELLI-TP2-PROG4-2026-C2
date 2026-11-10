import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { proveerIdiomaDePrueba } from '../../../testing/idioma';
import { comentarioDePrueba as comentario } from '../../../testing/comentario';
import { usuarioDePrueba } from '../../../testing/usuario';
import { Comentario } from '../../interfaces/comentario';
import { Usuario } from '../../interfaces/usuario';
import { Auth } from '../../servicios/auth/auth';
import { ItemComentario } from './item-comentario';

const URL = `${environment.API_URL}/publicaciones/p1/comentarios/c1`;

describe('ItemComentario', () => {
  let fixture: ComponentFixture<ItemComentario>;
  let http: HttpTestingController;

  const actualizar = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
  };

  const iniciarSesion = (usuario: Usuario | null) => TestBed.inject(Auth).usuario.set(usuario);

  const abrir = async (datos: Comentario = comentario()) => {
    fixture.componentRef.setInput('comentario', datos);
    fixture.componentRef.setInput('publicacionId', 'p1');
    await actualizar();
  };

  const texto = () => fixture.nativeElement.textContent as string;
  const botones = () =>
    [...fixture.nativeElement.querySelectorAll('button')] as HTMLButtonElement[];
  const botonCon = (contenido: string) =>
    botones().find((boton) => boton.textContent?.includes(contenido));
  const campo = () => fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;

  const escribir = async (valor: string) => {
    campo().value = valor;
    campo().dispatchEvent(new Event('input'));
    await actualizar();
  };
  const apretar = async (contenido: string) => {
    botonCon(contenido)!.click();
    await actualizar();
  };
  const editar = async (valor: string) => {
    await apretar('Editar');
    await escribir(valor);
  };
  const guardar = () => apretar('Guardar');
  const pedido = () => http.expectOne({ method: 'PUT', url: URL });
  const sinPedido = () => http.expectNone({ method: 'PUT', url: URL });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ItemComentario],
      providers: [proveerIdiomaDePrueba(), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ItemComentario);
    iniciarSesion(usuarioDePrueba);
  });

  describe('cómo se ve', () => {
    it('[I] muestra el autor, la fecha y el mensaje', async () => {
      await abrir();

      expect(texto()).toContain('@laura_c');
      expect(texto()).toContain('22/10/2026');
      expect(texto()).toContain('Me salió riquísimo');
    });

    it('[I] si fue modificado muestra la marca (editado) con la fecha de la edición al pasar el mouse', async () => {
      await abrir(comentario({ modificado: true, modificadoEn: '2026-10-23T10:00:00.000Z' }));

      const marca = fixture.nativeElement.querySelector('.marca-editado') as HTMLElement;

      expect(marca.textContent).toContain('(editado)');
      expect(marca.getAttribute('title')).toBe('Editado el 23/10/2026 07:00');
    });

    it('[B] un comentario modificado sin fecha de edición muestra la marca sin título', async () => {
      await abrir(comentario({ modificado: true }));

      const marca = fixture.nativeElement.querySelector('.marca-editado') as HTMLElement;

      expect(marca.textContent).toContain('(editado)');
      expect(marca.getAttribute('title')).toBeNull();
    });

    it('[Z] un comentario sin modificar no muestra la marca', async () => {
      await abrir();

      expect(fixture.nativeElement.querySelector('.marca-editado')).toBeNull();
    });

    it('[S] el mensaje con HTML se muestra como texto', async () => {
      await abrir(comentario({ mensaje: '<b>hola</b>' }));

      expect(fixture.nativeElement.querySelector('p b')).toBeNull();
      expect(texto()).toContain('<b>hola</b>');
    });
  });

  describe('quién puede editar', () => {
    it('[O] quien lo escribió ve el botón Editar', async () => {
      await abrir();

      expect(botonCon('Editar')).toBeDefined();
    });

    it('[S] otra persona no ve el botón Editar', async () => {
      iniciarSesion({ ...usuarioDePrueba, _id: 'u2' });
      await abrir();

      expect(botonCon('Editar')).toBeUndefined();
    });

    it('[S] un administrador que no es el autor tampoco lo ve', async () => {
      iniciarSesion({ ...usuarioDePrueba, _id: 'u2', perfil: 'administrador' });
      await abrir();

      expect(botonCon('Editar')).toBeUndefined();
    });

    it('[S] sin sesión no hay botón Editar', async () => {
      iniciarSesion(null);
      await abrir();

      expect(botonCon('Editar')).toBeUndefined();
    });

    it('[I] el botón avisa a qué comentario pertenece para los lectores de pantalla', async () => {
      await abrir();

      expect(botonCon('Editar')!.getAttribute('aria-label')).toBe(
        'Editar el comentario de @laura_c',
      );
    });
  });

  describe('editar', () => {
    it('[O] Editar muestra el cuadro con el mensaje actual y el contador, y oculta el botón', async () => {
      await abrir();

      await apretar('Editar');

      expect(campo().value).toBe('Me salió riquísimo');
      expect(texto()).toContain('18 / 500');
      expect(botonCon('Editar')).toBeUndefined();
      expect(botonCon('Guardar')).toBeDefined();
    });

    it('[O] Cancelar vuelve al mensaje original sin hacer ningún pedido', async () => {
      await abrir();
      await editar('Otro texto');

      await apretar('Cancelar');

      expect(texto()).toContain('Me salió riquísimo');
      expect(fixture.nativeElement.querySelector('textarea')).toBeNull();
      sinPedido();
    });

    it('[M] al volver a editar después de cancelar, el cuadro tiene el mensaje original', async () => {
      await abrir();
      await editar('Otro texto');
      await apretar('Cancelar');

      await apretar('Editar');

      expect(campo().value).toBe('Me salió riquísimo');
    });

    it('[O] Guardar envía el mensaje sin espacios sobrantes, avisa el comentario editado y cierra el cuadro', async () => {
      const avisos: Comentario[] = [];
      fixture.componentInstance.modificado.subscribe((editado) => avisos.push(editado));
      await abrir();
      await editar('  Quedó genial  ');

      await guardar();
      const solicitud = pedido();
      expect(solicitud.request.body).toEqual({ mensaje: 'Quedó genial' });
      const respuesta = comentario({ mensaje: 'Quedó genial', modificado: true });
      solicitud.flush(respuesta);
      await actualizar();

      expect(avisos).toEqual([respuesta]);
      expect(fixture.nativeElement.querySelector('textarea')).toBeNull();
    });

    it('[B] guardar el mismo mensaje cierra el cuadro y no hace ningún pedido', async () => {
      const avisos = vi.fn();
      fixture.componentInstance.modificado.subscribe(avisos);
      await abrir();
      await editar('  Me salió riquísimo ');

      await guardar();

      expect(fixture.nativeElement.querySelector('textarea')).toBeNull();
      expect(avisos).not.toHaveBeenCalled();
      sinPedido();
    });

    it('[E] vaciar el mensaje muestra que es obligatorio y no se envía', async () => {
      await abrir();
      await editar('');

      await guardar();

      expect(texto()).toContain('Este campo es obligatorio');
      sinPedido();
    });

    it('[E] sólo espacios también es obligatorio', async () => {
      await abrir();
      await editar('   ');

      await guardar();

      expect(texto()).toContain('Este campo es obligatorio');
      sinPedido();
    });

    it('[B] con 500 caracteres se envía', async () => {
      await abrir();
      await editar('a'.repeat(500));

      await guardar();

      expect(pedido().request.body).toEqual({ mensaje: 'a'.repeat(500) });
    });

    it('[B] con 501 caracteres muestra el máximo, marca el contador y no se envía', async () => {
      await abrir();
      await editar('a'.repeat(501));

      await guardar();

      expect(texto()).toContain('Debe tener como máximo 500 caracteres');
      expect(fixture.nativeElement.querySelector('.contador-excedido')).not.toBeNull();
      sinPedido();
    });

    it('[B] mientras se guarda, el botón queda deshabilitado y un segundo clic no repite el pedido', async () => {
      await abrir();
      await editar('Nuevo');

      await guardar();
      await apretar('Guardando');

      expect(botonCon('Guardando')!.disabled).toBe(true);
      pedido().flush(comentario({ mensaje: 'Nuevo', modificado: true }));
    });

    it('[E] si no es el autor, muestra el motivo y conserva lo escrito', async () => {
      await abrir();
      await editar('Nuevo');

      await guardar();
      pedido().flush({ codigo: 'COMENTARIO_AJENO' }, { status: 403, statusText: 'Forbidden' });
      await actualizar();

      expect(texto()).toContain('Sólo podés editar tus propios comentarios.');
      expect(campo().value).toBe('Nuevo');
      expect(botonCon('Guardar')!.disabled).toBe(false);
    });

    it('[E] si el comentario ya no existe, lo informa', async () => {
      await abrir();
      await editar('Nuevo');

      await guardar();
      pedido().flush(
        { codigo: 'COMENTARIO_NO_ENCONTRADO' },
        { status: 404, statusText: 'Not Found' },
      );
      await actualizar();

      expect(texto()).toContain('El comentario no existe.');
    });

    it('[E] si la sesión venció, lo informa y no cierra el cuadro', async () => {
      const avisos = vi.fn();
      fixture.componentInstance.modificado.subscribe(avisos);
      await abrir();
      await editar('Nuevo');

      await guardar();
      pedido().flush({ codigo: 'TOKEN_INVALIDO' }, { status: 401, statusText: 'Unauthorized' });
      await actualizar();

      expect(texto()).toContain('Tu sesión no es válida o venció');
      expect(campo()).not.toBeNull();
      expect(avisos).not.toHaveBeenCalled();
    });

    it('[E] al cancelar después de un error se limpia el aviso', async () => {
      await abrir();
      await editar('Nuevo');
      await guardar();
      pedido().flush({ codigo: 'COMENTARIO_AJENO' }, { status: 403, statusText: 'Forbidden' });
      await actualizar();

      await apretar('Cancelar');
      await apretar('Editar');

      expect(texto()).not.toContain('Sólo podés editar tus propios comentarios.');
    });
  });
});
