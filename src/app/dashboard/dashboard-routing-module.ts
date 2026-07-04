import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Layout } from './layout/layout';
import { Home } from './home/home';

const routes: Routes = [
  {
    path: '',
    component: Layout,
    children: [
      { path: '', component: Home },
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
  path: 'subscriptions',
  loadComponent: () =>
    import('../subscriptions/subscriptions-list/subscriptions-list')
      .then(m => m.SubscriptionsList)
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
         {
  path: 'payments',
  loadComponent: () =>
    import('../payments/payments')
      .then(m => m.PaymentsList)
},
         {
  path: 'contact-messages',
  loadComponent: () =>
    import('../contact/contact')
      .then(m => m.ContactMessages)
},
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DashboardRoutingModule {}
