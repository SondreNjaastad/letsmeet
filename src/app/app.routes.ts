import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent),
  },
  {
    path: 'event/:inviteCode',
    loadComponent: () => import('./features/event/event.component').then(m => m.EventComponent),
  },
  {
    path: 'event/:inviteCode/p/:participantId',
    loadComponent: () => import('./features/respond/respond.component').then(m => m.RespondComponent),
  },
  {
    path: 'auth/callback',
    loadComponent: () => import('./features/auth/callback.component').then(m => m.CallbackComponent),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
