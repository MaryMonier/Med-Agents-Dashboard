import { Routes } from '@angular/router';
import { Login } from './auth/login/login';
import { PrescriptionsList } from './prescriptions/prescriptions-list';
import { PrescriptionForm } from './prescriptions/prescription-form';
import { Home } from './dashboard/home/home';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'dashboard', component: Home },
  { path: 'prescriptions', component: PrescriptionsList },
  { path: 'prescriptions/new', component: PrescriptionForm },
  {
    path: 'consultations',
    loadChildren: () =>
      import('./consultations/consultations-module')
        .then(m => m.ConsultationsModule)
  },
  { path: '**', redirectTo: 'login' }
];
