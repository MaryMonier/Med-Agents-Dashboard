import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { PatientService, IPatientHistory } from '../../services/patient';

@Component({
  selector: 'app-patient-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './patient-history.html',
  styleUrl: './patient-history.css',
})
export class PatientHistory implements OnInit {
  patientId = signal('');
  data = signal<IPatientHistory | null>(null);
  isLoading = signal(false);
  errorMessage = signal('');

  constructor(
    private patientService: PatientService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.params['id'];
    this.patientId.set(id);
    this.loadHistory();
  }

  loadHistory(): void {
    this.isLoading.set(true);
    this.patientService.getHistory(this.patientId()).subscribe({
      next: (res) => {
        console.log(res);

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

  goBack(): void {
    this.router.navigate(['/dashboard/patients']);
  }
}
