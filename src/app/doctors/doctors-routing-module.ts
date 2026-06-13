import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DoctorsList } from './doctors-list/doctors-list';

const routes: Routes = [
  { path: '', component: DoctorsList },
  { path: 'add', loadComponent: () => import('./doctors-form/doctors-form').then(m => m.DoctorsForm) },
  { path: 'edit/:id', loadComponent: () => import('./doctors-form/doctors-form').then(m => m.DoctorsForm) },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DoctorsRoutingModule {}