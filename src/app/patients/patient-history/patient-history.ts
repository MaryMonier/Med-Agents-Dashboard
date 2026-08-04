import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PatientService, IPatientHistory, resolveLabFileUrl } from '../../services/patient';
import { DifferentialDiagnosisPanelComponent } from '../../shared/differential-diagnosis-panel/differential-diagnosis-panel';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-patient-history',
  standalone: true,
  imports: [CommonModule, FormsModule, DifferentialDiagnosisPanelComponent],
  templateUrl: './patient-history.html',
  styleUrl: './patient-history.css',
})
export class PatientHistory implements OnInit {
  patientId = signal('');
  data = signal<IPatientHistory | null>(null);
  isLoading = signal(false);
  errorMessage = signal('');

  patientName = computed(() => this.data()?.patient?.name || '');

  constructor(
    private patientService: PatientService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.params['id'];
    this.patientId.set(id);
    this.loadHistory();
  }

  loadHistory(): void {
    this.isLoading.set(true);
    this.patientService.getHistory(this.patientId()).subscribe({
      next: (res: any) => {
        this.data.set(res.data);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Failed to load patient history');
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

  urgencyClass(level: string): string {
    return 'urgency-' + (level || 'low').toLowerCase();
  }

  labFileUrl(url: string): string {
    return resolveLabFileUrl(url);
  }

  isImageFile(mimeType?: string): boolean {
    return !!mimeType && mimeType.startsWith('image/');
  }

  goBack(): void {
    this.router.navigate(['/dashboard/patients']);
  }

  // ─── "New Consultation" button ─── بيوديك لصفحة كاملة، مش بوب أب ───────
  openNewConsultation(): void {
    this.router.navigate(['/dashboard/patients/visit', this.patientId()]);
  }

  // ─── إيقاف دواء كروني (من غير ما نلمس الروشتة القديمة خالص) ───────────
  discontinueMedication(
    prescriptionId: string | undefined,
    medicationId: string | undefined,
    medName: string,
  ): void {
    if (!prescriptionId || !medicationId) return;

    Swal.fire({
      title: 'Discontinue this medication?',
      text: `"${medName}" will no longer be counted as an active medication in future interaction/dosage checks. The original prescription record will not be changed.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, discontinue',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (!result.isConfirmed) return;

      this.patientService
        .discontinueMedication(this.patientId(), { prescriptionId, medicationId })
        .subscribe({
          next: () => this.loadHistory(),
          error: (err) =>
            Swal.fire('Error', err?.error?.message || 'Something went wrong', 'error'),
        });
    });
  }

  // ─── التراجع عن الإيقاف ───────────────────────────────────────────────
  reactivateMedication(medicationId: string | undefined, medName: string): void {
    if (!medicationId) return;

    Swal.fire({
      title: 'Reactivate this medication?',
      text: `"${medName}" will be counted as an active medication again in future interaction/dosage checks.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, reactivate',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (!result.isConfirmed) return;

      this.patientService.reactivateMedication(this.patientId(), medicationId).subscribe({
        next: () => this.loadHistory(),
        error: (err) => Swal.fire('Error', err?.error?.message || 'Something went wrong', 'error'),
      });
    });
  }
}
