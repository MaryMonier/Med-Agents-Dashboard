import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ConsultationService } from '../../services/consultation';
import { computed } from '@angular/core';

@Component({
  selector: 'app-consultation-form',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterModule,
    MatFormFieldModule, MatInputModule, MatButtonModule,
    MatSelectModule, MatProgressSpinnerModule, MatIconModule,
    MatAutocompleteModule
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
    this.initForm();
    this.loadPatients();

    this.consultationId = this.route.snapshot.params['id'] ?? null;

    if (this.consultationId) {
      this.isEditMode = true;
    }
  }

  initForm(): void {
    this.form = this.fb.group({
      patientId:   ['', Validators.required],
      patientName: ['', Validators.required],
      rawInput:    ['', [Validators.required, Validators.minLength(10)]],
      symptoms:    ['', Validators.required],
      diagnosis:   [''],
      language:    ['en', Validators.required]
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
            : res.data.symptoms ?? ''
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
        .filter((s: string) => s.length > 0)
    };

    const request$ = this.isEditMode
      ? this.consultationService.update(this.consultationId!, formValue)
      : this.consultationService.create(formValue);

    request$.subscribe({
     next: () => {
  this.isLoading.set(false);
 
  this.router.navigateByUrl('/consultations');
},
    });
  }
}
