import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Layout } from './layout/layout';
import { HomeComponent } from './home/home';

const routes: Routes = [
  {
    path: '',
    component: Layout,
    children: [
      { path: '', component: HomeComponent },
      {
        path: 'doctors',
        loadChildren: () =>
          import('../doctors/doctors-module').then(m => m.DoctorsModule)
      },
      {
        path: 'patients',
        loadChildren: () =>
          import('../patients/patients-module').then(m => m.PatientsModule)
      },
      {
        path: 'consultations',
        loadChildren: () =>
          import('../consultations/consultations-module').then(m => m.ConsultationsModule)
      },
      {
        path: 'prescriptions',
        loadChildren: () =>
          import('../prescriptions/prescriptions-module').then(m => m.PrescriptionsModule)
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('../reports/reports').then(m => m.ReportsComponent)
      },
      {
        path: 'followups',
        loadChildren: () =>
          import('../followups/followups-module').then(m => m.FollowupsModule)
      },
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DashboardRoutingModule {}
