import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PatientsList } from './patients-list/patients-list';
import { PatientsForm } from './patients-form/patients-form';

const routes: Routes = [
    { path: '', component: PatientsList },
  { path: 'add', component: PatientsForm },
  { path: 'edit/:id', component: PatientsForm },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PatientsRoutingModule {}
