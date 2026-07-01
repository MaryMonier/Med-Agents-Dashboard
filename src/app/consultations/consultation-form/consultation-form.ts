import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import Swal from 'sweetalert2';
import { ConsultationService } from '../../services/consultation';
import { PrescriptionService } from '../../services/prescription';
import {
  ClinicalInsightsCardComponent,
  AiRecommendationResult,
} from '../../shared/clinical-insights-card/clinical-insights-card';
import { PrescriptionModalComponent } from '../../shared/prescription-modal/prescription-modal';

@Component({
  selector: 'app-consultation-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatAutocompleteModule,
    MatDatepickerModule,
    MatNativeDateModule,
    ClinicalInsightsCardComponent,
    PrescriptionModalComponent,
  ],
  templateUrl: './consultation-form.html',
  styleUrl: './consultation-form.css',
})
export class ConsultationFormComponent implements OnInit {
  form!: FormGroup;
  isEditMode = false;
  consultationId: string | null = null;

  isLoading = signal(false);
  patients = signal<any[]>([]);

  // ─── AI Recommendation step ────────────────────────────────────────────
  isGeneratingAi = signal(false);
  aiResult = signal<AiRecommendationResult | null>(null);
  isSaved = signal(false); // الدكتور لازم يدوس Get AI Recommendation الأول

  // ─── Prescription modal (opens right after "Save Record") ─────────────
  showPrescriptionModal = signal(false);
  savedConsultationId = signal<string>('');
  existingPrescription = signal<any>(null);

  minDate: Date = new Date();
  maxDate: Date = new Date();

  filteredPatients = computed(() => {
    const search = (this.form?.get('patientName')?.value ?? '').toLowerCase();
    if (!search) return this.patients();
    return this.patients().filter((p: any) => p.name.toLowerCase().includes(search));
  });

  selectedPatient = computed(() => {
    const id = this.form?.get('patientId')?.value;
    return this.patients().find((p: any) => p._id === id) || null;
  });

  constructor(
    private fb: FormBuilder,
    private consultationService: ConsultationService,
    private prescriptionService: PrescriptionService,
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient,
  ) {}

  ngOnInit(): void {
    this.setDateLimits();
    this.initForm();
    this.loadPatients();
    this.consultationId = this.route.snapshot.params['id'] ?? null;
    if (this.consultationId) {
      this.isEditMode = true;
      this.isSaved.set(true); // في وضع التعديل، السايكل ماينفعش يتكرر
    }
  }

  setDateLimits(): void {
    const today = new Date();

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    this.minDate = tomorrow;

    const maxDate = new Date(today);
    maxDate.setMonth(maxDate.getMonth() + 6);
    this.maxDate = maxDate;
  }

  followUpDateValidator() {
    return (control: AbstractControl) => {
      if (!control.value) return null;

      const selected = new Date(control.value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const maxDate = new Date();
      maxDate.setMonth(maxDate.getMonth() + 6);

      if (selected <= today) {
        return { pastDate: true };
      }

      if (selected > maxDate) {
        return { maxDate: true };
      }

      return null;
    };
  }

  initForm(): void {
    this.form = this.fb.group({
      patientId: ['', Validators.required],
      patientName: ['', Validators.required],
      rawInput: ['', [Validators.required, Validators.minLength(10)]],
      symptoms: ['', Validators.required],
      diagnosis: [''],
      language: ['en', Validators.required],
      isChronic: [false],
      followUpDate: ['', [this.followUpDateValidator()]],
    });

    // أي تعديل في الملاحظات أو الأعراض بعد الحصول على رأي الـ AI يبطّله، عشان
    // الدكتور يضطر يطلب رأي جديد قبل الحفظ. الدياجنوزيز نفسها مش من مدخلات
    // الـ AI المباشرة (بيتكتب بعد الرأي عادة) فمبيبطلش الحفظ لما يتغير
    ['rawInput', 'symptoms'].forEach((field) => {
      this.form.get(field)?.valueChanges.subscribe(() => {
        if (!this.isEditMode) {
          this.isSaved.set(false);
        }
      });
    });
  }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
  }

  loadPatients(): void {
    this.http
      .get<any>('http://localhost:5000/api/patient', {
        headers: this.getAuthHeaders(),
      })
      .subscribe({
        next: (res: any) => {
          this.patients.set(res.data || res);
          if (this.consultationId) {
            this.loadConsultation();
          }
        },
        error: (err: any) => console.error('Failed to load patients', err),
      });
  }

