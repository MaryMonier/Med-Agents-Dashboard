import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PatientService, Patient } from '../../services/patient.service';

@Component({
  selector: 'app-patient-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './patient-list.html',
})
export class PatientListComponent implements OnInit {
  patients: Patient[] = [];
  filtered: Patient[] = [];
  searchQuery = '';
  isLoading = true;
  errorMessage = '';

  constructor(private patientService: PatientService) {}

  ngOnInit(): void {
    this.loadPatients();
  }

  loadPatients(): void {
    this.isLoading = true;
    this.patientService.getAll().subscribe({
      next: (res) => {
        this.patients = res.data;
        this.filtered = res.data;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Failed to load patients.';
        this.isLoading = false;
      }
    });
  }

  onSearch(): void {
    const q = this.searchQuery.toLowerCase();
    this.filtered = this.patients.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.gender.toLowerCase().includes(q) ||
      p.bloodType.toLowerCase().includes(q)
    );
  }

  deletePatient(id: string): void {
    if (!confirm('Delete this patient?')) return;
    this.patientService.delete(id).subscribe(() => this.loadPatients());
  }

  calcAge(dob: string): number {
    return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000));
  }
}
