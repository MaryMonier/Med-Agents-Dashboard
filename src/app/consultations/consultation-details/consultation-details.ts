import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ConsultationService } from '../../services/consultation';
import { PrescriptionService, Medication } from '../../services/prescription';

@Component({
  selector: 'app-consultation-details',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './consultation-details.html',
  styleUrl: './consultation-details.css',
})
export class ConsultationDetails implements OnInit {
  consultationId = signal('');
  consultation = signal<any>(null);
  medications = signal<Medication[]>([]);

  isLoading = signal(false);
  errorMessage = signal('');

  patientName = computed(() => {
    const p = this.consultation()?.patientId;
    if (!p) return '—';
    return typeof p === 'object' ? p.name || '—' : p;
  });

  doctorName = computed(() => {
    const d = this.consultation()?.doctorId;
    if (!d) return '—';
    return typeof d === 'object' ? d.name || '—' : d;
  });

  symptoms = computed(() => {
    const list = this.consultation()?.symptoms;
    return Array.isArray(list) && list.length ? list.join(', ') : '—';
  });

  diagnosis = computed(() => this.consultation()?.diagnosis || '—');
  urgencyLevel = computed(() => this.consultation()?.urgencyLevel || 'low');
  suggestedSpecialist = computed(() => this.consultation()?.suggestedSpecialist || null);
  structuredNote = computed(() => this.consultation()?.structuredNote || null);
  followUpDate = computed(() => this.consultation()?.followUpDate || null);
  status = computed(() => this.consultation()?.status || 'pending');
  rawInput = computed(() => this.consultation()?.rawInput || '—');

  constructor(
    private consultationService: ConsultationService,
    private prescriptionService: PrescriptionService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.params['id'];
    this.consultationId.set(id);
    this.loadConsultation();
  }

  loadConsultation(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.consultationService.getById(this.consultationId()).subscribe({
      next: (res: any) => {
        this.consultation.set(res?.data || null);
        this.isLoading.set(false);

        const consultationId = res?.data?._id;
        if (consultationId) {
          this.loadPrescription(consultationId);
        }
      },
      error: () => {
        this.errorMessage.set('Failed to load consultation details');
        this.isLoading.set(false);
      },
    });
  }

  private loadPrescription(consultationId: string): void {
    this.prescriptionService.getPrescriptionByConsultation(consultationId).subscribe({
      next: (res: any) => {
        this.medications.set(res?.data?.medications || []);
      },
      error: () => {
        this.medications.set([]);
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/dashboard/consultations']);
  }

  editConsultation(): void {
    const cId = this.consultationId();
    const p = this.consultation()?.patientId;
    const patientId = typeof p === 'object' ? p?._id : p;
    if (!patientId) return;

    this.router.navigate(['/dashboard/patients/visit', patientId], {
      queryParams: { editConsultationId: cId },
    });
  }
}
