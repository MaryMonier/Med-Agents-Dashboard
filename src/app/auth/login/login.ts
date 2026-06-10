import { Component, signal } from '@angular/core';
import { AuthService } from '../../services/auth';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  email = signal('');
  password = signal('');
  isLoading = signal(false);
  errorMessage= signal('');
  constructor( private authService: AuthService ,private router: Router  ){}

  onLogin(){
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.authService.login(this.email(),this.password()).subscribe({
      next:(res)=>{
        this.authService.saveToken(res.data.token);
        this.isLoading.set(false);
        this.router.navigate(['/dashboard'])
      },
      error:(err)=>{
        this.errorMessage.set('invalid email or password');
        this.isLoading.set(false);
      }
    })

  }
}
