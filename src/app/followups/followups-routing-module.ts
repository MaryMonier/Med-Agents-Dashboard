import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Followups } from './followups/followups';
import { FollowupDetails } from './followup-details/followup-details';

const routes: Routes = [
  { path: '', component: Followups },
  { path: ':id', component: FollowupDetails },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class FollowupsRoutingModule {}
