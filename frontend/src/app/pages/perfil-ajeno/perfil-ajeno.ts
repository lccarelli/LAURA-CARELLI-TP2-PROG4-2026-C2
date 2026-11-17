import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Aviso } from '../../componentes/aviso/aviso';
import { TarjetaPublicacion } from '../../componentes/tarjeta-publicacion/tarjeta-publicacion';
import { Publicacion } from '../../interfaces/publicacion';
import { PerfilPublico } from '../../interfaces/usuario';
import { Auth } from '../../servicios/auth/auth';
import { PublicacionesApi } from '../../servicios/publicaciones/publicaciones';
import { UsuariosApi } from '../../servicios/usuarios/usuarios';
import { mensajeDeApi } from '../../utilidades/errores';
import { urlImagen } from '../../utilidades/imagen';

export const ULTIMAS_DE_OTRA_PERSONA = 3;

@Component({
  imports: [Aviso, RouterLink, TarjetaPublicacion, TranslatePipe],
  selector: 'app-perfil-ajeno',
  templateUrl: './perfil-ajeno.html',
})
export class PerfilAjeno implements OnInit {
  private ruta = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(Auth);
  private usuarios = inject(UsuariosApi);
  private publicaciones = inject(PublicacionesApi);
  private destroyRef = inject(DestroyRef);

  protected urlImagen = urlImagen;

  readonly perfil = signal<PerfilPublico | null>(null);
  readonly ultimas = signal<Publicacion[]>([]);
  readonly cargando = signal(true);
  readonly cargaronPublicaciones = signal(false);
  readonly mensajeError = signal<string | null>(null);

  ngOnInit() {
    this.ruta.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((parametros) => {
      this.cargar(parametros.get('id') ?? '');
    });
  }

  private cargar(id: string) {
    if (id === this.auth.usuario()?._id) {
      this.router.navigate(['/perfil'], { replaceUrl: true });
      return;
    }
    this.cargando.set(true);
    this.mensajeError.set(null);
    this.perfil.set(null);
    this.ultimas.set([]);
    this.cargaronPublicaciones.set(false);
    this.usuarios.obtenerPerfil(id).subscribe({
      next: (perfil) => {
        this.perfil.set(perfil);
        this.cargando.set(false);
        this.cargarPublicaciones(id);
        this.usuarios.registrarVisita(id).subscribe({ error: () => undefined });
      },
      error: (error: HttpErrorResponse) => {
        this.cargando.set(false);
        this.mensajeError.set(mensajeDeApi(error));
      },
    });
  }

  private cargarPublicaciones(id: string) {
    this.publicaciones.listar(0, ULTIMAS_DE_OTRA_PERSONA, 'fecha', id).subscribe({
      next: ({ datos }) => {
        this.ultimas.set(datos);
        this.cargaronPublicaciones.set(true);
      },
      error: () => this.cargaronPublicaciones.set(true),
    });
  }
}
