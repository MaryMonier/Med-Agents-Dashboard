import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { ConsultationService } from '../../services/consultation';

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
    MatProgressSpinnerModule,
    MatIconModule
  ],
  templateUrl: './consultation-form.html',
  styleUrl:'./consultation-form.css'
})
export class ConsultationFormComponent implements OnInit {

  form!: FormGroup;
  isEditMode = false;
  consultationId = '';
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private consultationService: ConsultationService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.consultationId = this.route.snapshot.params['id'];
    if (this.consultationId) {
      this.isEditMode = true;
      this.loadConsultation();
    }
  }

  initForm(): void {
    this.form = this.fb.group({
      patientId: ['', Validators.required],
      rawInput:  ['', [Validators.required, Validators.minLength(10)]],
      symptoms:  ['', Validators.required],
      diagnosis: [''],
      language:  ['en', Validators.required]
    });
  }

  loadConsultation(): void {
    this.consultationService.getById(this.consultationId).subscribe({
      next: (res) => {
        this.form.patchValue({
          ...res.data,
          symptoms: res.data.symptoms.join(', ')
        });
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.isLoading = true;

    const formValue = {
      ...this.form.value,
      symptoms: this.form.value.symptoms.split(',').map((s: string) => s.trim())
    };

    const request$ = this.isEditMode
      ? this.consultationService.update(this.consultationId, formValue)
      : this.consultationService.create(formValue);

    request$.subscribe({
      next: () => this.router.navigate(['/consultations']),
      error: () => { this.isLoading = false; }
    });
  }
}
