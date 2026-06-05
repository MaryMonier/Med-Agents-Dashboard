import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { PrescriptionService } from '../services/prescription';

@Component({
  selector: 'app-prescription-form',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './prescription-form.html',
  styleUrl: './prescription-form.css',
})
export class PrescriptionForm {
  consultationId = signal('');
  patientId = signal('');
  language = signal('en');

  medicationName = signal('');
  dose = signal('');
  frequency = signal('');
  duration = signal('');

  isLoading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  constructor(
    private prescriptionService: PrescriptionService,
    private router: Router
  ) {}

  createPrescription() {
    if (
      !this.consultationId().trim() ||
      !this.patientId().trim() ||
      !this.medicationName().trim() ||
      !this.dose().trim() ||
      !this.frequency().trim() ||
      !this.duration().trim()
    ) {
      this.errorMessage.set('All fields are required');
      return;
    }

    const payload = {
      consultationId: this.consultationId(),
      patientId: this.patientId(),
      language: this.language(),
      medications: [
        {
          name: this.medicationName(),
          dose: this.dose(),
          frequency: this.frequency(),
          duration: this.duration(),
        },
      ],
    };

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.prescriptionService.createPrescription(payload).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.successMessage.set('Prescription created successfully');

        setTimeout(() => {
          this.router.navigate(['/prescriptions']);
        }, 800);
      },
      error: () => {
        this.isLoading.set(false);
        this.errorMessage.set('Failed to create prescription');
      },
    });
  }
}
