import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Component, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar implements OnInit {
  isOpen = signal(false);
  pendingCount = signal(0);

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit() {
    // بس عشان نوري badge بعدد الطلبات المعلّقة - لو فشل النداء لأي سبب
    // (مثلاً مش admin)، منعملش أي حاجة، الـ badge هيفضل مخفي وبس
    this.authService.getPendingDoctors().subscribe({
      next: (res) => this.pendingCount.set((res.data || []).length),
      error: () => {},
    });
  }

  toggleSidebar() {
    this.isOpen.set(!this.isOpen());
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}
