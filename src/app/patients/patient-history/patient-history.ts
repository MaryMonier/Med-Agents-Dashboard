import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PatientService, IPatientHistory } from '../../services/patient';
import { PrescriptionService } from '../../services/prescription';
import { FollowupService } from '../../services/followup';
import { NewConsultationModalComponent } from '../../shared/new-consultation-modal/new-consultation-modal';
import { PrescriptionModalComponent } from '../../shared/prescription-modal/prescription-modal';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-patient-history',
  standalone: true,
  imports: [CommonModule, FormsModule, NewConsultationModalComponent, PrescriptionModalComponent],
  templateUrl: './patient-history.html',
  styleUrl: './patient-history.css',
})
export class PatientHistory implements OnInit {
  patientId = signal('');
  data = signal<IPatientHistory | null>(null);
  isLoading = signal(false);
  errorMessage = signal('');

  // ─── "New Consultation" modal (also used to complete a follow-up) ───────
  showConsultationModal = signal(false);
  activeFollowupId = signal<string | null>(null);
  activeFollowupInstructions = signal('');

  // ─── Prescription modal ──────────────────────────────────────────────────
  showPrescriptionModal = signal(false);
  prescriptionConsultationId = signal('');
  existingPrescription = signal<any>(null);

  patientName = computed(() => this.data()?.patient?.name || '');

  // patient object shaped for PrescriptionModal ([patient] input expects
  // _id/name/allergies/dateOfBirth/gender)
  patientForModal = computed(() => {
    const p = this.data()?.patient;
    if (!p) return null;
    return {
      _id: this.patientId(),
      name: p.name,
      allergies: p.allergies || [],
      dateOfBirth: p.dateOfBirth,
      gender: p.gender,
    };
  });

  constructor(
    private patientService: PatientService,
    private prescriptionService: PrescriptionService,
    private followupService: FollowupService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.params['id'];
    this.patientId.set(id);
    this.loadHistory();

    this.route.queryParamMap.subscribe((params: any) => {
      const followupId = params.get('followupId') || '';
      const prescriptionId = params.get('prescriptionId') || '';
      const consultationId = params.get('consultationId') || '';

      // فتح فولو أب من الفولو أبس ليست → افتح مودال "Complete Follow-up" على طول
      if (followupId) {
        this.openCompleteFollowup(followupId);
      }

      // فتح روشتة معينة للتعديل من صفحة الـ prescriptions list
      if (prescriptionId) {
        this.openEditPrescription(prescriptionId);
      } else if (consultationId) {
        // فتح مودال إضافة روشتة لكونسلتيشن موجودة (من غير روشتة سابقة)
        this.openAddPrescription(consultationId);
      }
    });
  }

  loadHistory(): void {
    this.isLoading.set(true);
    this.patientService.getHistory(this.patientId()).subscribe({
      next: (res: any) => {
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

  // ─── "New Consultation" button ───────────────────────────────────────────
  openNewConsultation(): void {
    this.activeFollowupId.set(null);
    this.activeFollowupInstructions.set('');
    this.showConsultationModal.set(true);
  }

  private openCompleteFollowup(followupId: string): void {
    this.activeFollowupId.set(followupId);
    this.followupService.getFollowupById(followupId).subscribe({
      next: (res: any) => {
        this.activeFollowupInstructions.set(res?.data?.instructions || '');
      },
      error: () => {
        this.activeFollowupInstructions.set('');
      },
    });
    this.showConsultationModal.set(true);
  }

  closeConsultationModal(): void {
    this.showConsultationModal.set(false);
    this.clearQueryParams();
  }

  // لما الدكتور يحفظ الكونسلتيشن (جديدة أو إكمال فولو أب)، نقفل المودال ده
  // ونفتح مودال إضافة الروشتة على طول، زي ما بيحصل في الرياكت
  onConsultationSaved(event: { consultationId: string; patientId: string }): void {
    this.showConsultationModal.set(false);
    this.activeFollowupId.set(null);
    this.activeFollowupInstructions.set('');
    this.loadHistory();

    this.existingPrescription.set(null);
    this.prescriptionConsultationId.set(event.consultationId);
    this.showPrescriptionModal.set(true);
  }

  // ─── Prescription modal triggers ─────────────────────────────────────────
  private openAddPrescription(consultationId: string): void {
    this.existingPrescription.set(null);
    this.prescriptionConsultationId.set(consultationId);
    this.showPrescriptionModal.set(true);
  }

  private openEditPrescription(prescriptionId: string): void {
    this.prescriptionService.getPrescriptionById(prescriptionId).subscribe({
      next: (res: any) => {
        const prescription = res?.data;
        if (!prescription) return;
        this.existingPrescription.set(prescription);
        this.prescriptionConsultationId.set(
          typeof prescription.consultationId === 'object'
            ? prescription.consultationId?._id
            : prescription.consultationId,
        );
        this.showPrescriptionModal.set(true);
      },
      error: () => {
        Swal.fire('Error', 'Failed to load prescription for editing', 'error');
      },
    });
  }

  // الدكتور يدوس "Edit" على روشتة موجودة جوه الهيستوري نفسه
  editPrescriptionFromHistory(item: any): void {
    if (!item.prescription) return;
    this.openEditPrescription(item.prescription._id);
  }

  closePrescriptionModal(): void {
    this.showPrescriptionModal.set(false);
    this.existingPrescription.set(null);
    this.clearQueryParams();
  }

  onPrescriptionSaved(): void {
    this.showPrescriptionModal.set(false);
    this.existingPrescription.set(null);
    this.clearQueryParams();
    this.loadHistory();
  }

  private clearQueryParams(): void {
    this.router.navigate([], { relativeTo: this.route, queryParams: {} });
  }
}
