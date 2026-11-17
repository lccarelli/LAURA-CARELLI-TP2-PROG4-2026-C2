import {
  afterNextRender,
  Component,
  effect,
  inject,
  Injector,
  input,
  OnDestroy,
  OnInit,
  output,
  signal,
  untracked,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { PublicacionCompartida } from '../../interfaces/publicacion';
import { FechaRelativa } from '../../pipes/fecha-relativa';
import { PublicacionesApi } from '../../servicios/publicaciones/publicaciones';
import { ListadoPaginado } from '../../utilidades/listado-paginado';
import { recordarPosicion } from '../../utilidades/recordar-posicion';
import { Aviso } from '../aviso/aviso';
import { UltimaPublicacion } from '../ultima-publicacion/ultima-publicacion';
import { VerMas } from '../ver-mas/ver-mas';

@Component({
  imports: [Aviso, FechaRelativa, RouterLink, TranslatePipe, UltimaPublicacion, VerMas],
  selector: 'app-lista-compartidas',
  templateUrl: './lista-compartidas.html',
})
export class ListaCompartidas implements OnInit, OnDestroy {
  private api = inject(PublicacionesApi);

  private injector = inject(Injector);

  readonly vistas = output<void>();
  readonly destacada = input<string | null>(null);
  protected readonly resaltada = signal<string | null>(null);

  readonly listado = new ListadoPaginado<PublicacionCompartida>((offset) =>
    this.api.listarCompartidas(offset),
  );

  private marcadas = false;
  private ubicada = false;

  constructor() {
    const restaurando = recordarPosicion(this.listado);
    effect(() => {
      const id = this.destacada();
      const items = this.listado.items();
      if (!id || this.ubicada || restaurando || this.listado.cargando()) {
        return;
      }
      untracked(() => {
        const encontrada = items.find(({ _id }) => _id === id);
        if (encontrada) {
          this.ubicarEn(encontrada);
        } else if (this.listado.hayMas() && !this.listado.fallaLaCarga()) {
          this.listado.cargarMas();
        }
      });
    });
    effect(() => {
      const hayItems = this.listado.items().length > 0;
      if (hayItems && !this.listado.cargando() && !this.marcadas) {
        this.marcadas = true;
        untracked(() => this.marcarComoVistas());
      }
    });
  }

  ngOnInit() {
    this.listado.cargarMas();
  }

  protected clave(item: PublicacionCompartida) {
    return `${item._id}|${item.fechaCompartida}`;
  }

  private ubicarEn(item: PublicacionCompartida) {
    this.ubicada = true;
    this.resaltada.set(this.clave(item));
    afterNextRender(
      () =>
        document
          .querySelector('.compartida-destacada')
          ?.scrollIntoView({ block: 'center', behavior: 'smooth' }),
      { injector: this.injector },
    );
  }

  private marcarComoVistas() {
    this.api.marcarCompartidasVistas().subscribe({
      next: () => this.vistas.emit(),
      error: () => undefined,
    });
  }

  ngOnDestroy() {
    this.listado.cancelar();
  }
}
