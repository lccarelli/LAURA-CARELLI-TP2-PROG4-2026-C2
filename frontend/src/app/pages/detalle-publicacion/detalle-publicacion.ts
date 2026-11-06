import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Aviso } from '../../componentes/aviso/aviso';
import { Publicacion } from '../../interfaces/publicacion';
import { PublicacionesApi } from '../../servicios/publicaciones/publicaciones';
import { mensajeDeApi } from '../../utilidades/errores';
import { urlImagen } from '../../utilidades/imagen';

@Component({
  imports: [DatePipe, RouterLink, Aviso, TranslatePipe],
  selector: 'app-detalle-publicacion',
  templateUrl: './detalle-publicacion.html',
  host: { '(document:keydown.escape)': 'cerrar()' },
})
export class DetallePublicacion implements OnInit {
  private api = inject(PublicacionesApi);
  private ruta = inject(ActivatedRoute);
  private router = inject(Router);

  readonly publicacion = signal<Publicacion | null>(null);
  readonly cargando = signal(true);
  readonly mensajeError = signal<string | null>(null);

  protected urlImagen = urlImagen;

  protected signos(cantidad: number) {
    return '$'.repeat(cantidad);
  }

  protected cerrar() {
    this.router.navigate(['/publicaciones']);
  }

  ngOnInit() {
    const id = this.ruta.snapshot.paramMap.get('id') ?? '';
    this.api.obtener(id).subscribe({
      next: (publicacion) => {
        this.publicacion.set(publicacion);
        this.cargando.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.cargando.set(false);
        this.mensajeError.set(mensajeDeApi(error));
      },
    });
  }
}
