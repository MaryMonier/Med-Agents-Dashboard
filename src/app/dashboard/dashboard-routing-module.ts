import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardLayout } from './layout/dashboard-layout';

const routes: Routes = [
  {
    path: '',
    component: DashboardLayout,
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./home/home').then(m => m.HomeComponent)
      },
      {
        path: 'patients',
        loadChildren: () =>
          import('../patients/patients-routing-module').then(m => m.PatientsRoutingModule)
      },
      {
        path: 'consultations',
        loadChildren: () =>
          import('../consultations/consultations-routing-module').then(m => m.ConsultationsRoutingModule)
      },
      {
        path: 'prescriptions',
        loadChildren: () =>
          import('../prescriptions/prescriptions-routing-module').then(m => m.PrescriptionsRoutingModule)
      },
      {
        path: 'followups',
        loadChildren: () =>
          import('../followups/followups-routing-module').then(m => m.FollowupsRoutingModule)
      },
      {
        path: 'reports',
        loadChildren: () =>
          import('../reports/reports-routing-module').then(m => m.ReportsRoutingModule)
      },
      {
        path: 'ai-chat',
        loadComponent: () =>
          import('../ai-chat/ai-chat').then(m => m.AiChatComponent)
      }
      // {
      //   path: 'drug-safety',
      //   loadComponent: () =>
      //     import('../drug-safety/drug-safety').then(m => m.DrugSafetyComponent)
      // }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DashboardRoutingModule {}
