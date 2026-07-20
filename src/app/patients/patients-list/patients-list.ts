import { Component, NgModule, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { PatientService, Patient } from '../../services/patient';
import { FormsModule, NgModel } from '@angular/forms';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-patients-list',
  imports: [CommonModule, FormsModule],
  templateUrl: './patients-list.html',
  styleUrl: './patients-list.css',
})
export class PatientsList implements OnInit {
  patients = signal<Patient[]>([]);
  isLoading = signal(false);
  errorMessage = signal('');
  searchQuery = signal('');

  onSearch(value: string): void {
    this.searchQuery.set(value);
    this.loadPatients();
  }

  constructor(
    private patientService: PatientService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadPatients();
  }

  currentPage = signal(1);
  totalPages = signal(0);
  totalPatients = signal(0);
  limit = 10;

  loadPatients(): void {
    this.isLoading.set(true);
    this.patientService.getAll(this.searchQuery(), this.currentPage(), this.limit).subscribe({
      next: (res) => {
        this.patients.set(res.data);

        if (res.pagination) {
          this.totalPages.set(res.pagination.totalPages);
          this.totalPatients.set(res.pagination.total);
        } else {
          this.totalPages.set(0);
          this.totalPatients.set(res.data.length);
        }

        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Failed to load patients');
        this.isLoading.set(false);
      },
    });
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.loadPatients();
  }

  nextPage(): void {
    this.goToPage(this.currentPage() + 1);
  }
  prevPage(): void {
    this.goToPage(this.currentPage() - 1);
  }
  goToAdd(): void {
    this.router.navigate(['/dashboard/patients/add']);
  }

  goToEdit(id: string): void {
    this.router.navigate(['/dashboard/patients/edit', id]);
  }
goToHistory(id: string): void {
  this.router.navigate(['/dashboard/patients/history', id]);
}

deletePatient(id: string): void {
  Swal.fire({
    title: 'Are you sure?',
    text: 'You will not be able to revert this!',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#e53e3e',
    cancelButtonColor: '#3B5BDB',
    confirmButtonText: 'Yes, delete it!',
    cancelButtonText: 'Cancel'
  }).then((result) => {
    if (result.isConfirmed) {
      this.patientService.delete(id).subscribe({
        next: () => {
          this.patients.update(list => list.filter(p => p._id !== id));
          Swal.fire('Deleted!', 'Patient has been deleted.', 'success');
        },
        error: () => {
          Swal.fire('Error!', 'Failed to delete patient.', 'error');
        }
      });
    }
  });
}

  // اسم الدكتور بتاع المريض - patient.createdBy ممكن تيجي string (ID) لو
  // مفيش populate، أو object كامل فيه name لو الـ backend عمل populate
  doctorName(patient: Patient): string {
    const createdBy = patient.createdBy;
    if (!createdBy) return '—';
    if (typeof createdBy === 'string') return '—';
    return createdBy.name || '—';
  }

  calculateAge(dateOfBirth: string): number {
    const today = new Date();
    const birth = new Date(dateOfBirth);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  }
}