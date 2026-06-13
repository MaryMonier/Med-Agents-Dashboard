import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-panel.html',
  styleUrl: './admin-panel.css'
})
export class AdminPanelComponent implements OnInit {
  doctors = signal<any[]>([]);
  isLoading = signal(false);
  private apiUrl = 'http://localhost:5000/api';

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadDoctors();
  }

  loadDoctors() {
    this.isLoading.set(true);
    this.http.get<any>(`${this.apiUrl}/auth/doctors`).subscribe({
      next: (res) => {
        this.doctors.set(res.data || []);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  deleteDoctor(id: string) {
    if (confirm('Are you sure you want to delete this doctor?')) {
      this.http.delete(`${this.apiUrl}/auth/doctors/${id}`).subscribe({
        next: () => this.loadDoctors(),
        error: (err) => console.error(err)
      });
    }
  }
}