  loadConsultation(): void {
    this.consultationService.getById(this.consultationId!).subscribe({
      next: (res: any) => {
        const patient = this.patients().find((p: any) => p._id === res.data.patientId);
        this.form.patchValue({
          ...res.data,
          patientName: patient?.name ?? '',
          symptoms: Array.isArray(res.data.symptoms)
            ? res.data.symptoms.join(', ')
            : (res.data.symptoms ?? ''),
          followUpDate: res.data.followUpDate ? new Date(res.data.followUpDate) : null,
        });
        this.aiResult.set({
          structuredNote: res.data.structuredNote,
          suggestedSpecialist: res.data.suggestedSpecialist,
          urgencyLevel: res.data.urgencyLevel,
        });
      },
      error: (err: any) => console.error('Failed to load consultation', err),
    });
  }

  onPatientSelected(patient: any): void {
    this.form.patchValue({
      patientId: patient._id,
      patientName: patient.name,
    });
  }

  onPatientInputChange(): void {
    this.form.patchValue({ patientId: '' });
  }

  // ─── Step 1: Get AI Recommendation ─────────────────────────────────────
  getAiRecommendation(): void {
    const { rawInput, symptoms, diagnosis, language } = this.form.value;

    if (!rawInput || rawInput.trim().length < 10 || !symptoms) {
      Swal.fire(
        'Missing data',
        'Please fill in the doctor notes (at least 10 characters) and symptoms first.',
        'warning',
      );
      return;
    }

    this.isGeneratingAi.set(true);

    const payload = {
      rawInput,
      diagnosis: diagnosis || '',
      language: language || 'en',
      symptoms: symptoms
        .split(',')
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0),
    };

    // أول كول ممكن يفشل لظروف بيئة عابرة، فبنعمل كذا محاولة هادية تلقائية
    // قبل ما نضايق الدكتور بإيرور (بدل ما هو يدوس الزرار يدوي كذا مرة)
    const MAX_ATTEMPTS = 3;
    const attempt = (attemptNumber: number) => {
      this.consultationService.getAIRecommendation(payload).subscribe({
        next: (res: any) => {
          this.isGeneratingAi.set(false);
          this.aiResult.set(res.data);
          this.isSaved.set(true);
        },
        error: () => {
          if (attemptNumber < MAX_ATTEMPTS) {
            setTimeout(() => attempt(attemptNumber + 1), 1000 * attemptNumber);
          } else {
            this.isGeneratingAi.set(false);
            Swal.fire('Error', 'Failed to get AI recommendation', 'error');
          }
        },
      });
    };

    attempt(1);
  }

  // ─── Step 2: Save Record (then open the prescription modal) ────────────
  onSubmit(): void {
    if (this.form.invalid) return;

    if (!this.isEditMode && !this.aiResult()) {
      Swal.fire(
        'AI Recommendation required',
        'Please get the AI recommendation before saving the record.',
        'warning',
      );
      return;
    }

    this.isLoading.set(true);

    const { patientName, ...rest } = this.form.value;

    const formValue = {
      ...rest,
      symptoms: this.form.value.symptoms
        .split(',')
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0),
      followUpDate: this.form.value.followUpDate
        ? new Date(this.form.value.followUpDate).toISOString()
        : undefined,
    };

    if (this.isEditMode) {
      this.consultationService.update(this.consultationId!, formValue).subscribe({
        next: () => {
          this.isLoading.set(false);
          Swal.fire({
            title: 'Saved Successfully',
            text: formValue.isChronic
              ? 'Consultation updated and diagnosis added to patient chronic diseases history.'
              : 'Consultation record updated successfully.',
            icon: 'success',
            timer: 1800,
            showConfirmButton: false,
          });
          this.router.navigateByUrl('/consultations');
        },
        error: () => this.isLoading.set(false),
      });
      return;
    }

    this.consultationService.create(formValue).subscribe({
      next: (res: any) => {
        this.isLoading.set(false);
        const newConsultationId = res?.data?._id;

        Swal.fire({
          title: 'Saved Successfully',
          text: formValue.isChronic
            ? 'Consultation saved and diagnosis added to patient chronic diseases history.'
            : 'Consultation record saved successfully.',
          icon: 'success',
          timer: 1800,
          showConfirmButton: false,
        });

        // افتح مودال إضافة الروشتة على طول بعد الحفظ، زي ما بيحصل في الرياكت
        this.savedConsultationId.set(newConsultationId || '');
        this.existingPrescription.set(null);
        this.showPrescriptionModal.set(true);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  closePrescriptionModal(): void {
    this.showPrescriptionModal.set(false);
    this.router.navigateByUrl('/consultations');
  }

  onPrescriptionSaved(): void {
    this.showPrescriptionModal.set(false);
    this.router.navigateByUrl('/prescriptions');
  }
}
