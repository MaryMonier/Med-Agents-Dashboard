import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Home } from './home/home';

const routes: Routes = [
  {path:'',component: Home},
  {
    path:'patients',
    loadChildren :()=>
      import('../patients/patients-module').then(m =>m.PatientsModule)
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
    loadChildren: () =>
      import('../reports/reports-module').then(m => m.ReportsModule)
  },
  {
    path: 'followups',
    loadChildren: () =>
      import('../followups/followups-module').then(m => m.FollowupsModule)
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DashboardRoutingModule {}
