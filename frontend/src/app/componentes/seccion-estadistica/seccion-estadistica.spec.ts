import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { proveerIdiomaDePrueba } from '../../../testing/idioma';
import { Carga } from '../../utilidades/carga';
import { SeccionEstadistica } from './seccion-estadistica';

@Component({
  imports: [SeccionEstadistica],
  template: `<app-seccion-estadistica
    titulo="estadisticas.comentarios_por_dia"
    textoVacio="estadisticas.vacio_comentarios"
    [carga]="carga"
    (reintentar)="reintentos = reintentos + 1"
  >
    <p id="contenido">Gráfico</p>
  </app-seccion-estadistica>`,
})
class Anfitrion {
  carga = new Carga<number[]>((numeros) => numeros.length === 0);
  reintentos = 0;
}

describe('SeccionEstadistica', () => {
  let fixture: ComponentFixture<Anfitrion>;
  let anfitrion: Anfitrion;
  let origen: Subject<number[]>;

  const texto = () => fixture.nativeElement.textContent as string;
  const contenido = () => fixture.nativeElement.querySelector('#contenido');
  const boton = (nombre: string) =>
    Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find(
      (candidato) =>
        candidato.textContent?.includes(nombre) || candidato.getAttribute('aria-label') === nombre,
    );
  const actualizar = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Anfitrion],
      providers: [proveerIdiomaDePrueba()],
    }).compileComponents();
    fixture = TestBed.createComponent(Anfitrion);
    anfitrion = fixture.componentInstance;
    origen = new Subject<number[]>();
    await actualizar();
  });

  it('[O] muestra el título traducido', () => {
    expect(texto()).toContain('Comentarios por día');
  });

  it('[Z] sin ninguna carga no muestra el contenido ni el vacío', () => {
    expect(contenido()).toBeNull();
    expect(texto()).not.toContain('No hay comentarios');
  });

  it('[S] mientras carga no muestra el contenido (el indicador de espera es el global)', async () => {
    anfitrion.carga.cargar(origen);
    await actualizar();

    expect(contenido()).toBeNull();
  });

  it('[O] con datos muestra el contenido dentro de una tarjeta', async () => {
    anfitrion.carga.cargar(origen);
    origen.next([1]);
    await actualizar();

    expect(contenido()).not.toBeNull();
    expect(contenido()?.closest('.tarjeta')).not.toBeNull();
  });

  it('[Z] con datos vacíos muestra el texto de vacío y no el contenido', async () => {
    anfitrion.carga.cargar(origen);
    origen.next([]);
    await actualizar();

    expect(texto()).toContain('No hay comentarios en el rango elegido.');
    expect(contenido()).toBeNull();
  });

  it('[E] si falla muestra el aviso con el motivo', async () => {
    anfitrion.carga.cargar(origen);
    origen.error(new HttpErrorResponse({ status: 403, error: { codigo: 'NO_ES_ADMINISTRADOR' } }));
    await actualizar();

    expect(texto()).toContain('No pudimos cargar las estadísticas.');
    expect(texto()).toContain('Esta sección es sólo para administradores.');
  });

  it('[O] Reintentar avisa a quien la usa', async () => {
    anfitrion.carga.cargar(origen);
    origen.error(new HttpErrorResponse({ status: 500 }));
    await actualizar();

    boton('Reintentar')!.click();

    expect(anfitrion.reintentos).toBe(1);
  });

  it('[I] cerrar el aviso borra el error', async () => {
    anfitrion.carga.cargar(origen);
    origen.error(new HttpErrorResponse({ status: 500 }));
    await actualizar();

    boton('Cerrar')!.click();
    await actualizar();

    expect(anfitrion.carga.mensajeError()).toBeNull();
    expect(texto()).not.toContain('No pudimos cargar las estadísticas.');
  });
});
