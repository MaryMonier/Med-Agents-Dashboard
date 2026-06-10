import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./consultation-list/consultation-list')
        .then(m => m.ConsultationListComponent)
  },
  {
    path: 'add',
    loadComponent: () =>
      import('./consultation-form/consultation-form')
        .then(m => m.ConsultationFormComponent)
  },
  {
    path: 'edit/:id',
    loadComponent: () =>
      import('./consultation-form/consultation-form')
        .then(m => m.ConsultationFormComponent)
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ConsultationsRoutingModule {}
