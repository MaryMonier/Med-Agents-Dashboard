import { Routes } from '@angular/router';
import { Login } from './auth/login/login';
import { Home } from './dashboard/home/home';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'dashboard', component: Home },

  {
    path: 'prescriptions',
    loadChildren: () =>
      import('./prescriptions/prescriptions-module').then(
        (m) => m.PrescriptionsModule
      ),
  },

  {
    path: 'consultations',
    loadChildren: () =>
      import('./consultations/consultations-module').then(
        (m) => m.ConsultationsModule
      ),
  },

  { path: '**', redirectTo: 'login' },
];
