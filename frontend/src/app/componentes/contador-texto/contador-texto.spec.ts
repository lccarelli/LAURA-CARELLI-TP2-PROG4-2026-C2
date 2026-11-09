import { ComponentFixture, TestBed } from '@angular/core/testing';
import { proveerIdiomaDePrueba } from '../../../testing/idioma';
import { ContadorTexto } from './contador-texto';

describe('ContadorTexto', () => {
  let fixture: ComponentFixture<ContadorTexto>;

  const mostrar = async (cantidad: number, maximo: number) => {
    fixture.componentRef.setInput('cantidad', cantidad);
    fixture.componentRef.setInput('maximo', maximo);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture.nativeElement.querySelector('span') as HTMLElement;
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContadorTexto],
      providers: [proveerIdiomaDePrueba()],
    }).compileComponents();
    fixture = TestBed.createComponent(ContadorTexto);
  });

  it('[O] muestra cuántos caracteres hay sobre el máximo', async () => {
    const contador = await mostrar(18, 500);

    expect(contador.textContent).toContain('18 / 500');
    expect(contador.classList).not.toContain('contador-excedido');
  });

  it('[Z] con cero caracteres muestra 0', async () => {
    const contador = await mostrar(0, 500);

    expect(contador.textContent).toContain('0 / 500');
  });

  it('[B] justo en el máximo no se marca como excedido', async () => {
    const contador = await mostrar(500, 500);

    expect(contador.classList).not.toContain('contador-excedido');
  });

  it('[B] un carácter de más se marca como excedido', async () => {
    const contador = await mostrar(501, 500);

    expect(contador.classList).toContain('contador-excedido');
  });
});
