import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PatientsList } from './patients-list/patients-list';
import { PatientsForm } from './patients-form/patients-form';
import { PatientHistory } from './patient-history/patient-history';
import { PatientVisit } from './patient-visit/patient-visit';

const routes: Routes = [
    { path: '', component: PatientsList },
  { path: 'add', component: PatientsForm },
  { path: 'edit/:id', component: PatientsForm },
  { path: 'history/:id', component: PatientHistory },
  { path: 'visit/:id', component: PatientVisit }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PatientsRoutingModule {}
