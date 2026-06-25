import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar {
  isOpen = signal(false);

  constructor(private authService: AuthService, private router: Router) {}

  toggleSidebar() {
    this.isOpen.set(!this.isOpen());
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}