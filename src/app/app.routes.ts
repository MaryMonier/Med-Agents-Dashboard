import { Routes } from '@angular/router';
import { Login } from './auth/login/login';

export const routes: Routes = [
    { path: '', redirectTo: 'login', pathMatch: 'full' },
    { path: 'login', component: Login },
    {
        path: 'consultations',
        loadChildren: () =>
            import('./consultations/consultations-module')
                .then(m => m.ConsultationsModule)
    },
    { path: '**', redirectTo: 'login' }
];
