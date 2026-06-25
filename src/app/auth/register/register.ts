import { Component, signal } from '@angular/core';
import { AuthService } from '../../services/auth';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-register',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  name = signal('');
  email = signal('');
  password = signal('');
  specialization = signal('');
  isLoading = signal(false);
  errorMessage = signal('');

  constructor(private authService: AuthService, private router: Router) {}

  onRegister() {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.authService.register({
      name: this.name(),
      email: this.email(),
      password: this.password(),
      specialty: this.specialization(),
  secretKey: environment.adminSecret  // 
    }).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.router.navigate(['/auth/login']);
      },
      error: (err) => {
        this.errorMessage.set('Registration failed. Please try again.');
        this.isLoading.set(false);
      }
    });
  }
}