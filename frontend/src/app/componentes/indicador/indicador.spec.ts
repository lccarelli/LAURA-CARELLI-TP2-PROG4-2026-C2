import { ComponentFixture, TestBed } from '@angular/core/testing';
import { proveerIdiomaDePrueba } from '../../../testing/idioma';
import { Idioma } from '../../servicios/idioma/idioma';
import { Indicador } from './indicador';

describe('Indicador', () => {
  let fixture: ComponentFixture<Indicador>;

  const mostrar = async (valor: number, anterior: number) => {
    fixture.componentRef.setInput('valor', valor);
    fixture.componentRef.setInput('anterior', anterior);
    await fixture.whenStable();
  };
  const texto = (selector: string) =>
    (fixture.nativeElement.querySelector(selector) as HTMLElement).textContent
      ?.replace(/\s+/g, ' ')
      .trim();

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Indicador],
      providers: [proveerIdiomaDePrueba()],
    }).compileComponents();
    fixture = TestBed.createComponent(Indicador);
    fixture.componentRef.setInput('etiqueta', 'estadisticas.resumen_comentarios');
  });

  it('[O] muestra la etiqueta traducida y el valor', async () => {
    await mostrar(20, 25);

    expect(texto('.indicador-etiqueta')).toBe('Comentarios');
    expect(texto('.indicador-valor')).toBe('20');
  });

  it.each([
    ['sube', 8, 4, '▲ 100 % más'],
    ['baja', 20, 25, '▼ 20 % menos'],
    ['no cambia', 5, 5, '= Sin cambios'],
    ['no tenía datos antes', 5, 0, '▲ Sin datos previos'],
    ['sigue en cero', 0, 0, '= Sin cambios'],
    ['cae a cero', 0, 4, '▼ 100 % menos'],
  ])('[I] cuando %s dice cuánto cambió', async (_caso, valor, anterior, esperado) => {
    await mostrar(valor, anterior);

    expect(texto('.indicador-variacion')).toBe(esperado);
  });

  it('[B] un cambio menor a 1 % se muestra como 1 %, no como 0 %', async () => {
    await mostrar(1001, 1000);

    expect(texto('.indicador-variacion')).toBe('▲ 1 % más');
  });

  it('[S] en inglés la variación se traduce', async () => {
    TestBed.inject(Idioma).cambiar('en');
    await mostrar(8, 4);

    expect(texto('.indicador-variacion')).toBe('▲ 100 % more');
  });
});
