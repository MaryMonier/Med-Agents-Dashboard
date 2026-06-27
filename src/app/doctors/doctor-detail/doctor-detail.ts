import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { PatientService, Patient } from '../../services/patient';

@Component({
  selector: 'app-doctor-detail',
  imports: [CommonModule],
  templateUrl: './doctor-detail.html',
  styleUrl: './doctor-detail.css',
})
export class DoctorDetail implements OnInit {
  doctor = signal<any>(null);
  patients = signal<Patient[]>([]);

  isLoading = signal(false);
  isLoadingPatients = signal(false);
  errorMessage = signal('');

  doctorId = signal('');

  totalPatients = computed(() => this.patients().length);

  private apiUrl = 'http://localhost:5000/api';

  constructor(
    private http: HttpClient,
    private patientService: PatientService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.params['id'];
    if (!id) {
      this.errorMessage.set('No doctor specified');
      return;
    }
    this.doctorId.set(id);
    this.loadDoctor();
    this.loadDoctorPatients();
  }

  loadDoctor(): void {
    this.isLoading.set(true);
    this.http.get<any>(`${this.apiUrl}/auth/doctors/${this.doctorId()}`).subscribe({
      next: (res) => {
        this.doctor.set(res.data);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Failed to load doctor');
        this.isLoading.set(false);
      },
    });
  }

  loadDoctorPatients(): void {
    this.isLoadingPatients.set(true);
    this.patientService.getByDoctorId(this.doctorId()).subscribe({
      next: (res) => {
        this.patients.set(res.data || []);
        this.isLoadingPatients.set(false);
      },
      error: () => {
        this.errorMessage.set('Failed to load patients for this doctor');
        this.isLoadingPatients.set(false);
      },
    });
  }

  calculateAge(dateOfBirth: string): number {
    if (!dateOfBirth) return 0;
    const today = new Date();
    const birth = new Date(dateOfBirth);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  }

  goToPatientHistory(patientId: string): void {
    this.router.navigate(['/dashboard/patients/history', patientId]);
  }

  goBack(): void {
    this.router.navigate(['/dashboard/doctors']);
  }
}