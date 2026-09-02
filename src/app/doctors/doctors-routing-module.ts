import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DoctorsList } from './doctors-list/doctors-list';

const routes: Routes = [
  { path: '', component: DoctorsList },
  { path: 'add', loadComponent: () => import('./doctors-form/doctors-form').then(m => m.DoctorsForm) },
  { path: 'edit/:id', loadComponent: () => import('./doctors-form/doctors-form').then(m => m.DoctorsForm) },
  // لازم يبقى قبل الراوت العام :id تحت، وإلا Angular هيحاول يفهم 'pending'
  // على إنه ID لدكتور بدل ما يفتح شاشة الطلبات المعلّقة
  { path: 'pending', loadComponent: () => import('./pending-doctors/pending-doctors').then(m => m.PendingDoctors) },
  { path: ':id', loadComponent: () => import('./doctor-detail/doctor-detail').then(m => m.DoctorDetail) },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DoctorsRoutingModule {}
