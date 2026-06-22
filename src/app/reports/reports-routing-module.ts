import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ReportsList } from './reports-list/reports-list';

const routes: Routes = [
  { path: '', component: ReportsList }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ReportsRoutingModule {}