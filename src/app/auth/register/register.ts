import { Component, signal } from '@angular/core';
import { AuthService } from '../../services/auth';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-register',
  imports: [CommonModule, FormsModule],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  name = signal('');
  email = signal('');
  password = signal('');
  specialization =signal('');
  isLoading = signal(false);
  errorMessage = signal ('');

  constructor (private authService: AuthService, private router: Router){}
  onRegister(){
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.authService.register({
      name: this.name(),
      email: this.email(),
      password: this.password(),
      specialization: this.specialization()
    }).subscribe({
      next: (res)=>{
        this.authService.saveToken(res.data.token);
        this.isLoading.set(false);
        this.router.navigate(['/dashboard'])
      },
      error: (err)=>{
        this.errorMessage.set('Registration failed. Please try again.');
        this.isLoading.set(false);
      }
    })
  }
}
