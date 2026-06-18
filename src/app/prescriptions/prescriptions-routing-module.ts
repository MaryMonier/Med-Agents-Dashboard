import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PrescriptionsList } from './prescriptions-list';
import { PrescriptionForm } from './prescription-form';

const routes: Routes = [
  { path: '', component: PrescriptionsList },
  { path: 'new', component: PrescriptionForm },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PrescriptionsRoutingModule {}
