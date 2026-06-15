import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ConsultationService } from '../../services/consultation';

@Component({
  selector: 'app-consultation-form',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterModule,
    MatFormFieldModule, MatInputModule, MatButtonModule,
    MatSelectModule, MatProgressSpinnerModule, MatIconModule,
    MatAutocompleteModule, MatDatepickerModule, MatNativeDateModule
  ],
  templateUrl: './consultation-form.html',
  styleUrl: './consultation-form.css'
})
export class ConsultationFormComponent implements OnInit {

  form!: FormGroup;
  isEditMode = false;
  consultationId: string | null = null;

  isLoading = signal(false);
  patients = signal<any[]>([]);

  minDate: Date = new Date();
  maxDate: Date = new Date();

  filteredPatients = computed(() => {
    const search = (this.form?.get('patientName')?.value ?? '').toLowerCase();
    if (!search) return this.patients();
    return this.patients().filter(p =>
      p.name.toLowerCase().includes(search)
    );
  });

  constructor(
    private fb: FormBuilder,
    private consultationService: ConsultationService,
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.setDateLimits();
    this.initForm();
    this.loadPatients();
    this.consultationId = this.route.snapshot.params['id'] ?? null;
    if (this.consultationId) {
      this.isEditMode = true;
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
      patientId:    ['', Validators.required],
      patientName:  ['', Validators.required],
      rawInput:     ['', [Validators.required, Validators.minLength(10)]],
      symptoms:     ['', Validators.required],
      diagnosis:    [''],
      language:     ['en', Validators.required],
      followUpDate: ['', [this.followUpDateValidator()]]
    });
  }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
  }

  loadPatients(): void {
    this.http.get<any>('http://localhost:5000/api/patient', {
      headers: this.getAuthHeaders()
    }).subscribe({
      next: (res) => {
        this.patients.set(res.data || res);
        if (this.consultationId) {
          this.loadConsultation();
        }
      },
      error: (err) => console.error('Failed to load patients', err)
    });
  }

  loadConsultation(): void {
    this.consultationService.getById(this.consultationId!).subscribe({
      next: (res) => {
        const patient = this.patients().find(
          p => p._id === res.data.patientId
        );
        this.form.patchValue({
          ...res.data,
          patientName: patient?.name ?? '',
          symptoms: Array.isArray(res.data.symptoms)
            ? res.data.symptoms.join(', ')
            : res.data.symptoms ?? '',
          followUpDate: res.data.followUpDate
            ? new Date(res.data.followUpDate)
            : null
        });
      },
      error: (err) => console.error('Failed to load consultation', err)
    });
  }

  onPatientSelected(patient: any): void {
    this.form.patchValue({
      patientId: patient._id,
      patientName: patient.name
    });
  }

  onPatientInputChange(): void {
    this.form.patchValue({ patientId: '' });
  }

  onSubmit(): void {
    if (this.form.invalid) return;
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
        : undefined
    };

    const request$ = this.isEditMode
      ? this.consultationService.update(this.consultationId!, formValue)
      : this.consultationService.create(formValue);

    request$.subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigateByUrl('/consultations');
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }
}
