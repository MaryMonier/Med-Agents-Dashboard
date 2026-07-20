import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FollowupService } from '../../services/followup';
import { PrescriptionService, Medication } from '../../services/prescription';

@Component({
  selector: 'app-followup-details',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './followup-details.html',
  styleUrl: './followup-details.css',
})
export class FollowupDetails implements OnInit {
  followupId = signal('');
  followup = signal<any>(null);
  medications = signal<Medication[]>([]);

  isLoading = signal(false);
  errorMessage = signal('');

  patientName = computed(() => this.followup()?.patientId?.name || '—');
  private effectiveConsultation = computed(
    () => this.followup()?.completionConsultationId || this.followup()?.consultationId,
  );
  doctorName = computed(() => this.effectiveConsultation()?.doctorId?.name || '—');
  doctorNotes = computed(
    () => this.effectiveConsultation()?.rawInput || this.followup()?.instructions || '—',
  );
  symptoms = computed(() => {
    const list = this.effectiveConsultation()?.symptoms;
    return Array.isArray(list) && list.length ? list.join(', ') : '—';
  });
  diagnosis = computed(() => this.effectiveConsultation()?.diagnosis || '—');
  structuredNote = computed(() => this.effectiveConsultation()?.structuredNote || null);
  urgencyLevel = computed(() => this.effectiveConsultation()?.urgencyLevel || null);
  suggestedSpecialist = computed(() => this.effectiveConsultation()?.suggestedSpecialist || null);
  scheduledDate = computed(() => this.followup()?.scheduledDate || null);
  status = computed(() => this.followup()?.status || 'pending');

  constructor(
    private followupService: FollowupService,
    private prescriptionService: PrescriptionService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.params['id'];
    this.followupId.set(id);
    this.loadFollowup();
  }

  loadFollowup(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.followupService.getFollowupById(this.followupId()).subscribe({
      next: (res: any) => {
        this.followup.set(res?.data || null);
        this.isLoading.set(false);

        const consultationId =
          res?.data?.completionConsultationId?._id || res?.data?.consultationId?._id;
        if (consultationId) {
          this.loadPrescription(consultationId);
        }
      },
      error: () => {
        this.errorMessage.set('Failed to load follow-up details');
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
        // مفيش روشتة لزيارة الفولو أب دي، عادي
        this.medications.set([]);
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/dashboard/followups']);
  }

  editFollowup(): void {
    const patientId =
      typeof this.followup()?.patientId === 'object'
        ? this.followup()?.patientId?._id
        : this.followup()?.patientId;
    if (!patientId) return;
    this.router.navigate(['/dashboard/patients/visit', patientId], {
      queryParams: { followupId: this.followupId() },
    });
  }
}
