import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { Medication, PrescriptionService } from '../services/prescription';

@Component({
  selector: 'app-prescription-form',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './prescription-form.html',
  styleUrl: './prescription-form.css',
})
export class PrescriptionForm implements OnInit {
  consultationId = signal('');
  patientId = signal('');

  patientName = signal('');
  patientAllergies = signal<string[]>([]);
  patientChronicConditions = signal<string[]>([]);

  language = signal('en');

  medicationName = signal('');
  dose = signal('');
  frequency = signal('');
  duration = signal('');

  isLoading = signal(false);
  isPatientLoading = signal(false);
  isCheckingSafety = signal(false);

  errorMessage = signal('');
  successMessage = signal('');

  safetyStatus = signal<'idle' | 'success' | 'warning' | 'error'>('idle');
  safetyResult = signal<any>(null);

  constructor(
    private prescriptionService: PrescriptionService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    const consultationIdFromUrl =
      this.route.snapshot.queryParamMap.get('consultationId') || '';

    const patientIdFromUrl =
      this.route.snapshot.queryParamMap.get('patientId') || '';

    this.consultationId.set(consultationIdFromUrl);
    this.patientId.set(patientIdFromUrl);

    if (!consultationIdFromUrl || !patientIdFromUrl) {
      this.errorMessage.set(
        'Please open this form from a consultation using Add Prescription button.'
      );
      return;
    }

    this.loadPatientData(patientIdFromUrl);
  }

  loadPatientData(patientId: string) {
    this.isPatientLoading.set(true);

    this.prescriptionService.getPatientById(patientId).subscribe({
      next: (res) => {
        const patient = res.data;

        this.patientName.set(patient?.name || 'Unknown Patient');
        this.patientAllergies.set(patient?.allergies || []);
        this.patientChronicConditions.set(patient?.chronicConditions || []);

        this.isPatientLoading.set(false);
      },
      error: () => {
        this.patientName.set('Patient not found');
        this.isPatientLoading.set(false);
        this.errorMessage.set('Failed to load patient data.');
      },
    });
  }

  buildMedication(): Medication {
    return {
      name: this.medicationName().trim(),
      dose: this.dose().trim(),
      frequency: this.frequency().trim(),
      duration: this.duration().trim(),
    };
  }

  resetSafety() {
    this.safetyStatus.set('idle');
    this.safetyResult.set(null);
  }

  hasMedicationName(): boolean {
    return !!this.medicationName().trim();
  }

  hasAllMedicationFields(): boolean {
    return (
      !!this.medicationName().trim() &&
      !!this.dose().trim() &&
      !!this.frequency().trim() &&
      !!this.duration().trim()
    );
  }

  checkDrugSafety() {
    this.errorMessage.set('');
    this.successMessage.set('');

    if (!this.patientId()) {
      this.errorMessage.set('Missing patient data.');
      return;
    }

    if (!this.hasMedicationName()) {
      this.errorMessage.set('Please enter medication name before checking safety.');
      return;
    }

    this.isCheckingSafety.set(true);
    this.safetyStatus.set('idle');
    this.safetyResult.set(null);

    this.prescriptionService
      .checkDrugSafetyForPatient(
        this.patientId(),
        [this.buildMedication()],
        this.language()
      )
      .subscribe({
        next: (res) => {
          this.isCheckingSafety.set(false);

          if (res.success) {
            this.safetyStatus.set('success');
            this.safetyResult.set(res.data || 'No safety issues found.');
          } else {
            this.safetyStatus.set('warning');
            this.safetyResult.set(res.data || res.message || 'Safety warning found.');
          }
        },
        error: (err) => {
          this.isCheckingSafety.set(false);
          this.safetyStatus.set('error');
          this.safetyResult.set(
            err?.error?.message || 'Failed to check drug safety.'
          );
        },
      });
  }

  formatSafetyResult(): string {
  const result = this.safetyResult();

  if (!result) return '';

  if (typeof result === 'string') {
    return result;
  }

  if (result.content) {
    return result.content;
  }

  if (Array.isArray(result)) {
    return result
      .map((item, index) => {
        if (typeof item === 'string') {
          return `${index + 1}. ${item}`;
        }

        if (item.content) {
          return `${index + 1}. ${item.content}`;
        }

        return `${index + 1}. ${JSON.stringify(item, null, 2)}`;
      })
      .join('\n');
  }

  return JSON.stringify(result, null, 2);
}

  createPrescription() {
    this.errorMessage.set('');
    this.successMessage.set('');

    if (!this.consultationId().trim() || !this.patientId().trim()) {
      this.errorMessage.set(
        'Missing consultation or patient data. Please open this form from a consultation.'
      );
      return;
    }

    if (!this.hasAllMedicationFields()) {
      this.errorMessage.set('All medication fields are required.');
      return;
    }

    const payload = {
      consultationId: this.consultationId(),
      patientId: this.patientId(),
      language: this.language(),
      medications: [this.buildMedication()],
    };

    this.isLoading.set(true);

    this.prescriptionService.createPrescription(payload).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.successMessage.set('Prescription created successfully.');

        setTimeout(() => {
          this.router.navigate(['/prescriptions']);
        }, 800);
      },
      error: () => {
        this.isLoading.set(false);
        this.errorMessage.set('Failed to create prescription.');
      },
    });
  }
}
