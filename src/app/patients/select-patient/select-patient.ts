import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PatientService, Patient } from '../../services/patient';

@Component({
  selector: 'app-select-patient',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './select-patient.html',
  styleUrl: './select-patient.css',
})
export class SelectPatient {
  patients = signal<Patient[]>([]);
  searchTerm = signal('');
  isLoading = signal(false);
  errorMessage = signal('');
  hasSearched = signal(false);

  constructor(
    private patientService: PatientService,
    private router: Router,
  ) {}

  search(): void {
    const term = this.searchTerm().trim();
    if (!term) return;

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.hasSearched.set(true);

    this.patientService.getAll(term).subscribe({
      next: (res) => {
        this.patients.set(res.data || []);
        this.isLoading.set(false);
        if ((res.data || []).length === 0) {
          this.errorMessage.set('No patients found with this name');
        }
      },
      error: () => {
        this.errorMessage.set('Failed to search patients');
        this.isLoading.set(false);
      },
    });
  }

  calculateAge(dateOfBirth: string): number {
    const today = new Date();
    const birth = new Date(dateOfBirth);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  }

  selectPatient(patient: Patient): void {
    this.router.navigate(['/dashboard/patients/history', patient._id]);
  }

  goBack(): void {
    this.router.navigate(['/consultations']);
  }
}
