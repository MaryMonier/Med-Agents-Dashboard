import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-doctors-list',
  imports: [CommonModule, FormsModule],
  templateUrl: './doctors-list.html',
  styleUrl: './doctors-list.css',
})
export class DoctorsList implements OnInit {
  allDoctors = signal<any[]>([]); // كل الداتا من السيرفر - بتتجاب مرة واحدة بس
  isLoading = signal(false);
  errorMessage = signal('');
  searchQuery = signal('');
  currentPage = signal(1);
  limit = 10;

  private apiUrl = environment.apiUrl;

  filteredDoctors = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return this.allDoctors();
    return this.allDoctors().filter((d: any) =>
      d.name?.toLowerCase().includes(query) ||
      d.email?.toLowerCase().includes(query)
    );
  });

  totalDoctors = computed(() => this.filteredDoctors().length);
  totalPages = computed(() => Math.ceil(this.totalDoctors() / this.limit));

  doctors = computed(() => {
    const start = (this.currentPage() - 1) * this.limit;
    return this.filteredDoctors().slice(start, start + this.limit);
  });

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit() {
    this.loadDoctors();
  }

  loadDoctors() {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.http.get<any>(`${this.apiUrl}/auth/doctors`).subscribe({
      next: (res) => {
        this.allDoctors.set(res.data || []);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('حصل خطأ أثناء تحميل الدكاترة');
        this.isLoading.set(false);
      }
    });
  }

  onSearchChange(value: string) {
    this.searchQuery.set(value);
    this.currentPage.set(1);
  }

  clearSearch() {
    this.searchQuery.set('');
    this.currentPage.set(1);
  }

  goToAdd() {
    this.router.navigate(['/dashboard/doctors/add']);
  }

  goToDetail(id: string) {
    this.router.navigate(['/dashboard/doctors', id]);
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
            this.loadDoctors(); // هنا لازم نجيب تاني فعلاً، لأن الداتا اتغيرت في السيرفر
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
  }

  nextPage() { this.goToPage(this.currentPage() + 1); }
  prevPage() { this.goToPage(this.currentPage() - 1); }
}