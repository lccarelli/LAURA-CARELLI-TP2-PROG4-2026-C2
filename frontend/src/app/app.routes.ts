import { Routes } from '@angular/router';
import { adminGuard } from './guards/admin-guard';
import { invitadoGuard } from './guards/invitado-guard';
import { publicoGuard } from './guards/publico-guard';
import { sesionGuard } from './guards/sesion-guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    canActivate: [invitadoGuard],
    loadComponent: () => import('./pages/inicio/inicio').then((m) => m.Inicio),
  },
  {
    path: 'publico/:id',
    canActivate: [publicoGuard],
    data: { soloLectura: true },
    loadComponent: () =>
      import('./pages/detalle-publicacion/detalle-publicacion').then((m) => m.DetallePublicacion),
  },
  {
    path: 'registro',
    canActivate: [invitadoGuard],
    loadComponent: () => import('./pages/registro/registro').then((m) => m.Registro),
  },
  {
    path: 'login',
    canActivate: [invitadoGuard],
    loadComponent: () => import('./pages/login/login').then((m) => m.Login),
  },
  {
    path: 'home',
    canActivate: [sesionGuard],
    loadComponent: () => import('./pages/home/home').then((m) => m.Home),
  },
  {
    path: 'publicaciones',
    canActivate: [sesionGuard],
    loadComponent: () => import('./pages/publicaciones/publicaciones').then((m) => m.Publicaciones),
  },
  {
    path: 'publicaciones/nueva',
    canActivate: [sesionGuard],
    loadComponent: () =>
      import('./pages/nueva-publicacion/nueva-publicacion').then((m) => m.NuevaPublicacion),
  },
  {
    path: 'publicaciones/:id/editar',
    canActivate: [sesionGuard],
    loadComponent: () =>
      import('./pages/nueva-publicacion/nueva-publicacion').then((m) => m.NuevaPublicacion),
  },
  {
    path: 'publicaciones/:id',
    canActivate: [sesionGuard],
    loadComponent: () =>
      import('./pages/detalle-publicacion/detalle-publicacion').then((m) => m.DetallePublicacion),
  },
  {
    path: 'perfil',
    canActivate: [sesionGuard],
    loadComponent: () => import('./pages/perfil/perfil').then((m) => m.Perfil),
  },
  {
    path: 'perfil/publicaciones',
    canActivate: [sesionGuard],
    loadComponent: () =>
      import('./pages/mis-publicaciones/mis-publicaciones').then((m) => m.MisPublicaciones),
  },
  {
    path: 'perfil/guardadas',
    canActivate: [sesionGuard],
    loadComponent: () => import('./pages/guardadas/guardadas').then((m) => m.Guardadas),
  },
  {
    path: 'perfil/editar',
    canActivate: [sesionGuard],
    loadComponent: () => import('./pages/editar-perfil/editar-perfil').then((m) => m.EditarPerfil),
  },
  {
    path: 'dashboard/usuarios',
    canActivate: [sesionGuard, adminGuard],
    loadComponent: () =>
      import('./pages/dashboard-usuarios/dashboard-usuarios').then((m) => m.DashboardUsuarios),
  },
  {
    path: 'dashboard/usuarios/nuevo',
    canActivate: [sesionGuard, adminGuard],
    loadComponent: () => import('./pages/nuevo-usuario/nuevo-usuario').then((m) => m.NuevoUsuario),
  },
  {
    path: 'dashboard/estadisticas',
    canActivate: [sesionGuard, adminGuard],
    loadComponent: () =>
      import('./pages/dashboard-estadisticas/dashboard-estadisticas').then(
        (m) => m.DashboardEstadisticas,
      ),
  },
  { path: '**', redirectTo: '' },
];
