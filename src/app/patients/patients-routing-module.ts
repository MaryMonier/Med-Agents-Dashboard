import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PatientsList } from './patients-list/patients-list';
import { PatientsForm } from './patients-form/patients-form';
import { PatientHistory } from './patient-history/patient-history';

const routes: Routes = [

  {
    path: '',
    loadComponent: () =>
      import('./patient-list/patient-list').then(m => m.PatientListComponent)
  }

    { path: '', component: PatientsList },
  { path: 'add', component: PatientsForm },
  { path: 'edit/:id', component: PatientsForm },
  { path: 'history/:id', component: PatientHistory }

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PatientsRoutingModule {}
