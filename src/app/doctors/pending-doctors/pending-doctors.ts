import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import Swal from 'sweetalert2';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-pending-doctors',
  imports: [CommonModule, FormsModule],
  templateUrl: './pending-doctors.html',
  styleUrl: './pending-doctors.css',
})
export class PendingDoctors implements OnInit {
  doctors = signal<any[]>([]);
  isLoading = signal(false);
  errorMessage = signal('');

  proofData = new Map<string, { url: string; safeUrl: SafeResourceUrl; isPdf: boolean }>();
  loadingProofFor = signal<string | null>(null);
  previewDoctorId = signal<string | null>(null);

  rejectingDoctorId = signal<string | null>(null);
  rejectionReason = '';

  constructor(private authService: AuthService, private sanitizer: DomSanitizer) {}

  ngOnInit() {
    this.loadPendingDoctors();
  }

  loadPendingDoctors() {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.authService.getPendingDoctors().subscribe({
      next: (res) => {
        this.doctors.set(res.data || []);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('An error occurred while loading pending registration requests');
        this.isLoading.set(false);
      },
    });
  }

  viewProof(doctorId: string) {
    if (this.proofData.has(doctorId)) {
      this.previewDoctorId.set(doctorId);
      return;
    }

    this.loadingProofFor.set(doctorId);
    this.authService.getCredentialProofBlob(doctorId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
        this.proofData.set(doctorId, { url, safeUrl, isPdf: blob.type === 'application/pdf' });
        this.loadingProofFor.set(null);
        this.previewDoctorId.set(doctorId);
      },
      error: () => {
        this.loadingProofFor.set(null);
        Swal.fire('Error', 'Failed to load the proof document', 'error');
      },
    });
  }

  closePreview() {
    this.previewDoctorId.set(null);
  }

  getProofData(doctorId: string) {
    return this.proofData.get(doctorId);
  }

  approve(doctor: any) {
    Swal.fire({
      title: `Approve Dr. ${doctor.name}?`,
      text: 'They will be able to use the full app immediately after approval.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#1D9E75',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Approve',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (!result.isConfirmed) return;

      this.authService.approveDoctor(doctor._id).subscribe({
        next: () => {
          this.doctors.update((list) => list.filter((d) => d._id !== doctor._id));
          Swal.fire('Approved', `Dr. ${doctor.name}'s account is now active`, 'success');
        },
        error: () => Swal.fire('Error', 'Failed to approve. Please try again', 'error'),
      });
    });
  }

  openRejectDialog(doctorId: string) {
    this.rejectingDoctorId.set(doctorId);
    this.rejectionReason = '';
  }

  cancelReject() {
    this.rejectingDoctorId.set(null);
    this.rejectionReason = '';
  }

  confirmReject(doctor: any) {
    this.authService.rejectDoctor(doctor._id, this.rejectionReason).subscribe({
      next: () => {
        this.doctors.update((list) => list.filter((d) => d._id !== doctor._id));
        this.rejectingDoctorId.set(null);
        Swal.fire('Rejected', `Dr. ${doctor.name}'s registration request has been rejected`, 'success');
      },
      error: () => Swal.fire('Error', 'Failed to reject. Please try again', 'error'),
    });
  }
}
