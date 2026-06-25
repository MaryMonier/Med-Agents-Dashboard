import { Component, signal } from '@angular/core';
import { AuthService } from '../../services/auth';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { jwtDecode } from 'jwt-decode';
import { RouterModule } from '@angular/router';
@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule,RouterModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  email = signal('');
  password = signal('');
  isLoading = signal(false);
  errorMessage= signal('');
  constructor( private authService: AuthService ,private router: Router  ){}

 onLogin() {
  this.isLoading.set(true);
  this.errorMessage.set('');

  this.authService.login(this.email(), this.password()).subscribe({
    next: (res) => {
      const token = res.data.token;
      const decoded: any = jwtDecode(token);
      
      if (decoded.role !== 'admin') {
        this.errorMessage.set('Access denied. Admin accounts only.');
        this.isLoading.set(false);
        return;
      }

      this.authService.saveToken(token);
      this.isLoading.set(false);
      this.router.navigate(['/dashboard']);
    },
    error: () => {
      this.errorMessage.set('Invalid email or password');
      this.isLoading.set(false);
    }
  });
}
}
