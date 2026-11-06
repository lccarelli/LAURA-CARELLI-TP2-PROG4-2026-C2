import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Aviso } from '../../componentes/aviso/aviso';
import { TarjetaPublicacion } from '../../componentes/tarjeta-publicacion/tarjeta-publicacion';
import { Publicacion } from '../../interfaces/publicacion';
import { PublicacionesApi } from '../../servicios/publicaciones/publicaciones';
import { mensajeDeApi } from '../../utilidades/errores';

@Component({
  imports: [RouterLink, Aviso, TarjetaPublicacion, TranslatePipe],
  selector: 'app-publicaciones',
  templateUrl: './publicaciones.html',
})
export class Publicaciones implements OnInit {
  private api = inject(PublicacionesApi);

  readonly publicaciones = signal<Publicacion[]>([]);
  readonly hayMas = signal(false);
  readonly cargando = signal(false);
  readonly fallaLaCarga = signal(false);
  readonly mensajeError = signal<string | null>(null);

  ngOnInit() {
    this.cargarMas();
  }

  cargarMas() {
    if (this.cargando()) {
      return;
    }

    this.cargando.set(true);
    this.api.listar(this.publicaciones().length).subscribe({
      next: (pagina) => {
        const ids = new Set(this.publicaciones().map((publicacion) => publicacion._id));
        const nuevas = pagina.datos.filter((publicacion) => !ids.has(publicacion._id));
        this.publicaciones.update((actuales) => [...actuales, ...nuevas]);
        this.hayMas.set(pagina.hayMas);
        this.fallaLaCarga.set(false);
        this.cargando.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.cargando.set(false);
        this.fallaLaCarga.set(true);
        this.mensajeError.set(mensajeDeApi(error));
      },
    });
  }
}
