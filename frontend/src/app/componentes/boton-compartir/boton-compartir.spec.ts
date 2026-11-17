import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { proveerIdiomaDePrueba } from '../../../testing/idioma';
import { ModalCompartir } from '../modal-compartir/modal-compartir';
import { BotonCompartir } from './boton-compartir';

describe('BotonCompartir', () => {
  async function crear() {
    await TestBed.configureTestingModule({
      imports: [BotonCompartir],
      providers: [proveerIdiomaDePrueba(), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    const fixture = TestBed.createComponent(BotonCompartir);
    fixture.componentRef.setInput('publicacionId', 'p1');
    await fixture.whenStable();
    return fixture;
  }
  const abrir = async (fixture: Awaited<ReturnType<typeof crear>>) => {
    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
  };

  it('[O] es un botón «Compartir» que no muestra la ventana hasta tocarlo', async () => {
    const fixture = await crear();
    const boton = fixture.nativeElement.querySelector('button') as HTMLButtonElement;

    expect(boton.getAttribute('aria-label')).toBe('Compartir');
    expect(fixture.nativeElement.querySelector('app-modal-compartir')).toBeNull();
  });

  it('[O] al tocarlo abre la ventana de la publicación y avisa que se abrió', async () => {
    const fixture = await crear();
    let aperturas = 0;
    fixture.componentInstance.abierto.subscribe(() => aperturas++);

    await abrir(fixture);

    expect(fixture.nativeElement.querySelector('app-modal-compartir')).not.toBeNull();
    expect(aperturas).toBe(1);
  });

  it('[S] al compartir cierra la ventana y avisa con cuántas personas', async () => {
    const fixture = await crear();
    const cantidades: number[] = [];
    fixture.componentInstance.compartida.subscribe((n) => cantidades.push(n));
    await abrir(fixture);

    fixture.debugElement.query(By.directive(ModalCompartir)).componentInstance.compartida.emit(3);
    fixture.detectChanges();

    expect(cantidades).toEqual([3]);
    expect(fixture.nativeElement.querySelector('app-modal-compartir')).toBeNull();
  });

  it('[S] cancelar cierra la ventana sin avisar nada', async () => {
    const fixture = await crear();
    const cantidades: number[] = [];
    fixture.componentInstance.compartida.subscribe((n) => cantidades.push(n));
    await abrir(fixture);

    fixture.debugElement.query(By.directive(ModalCompartir)).componentInstance.cancelado.emit();
    fixture.detectChanges();

    expect(cantidades).toEqual([]);
    expect(fixture.nativeElement.querySelector('app-modal-compartir')).toBeNull();
  });
});
