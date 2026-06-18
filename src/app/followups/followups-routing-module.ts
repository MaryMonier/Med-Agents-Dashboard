import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Followups } from './followups/followups';


const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./followup-list/followup-list').then(m => m.FollowupListComponent)
  }
];

const routes: Routes = [{ path: '', component: Followups }];


@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class FollowupsRoutingModule {}
