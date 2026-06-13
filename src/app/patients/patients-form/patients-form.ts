import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PatientService, Patient } from '../../services/patient';

@Component({
  selector: 'app-patients-form',
  imports: [CommonModule, FormsModule],
  templateUrl: './patients-form.html',
  styleUrl: './patients-form.css',
})
export class PatientsForm implements OnInit {
  isEditMode = signal(false);
  patientId = signal('');
  isLoading = signal(false);
  errorMessage = signal('');

  patient = signal<Partial<Patient>>({
    name: '',
    dateOfBirth: '',
    gender: 'male',
    bloodType: 'A+',
    allergies: [],
    chronicConditions: [],
  });

  allergyInput = signal('');
  conditionInput = signal('');
  bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  constructor(
    private patientService: PatientService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.params['id'];
    if (id) {
      this.patientId.set(id);
      this.isEditMode.set(true);
      this.loadPatient();
    }
  }

  loadPatient(): void {
    this.isLoading.set(true);
    this.patientService.getById(this.patientId()).subscribe({
      next: (res) => {
        const data = { ...res.data, dateOfBirth: res.data.dateOfBirth?.split('T')[0] };
        this.patient.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Failed to load patient');
        this.isLoading.set(false);
      },
    });
  }

  addAllergy(): void {
    const val = this.allergyInput().trim();
    if (val) {
      this.patient.update((p) => ({
        ...p,
        allergies: [...(p.allergies || []), val],
      }));
      this.allergyInput.set('');
    }
  }

  removeAllergy(index: number): void {
    this.patient.update((p) => ({
      ...p,
      allergies: p.allergies?.filter((_, i) => i !== index),
    }));
  }

  addCondition(): void {
    const val = this.conditionInput().trim();
    if (val) {
      this.patient.update((p) => ({
        ...p,
        chronicConditions: [...(p.chronicConditions || []), val],
      }));
      this.conditionInput.set('');
    }
  }

  removeCondition(index: number): void {
    this.patient.update((p) => ({
      ...p,
      chronicConditions: p.chronicConditions?.filter((_, i) => i !== index),
    }));
  }

  updateField(field: keyof Patient, value: any): void {
    this.patient.update((p) => ({ ...p, [field]: value }));
  }

  onSubmit(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    if (this.isEditMode()) {
      this.patientService.update(this.patientId(), this.patient()).subscribe({
        next: () => this.router.navigate(['/dashboard/patients']),
        error: () => {
          this.errorMessage.set('Failed to update patient');
          this.isLoading.set(false);
        },
      });
    } else {
      this.patientService.create(this.patient()).subscribe({
        next: () => this.router.navigate(['/dashboard/patients']),
        error: () => {
          this.errorMessage.set('Failed to create patient');
          this.isLoading.set(false);
        },
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/dashboard/patients']);
  }
}
