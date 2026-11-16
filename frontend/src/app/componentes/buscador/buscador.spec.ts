import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Buscador } from './buscador';
import { proveerIdiomaDePrueba } from '../../../testing/idioma';

describe('Buscador', () => {
  let fixture: ComponentFixture<Buscador>;
  let consultas: string[];

  const campo = () => fixture.nativeElement.querySelector('input') as HTMLInputElement;
  const escribir = (valor: string) => {
    campo().value = valor;
    campo().dispatchEvent(new Event('input'));
  };
  const enter = () =>
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));

  beforeEach(async () => {
    vi.useFakeTimers();
    await TestBed.configureTestingModule({
      imports: [Buscador],
      providers: [proveerIdiomaDePrueba()],
    }).compileComponents();
    fixture = TestBed.createComponent(Buscador);
    consultas = [];
    fixture.componentInstance.buscar.subscribe((texto) => consultas.push(texto));
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('[I] ofrece un campo de búsqueda con nombre accesible', () => {
    expect(campo().getAttribute('aria-label')).toBe('Buscar publicaciones');
    expect(fixture.nativeElement.querySelector('form').getAttribute('role')).toBe('search');
  });

  it('[S] busca recién 400 ms después de la última letra', () => {
    escribir('ta');
    vi.advanceTimersByTime(399);

    expect(consultas).toEqual([]);

    vi.advanceTimersByTime(1);

    expect(consultas).toEqual(['ta']);
  });

  it('[S] mientras se sigue tipeando manda sólo la última', () => {
    escribir('ta');
    vi.advanceTimersByTime(300);
    escribir('tar');
    vi.advanceTimersByTime(300);
    escribir('tarta');
    vi.advanceTimersByTime(400);

    expect(consultas).toEqual(['tarta']);
  });

  it('[B] con una sola letra no busca', () => {
    escribir('t');
    vi.advanceTimersByTime(400);

    expect(consultas).toEqual([]);
  });

  it('[S] al borrar hasta una letra vuelve a la lista completa', () => {
    escribir('tarta');
    vi.advanceTimersByTime(400);
    escribir('t');
    vi.advanceTimersByTime(400);

    expect(consultas).toEqual(['tarta', '']);
  });

  it('[O] Enter busca de inmediato', () => {
    escribir('tarta');
    enter();

    expect(consultas).toEqual(['tarta']);
  });

  it('[B] Enter después de que ya buscó no repite la consulta', () => {
    escribir('tarta');
    vi.advanceTimersByTime(400);
    enter();

    expect(consultas).toEqual(['tarta']);
  });

  it('[B] sin espacios de más y con 5 palabras como máximo', () => {
    escribir('  uno   dos tres cuatro cinco seis ');
    enter();

    expect(consultas).toEqual(['uno dos tres cuatro cinco']);
  });

  it('[B] el campo no deja pasar de 60 caracteres', () => {
    expect(campo().maxLength).toBe(60);
  });

  it('[S] el botón de borrar limpia el campo y vuelve a la lista completa', () => {
    escribir('tarta');
    vi.advanceTimersByTime(400);
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.buscador-limpiar') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(consultas).toEqual(['tarta', '']);
    expect(campo().value).toBe('');
    expect(fixture.nativeElement.querySelector('.buscador-limpiar')).toBeNull();
  });

  it('[E] el botón de borrar no aparece con el campo vacío', () => {
    expect(fixture.nativeElement.querySelector('.buscador-limpiar')).toBeNull();
  });
});
