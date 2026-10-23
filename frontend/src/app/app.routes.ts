import { Routes } from '@angular/router';
import { invitadoGuard } from './guards/invitado-guard';
import { sesionGuard } from './guards/sesion-guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'publicaciones' },
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
    path: 'publicaciones',
    canActivate: [sesionGuard],
    loadComponent: () => import('./pages/publicaciones/publicaciones').then((m) => m.Publicaciones),
  },
  { path: '**', redirectTo: 'publicaciones' },
];
