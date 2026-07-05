import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-doctors-form',
  imports: [CommonModule, FormsModule],
  templateUrl: './doctors-form.html',
  styleUrl: './doctors-form.css',
})
export class DoctorsForm implements OnInit {
  isEditMode = signal(false);
  doctorId = signal('');
  isLoading = signal(false);
  errorMessage = signal('');

  doctor = signal<any>({
    name: '',
    email: '',
    password: '',
    specialty: 'Internal Medicine',
    language: 'en'
  });

  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.params['id'];
    if (id) {
      this.doctorId.set(id);
      this.isEditMode.set(true);
      this.loadDoctor();
    }
  }

  loadDoctor() {
    this.isLoading.set(true);
    this.http.get<any>(`${this.apiUrl}/auth/doctors/${this.doctorId()}`).subscribe({
      next: (res) => {
        this.doctor.set(res.data);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Failed to load doctor');
        this.isLoading.set(false);
      }
    });
  }

  updateField(field: string, value: any) {
    this.doctor.update(d => ({ ...d, [field]: value }));
  }

  onSubmit() {
    this.isLoading.set(true);
    this.errorMessage.set('');

    if (this.isEditMode()) {
      this.http.put(`${this.apiUrl}/auth/doctors/${this.doctorId()}`, this.doctor()).subscribe({
        next: () => this.router.navigate(['/dashboard/doctors']),
        error: () => {
          this.errorMessage.set('Failed to update doctor');
          this.isLoading.set(false);
        }
      });
    } else {
      this.http.post(`${this.apiUrl}/auth/register`, this.doctor()).subscribe({
        next: () => this.router.navigate(['/dashboard/doctors']),
        error: (err) => {
          this.errorMessage.set(err.error?.message || 'Failed to add doctor');
          this.isLoading.set(false);
        }
      });
    }
  }

  goBack() {
    this.router.navigate(['/dashboard/doctors']);
  }
}