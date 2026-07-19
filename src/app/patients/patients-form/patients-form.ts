import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PatientService, Patient, BloodType } from '../../services/patient';
import { PrescriptionService, DrugSuggestion } from '../../services/prescription';
import { Subject, debounceTime, switchMap, of } from 'rxjs';

// نوع داخلي للفورم يسمح بـ bloodType = '' (قبل ما المستخدم يختار)
type PatientFormState = Omit<Partial<Patient>, 'bloodType'> & {
  bloodType?: BloodType | '';
};

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

  patient = signal<PatientFormState>({
    name: '',
    phone: '',
    dateOfBirth: '',
    gender: 'male',
    bloodType: '', // '' = لم يختر — بيتشال في _clean قبل ما يوصل للـ API
    allergies: [],
    chronicConditions: [],
    chronicMedications: [],
  });

  allergyInput = signal('');
  conditionInput = signal('');
  medicationInput = signal('');
  bloodTypes: BloodType[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  todayDate = new Date().toISOString().split('T')[0];
  fieldErrors = signal<{ name?: string; phone?: string; dateOfBirth?: string }>({});

  validate(): boolean {
    const errors: { name?: string; phone?: string; dateOfBirth?: string } = {};
    const { name, phone, dateOfBirth } = this.patient();

    if (!name || !name.trim()) {
      errors.name = 'الاسم الكامل مطلوب';
    } else if (!/^[\u0621-\u064A\s]+$/.test(name)) {
      errors.name = 'الاسم لازم يتكتب بحروف عربية بس';
    }

    if (!phone || !phone.trim()) {
      errors.phone = 'رقم الموبايل مطلوب';
    } else if (!/^01[0125][0-9]{8}$/.test(phone.trim())) {
      errors.phone = 'اكتب رقم موبايل مصري صحيح (زي 010/011/012/015XXXXXXXX)';
    }

    if (!dateOfBirth) {
      errors.dateOfBirth = 'تاريخ الميلاد مطلوب';
    } else if (new Date(dateOfBirth) > new Date()) {
      errors.dateOfBirth = 'تاريخ الميلاد مينفعش يكون في المستقبل';
    }

    this.fieldErrors.set(errors);
    return Object.keys(errors).length === 0;
  }

  medicationSuggestions = signal<DrugSuggestion[]>([]);
  showMedicationSuggestions = signal(false);
  searchingMedications = signal(false);
  private medicationQuery$ = new Subject<string>();

  constructor(
    private patientService: PatientService,
    private prescriptionService: PrescriptionService,
    private router: Router,
    private route: ActivatedRoute,
  ) {
    this.medicationQuery$
      .pipe(
        debounceTime(350),
        switchMap((query) => {
          if (!query || query.trim().length < 2) {
            this.searchingMedications.set(false);
            return of([] as DrugSuggestion[]);
          }
          this.searchingMedications.set(true);
          return this.prescriptionService
            .searchDrugs(query.trim())
            .pipe(switchMap((res) => of(res.data || [])));
        }),
      )
      .subscribe((data) => {
        this.searchingMedications.set(false);
        this.medicationSuggestions.set(data);
      });
  }

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
        const data: PatientFormState = {
          ...res.data,
          dateOfBirth: res.data.dateOfBirth?.split('T')[0],
          bloodType: res.data.bloodType ?? '', // undefined → '' عشان الـ select يشتغل صح
        };
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
      this.patient.update((p) => ({ ...p, allergies: [...(p.allergies || []), val] }));
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

  onMedicationInputChange(value: string): void {
    this.medicationInput.set(value);
    this.showMedicationSuggestions.set(true);
    this.medicationQuery$.next(value);
  }

  hideMedicationSuggestionsSoon(): void {
    setTimeout(() => this.showMedicationSuggestions.set(false), 200);
  }

  addMedication(name?: string): void {
    const val = (name ?? this.medicationInput()).trim();
    if (val) {
      this.patient.update((p) => {
        const existing = p.chronicMedications || [];
        if (existing.some((m) => m.toLowerCase() === val.toLowerCase())) return p;
        return { ...p, chronicMedications: [...existing, val] };
      });
    }
    this.medicationInput.set('');
    this.medicationSuggestions.set([]);
    this.showMedicationSuggestions.set(false);
  }

  selectMedicationSuggestion(drug: DrugSuggestion): void {
    this.addMedication(drug.displayName);
  }

  removeMedication(index: number): void {
    this.patient.update((p) => ({
      ...p,
      chronicMedications: p.chronicMedications?.filter((_, i) => i !== index),
    }));
  }

  updateField(field: keyof PatientFormState, value: any): void {
    this.patient.update((p) => ({ ...p, [field]: value }));
  }

  // بيحول الـ form state لـ Partial<Patient> نظيف —
  // بيشيل bloodType لو '' عشان الـ service و TypeScript يقبلوه
  private toPatient(state: PatientFormState): Partial<Patient> {
    const { bloodType, ...rest } = state;
    return bloodType ? { ...rest, bloodType } : rest;
  }

  onSubmit(): void {
    this.errorMessage.set('');

    if (!this.validate()) {
      this.errorMessage.set('من فضلك صحّح الحقول المظلّلة قبل الحفظ');
      return;
    }

    this.isLoading.set(true);
    const payload = this.toPatient(this.patient());

    if (this.isEditMode()) {
      this.patientService.update(this.patientId(), payload).subscribe({
        next: () => this.router.navigate(['/dashboard/patients']),
        error: (err) => {
          this.errorMessage.set(err?.error?.message || 'Failed to update patient');
          this.isLoading.set(false);
        },
      });
    } else {
      this.patientService.create(payload).subscribe({
        next: () => this.router.navigate(['/dashboard/patients']),
        error: (err) => {
          this.errorMessage.set(err?.error?.message || 'Failed to create patient');
          this.isLoading.set(false);
        },
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/dashboard/patients']);
  }
}
