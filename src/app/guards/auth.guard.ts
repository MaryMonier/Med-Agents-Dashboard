import { inject } from "@angular/core";
import { CanActivateFn ,Router} from "@angular/router";
import { AuthService } from "../services/auth";
import { jwtDecode } from 'jwt-decode';

export const authGuard: CanActivateFn = ()=>{
const authService = inject(AuthService);
const router = inject(Router);

const token = authService.getToken();
if(!token){
    router.navigate(['/auth/login'])
    return false;
}
const decoded: any = jwtDecode(token);
if (decoded.role !== 'admin'){
    router.navigate(['/auth/login']);
    return false;
}
return true;
}