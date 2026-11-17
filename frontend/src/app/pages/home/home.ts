import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { CartelInstalar } from '../../componentes/cartel-instalar/cartel-instalar';
import { Tablero } from '../../componentes/tablero/tablero';
import { PaginaPublicaciones, Tipo } from '../../interfaces/publicacion';
import { Auth } from '../../servicios/auth/auth';
import { PublicacionesApi } from '../../servicios/publicaciones/publicaciones';
import { urlImagen } from '../../utilidades/imagen';

const CANDIDATAS = 12;
const PORTADAS = 3;

interface DatosDeTablero {
  clave: string;
  enlace: string;
  parametros?: Record<string, string>;
}

const TABLEROS: DatosDeTablero[] = [
  { clave: 'mias', enlace: '/perfil/publicaciones' },
  { clave: 'guardadas', enlace: '/perfil/guardadas' },
  { clave: 'gustadas', enlace: '/publicaciones', parametros: { orden: 'megusta' } },
  { clave: 'receta', enlace: '/publicaciones', parametros: { tipo: 'receta' } },
  { clave: 'tip', enlace: '/publicaciones', parametros: { tipo: 'tip' } },
  { clave: 'experiencia', enlace: '/publicaciones', parametros: { tipo: 'experiencia' } },
  { clave: 'todas', enlace: '/publicaciones' },
];

@Component({
  imports: [CartelInstalar, RouterLink, Tablero, TranslatePipe],
  selector: 'app-home',
  templateUrl: './home.html',
})
export class Home {
  private api = inject(PublicacionesApi);

  protected auth = inject(Auth);
  protected urlImagen = urlImagen;
  protected readonly tableros = TABLEROS;

  private readonly portadasPorTablero = signal<Record<string, string[]>>({});

  constructor() {
    const usuario = this.auth.usuario();
    const recientes = (usuarioId?: string, tipo?: Tipo) =>
      this.api.listar(0, CANDIDATAS, 'fecha', usuarioId, tipo);
    if (usuario) {
      this.cargar('mias', recientes(usuario._id));
    }
    this.cargar('guardadas', this.api.listarGuardadas(0, CANDIDATAS));
    this.cargar('gustadas', this.api.listar(0, CANDIDATAS, 'megusta'));
    this.cargar('receta', recientes(undefined, 'receta'));
    this.cargar('tip', recientes(undefined, 'tip'));
    this.cargar('experiencia', recientes(undefined, 'experiencia'));
    this.cargar('todas', recientes());
  }

  protected portadasDe(clave: string) {
    return this.portadasPorTablero()[clave] ?? [];
  }

  private cargar(clave: string, pedido: Observable<PaginaPublicaciones>) {
    const guardar = (portadas: string[]) =>
      this.portadasPorTablero.update((actuales) => ({ ...actuales, [clave]: portadas }));
    pedido.subscribe({
      next: ({ datos }) =>
        guardar(datos.flatMap(({ imagen }) => (imagen ? [imagen] : [])).slice(0, PORTADAS)),
      error: () => guardar([]),
    });
  }
}
