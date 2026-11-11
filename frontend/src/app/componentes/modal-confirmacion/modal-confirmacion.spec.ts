import { ComponentFixture, TestBed } from '@angular/core/testing';
import { proveerIdiomaDePrueba } from '../../../testing/idioma';
import { ModalConfirmacion } from './modal-confirmacion';

describe('ModalConfirmacion', () => {
  let fixture: ComponentFixture<ModalConfirmacion>;
  let confirmado: ReturnType<typeof vi.fn<() => void>>;
  let cancelado: ReturnType<typeof vi.fn<() => void>>;

  const elemento = () => fixture.nativeElement as HTMLElement;
  const botones = () => Array.from(elemento().querySelectorAll('button'));
  const botonCancelar = () => botones()[0];
  const botonConfirmar = () => botones()[1];

  const actualizar = async (entradas: Record<string, unknown>) => {
    for (const [nombre, valor] of Object.entries(entradas)) {
      fixture.componentRef.setInput(nombre, valor);
    }
    fixture.detectChanges();
    await fixture.whenStable();
  };

  const crear = async (idioma = 'es') => {
    await TestBed.configureTestingModule({
      imports: [ModalConfirmacion],
      providers: [proveerIdiomaDePrueba(idioma)],
    }).compileComponents();

    fixture = TestBed.createComponent(ModalConfirmacion);
    fixture.componentRef.setInput('titulo', 'usuarios.deshabilitar_titulo');
    fixture.componentRef.setInput('texto', 'usuarios.deshabilitar_texto');
    fixture.componentRef.setInput('confirmar', 'usuarios.deshabilitar');
    fixture.componentRef.setInput('confirmando', 'usuarios.deshabilitando');
    fixture.componentRef.setInput('parametros', { nombreUsuario: 'juan_p' });
    confirmado = vi.fn<() => void>();
    cancelado = vi.fn<() => void>();
    fixture.componentInstance.confirmado.subscribe(confirmado);
    fixture.componentInstance.cancelado.subscribe(cancelado);
    await fixture.whenStable();
  };

  beforeEach(async () => {
    await crear();
  });

  it('[O] es un diálogo modal con título, texto y los dos botones', () => {
    const dialogo = elemento().querySelector('[role="alertdialog"]');

    expect(dialogo?.getAttribute('aria-modal')).toBe('true');
    expect(dialogo?.textContent).toContain('¿Deshabilitar a @juan_p?');
    expect(dialogo?.textContent).toContain('No va a poder ingresar');
    expect(botonCancelar().textContent).toContain('Cancelar');
    expect(botonConfirmar().textContent).toContain('Deshabilitar');
  });

  it('[I] el título y el texto están enlazados al diálogo para los lectores de pantalla', () => {
    const dialogo = elemento().querySelector('[role="alertdialog"]')!;

    const titulo = elemento().querySelector(`#${dialogo.getAttribute('aria-labelledby')}`);
    const texto = elemento().querySelector(`#${dialogo.getAttribute('aria-describedby')}`);

    expect(titulo?.textContent).toContain('Deshabilitar');
    expect(texto?.textContent).toContain('No va a poder ingresar');
  });

  it('[S] al abrirse el foco queda en Cancelar, no en la acción destructiva', () => {
    expect(document.activeElement).toBe(botonCancelar());
  });

  it('[O] Confirmar avisa que se confirmó', () => {
    botonConfirmar().click();

    expect(confirmado).toHaveBeenCalledTimes(1);
    expect(cancelado).not.toHaveBeenCalled();
  });

  it('[O] Cancelar avisa que se canceló', () => {
    botonCancelar().click();

    expect(cancelado).toHaveBeenCalledTimes(1);
    expect(confirmado).not.toHaveBeenCalled();
  });

  it('[S] Escape cancela', () => {
    botonCancelar().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(cancelado).toHaveBeenCalledTimes(1);
  });

  it('[S] mientras envía no se puede cancelar ni confirmar de nuevo, y el botón lo dice', async () => {
    await actualizar({ enviando: true });

    expect(botonCancelar().disabled).toBe(true);
    expect(botonConfirmar().disabled).toBe(true);
    expect(botonConfirmar().textContent).toContain('Deshabilitando');
    botonCancelar().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(cancelado).not.toHaveBeenCalled();
  });

  it('[I] la acción destructiva usa el estilo de peligro y la otra el secundario', () => {
    expect(botonConfirmar().classList).toContain('boton-peligro');
    expect(botonCancelar().classList).toContain('boton-secundario');
  });

  it('[I] el texto del botón de cancelar se puede cambiar', async () => {
    await actualizar({ cancelar: 'comun.cerrar' });

    expect(botonCancelar().textContent).toContain('Cerrar');
  });

  it('[S] los textos salen en inglés si el idioma es inglés', async () => {
    TestBed.resetTestingModule();
    await crear('en');

    expect(elemento().textContent).toContain('Disable @juan_p?');
    expect(botonCancelar().textContent).toContain('Cancel');
  });
});
