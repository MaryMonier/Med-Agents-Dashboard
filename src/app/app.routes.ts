import { Routes } from "@angular/router";
import { authGuard } from "./guards/auth.guard";

export const routes : Routes =[
  {
    path:'', redirectTo: 'auth/login', pathMatch:'full'
  },
  {
    path:'auth',
    loadChildren: ()=> import('./auth/auth-routing-module').then(m =>m.AuthRoutingModule)
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadChildren: ()=>
      import('./dashboard/dashboard-routing-module').then(m=>m.DashboardRoutingModule)
  },
  {
    path: '**', redirectTo:'auth/login'
  }
]