import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-doctors-list',
  imports: [CommonModule, FormsModule],
  templateUrl: './doctors-list.html',
  styleUrl: './doctors-list.css',
})
export class DoctorsList implements OnInit {
  doctors = signal<any[]>([]);
  isLoading = signal(false);
  errorMessage = signal('');
  searchQuery = signal('');

  currentPage = signal(1);
  totalPages = signal(0);
  totalDoctors = signal(0);
  limit = 10;

  private apiUrl = 'http://localhost:5000/api';

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit() {
    this.loadDoctors();
  }

  loadDoctors() {
    this.isLoading.set(true);
    this.http.get<any>(`${this.apiUrl}/auth/doctors`).subscribe({
      next: (res) => {
        let data = res.data || [];
        if (this.searchQuery()) {
          data = data.filter((d: any) =>
            d.name.toLowerCase().includes(this.searchQuery().toLowerCase()) ||
            d.email.toLowerCase().includes(this.searchQuery().toLowerCase())
          );
        }
        this.totalDoctors.set(data.length);
        this.totalPages.set(Math.ceil(data.length / this.limit));
        const start = (this.currentPage() - 1) * this.limit;
        this.doctors.set(data.slice(start, start + this.limit));
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  goToAdd() {
    this.router.navigate(['/dashboard/doctors/add']);
  }

  goToEdit(id: string) {
    this.router.navigate(['/dashboard/doctors/edit', id]);
  }

  deleteDoctor(id: string) {
    Swal.fire({
      title: 'Are you sure?',
      text: 'You will not be able to revert this!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e53e3e',
      cancelButtonColor: '#3B5BDB',
      confirmButtonText: 'Yes, delete it!',
    }).then((result) => {
      if (result.isConfirmed) {
        this.http.delete(`${this.apiUrl}/auth/doctors/${id}`).subscribe({
          next: () => {
            this.loadDoctors();
            Swal.fire('Deleted!', 'Doctor has been deleted.', 'success');
          },
          error: () => Swal.fire('Error!', 'Failed to delete doctor.', 'error')
        });
      }
    });
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.loadDoctors();
  }

  nextPage() { this.goToPage(this.currentPage() + 1); }
  prevPage() { this.goToPage(this.currentPage() - 1); }
}