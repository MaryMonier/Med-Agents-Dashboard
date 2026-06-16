import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PrescriptionService } from '../services/prescription';
import Swal from 'sweetalert2';
@Component({
  selector: 'app-prescriptions-list',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './prescriptions-list.html',
  styleUrl: './prescriptions-list.css',
})
export class PrescriptionsList {
  patientId = signal('');
  prescriptions = signal<any[]>([]);
  isLoading = signal(false);
  errorMessage = signal('');

  constructor(private prescriptionService: PrescriptionService) {}

  searchByPatient() {
    if (!this.patientId().trim()) {
      this.errorMessage.set('Patient ID is required');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.prescriptionService.getPrescriptionsByPatient(this.patientId()).subscribe({
      next: (res) => {
        this.prescriptions.set(res.data || []);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Failed to load prescriptions');
        this.isLoading.set(false);
      },
    });
  }

 async deletePrescription(id: string) {
  const result = await Swal.fire({
    title: 'Are you sure?',
    text: 'This prescription will be deleted permanently.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Yes, delete it',
    cancelButtonText: 'Cancel',
  });

  if (!result.isConfirmed) return;

  this.prescriptionService.deletePrescription(id).subscribe({
    next: () => {
      this.prescriptions.set(
        this.prescriptions().filter((item) => item._id !== id)
      );

      Swal.fire({
        title: 'Deleted!',
        text: 'Prescription deleted successfully.',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
      });
    },
    error: () => {
      Swal.fire({
        title: 'Error',
        text: 'Failed to delete prescription.',
        icon: 'error',
      });
    },
  });
}
}
