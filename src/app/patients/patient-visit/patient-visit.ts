import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { PatientService, IPatientHistory } from '../../services/patient';
import { PrescriptionService } from '../../services/prescription';
import { FollowupService } from '../../services/followup';
import { NewConsultationModalComponent } from '../../shared/new-consultation-modal/new-consultation-modal';
import { PrescriptionModalComponent } from '../../shared/prescription-modal/prescription-modal';
import Swal from 'sweetalert2';

/**
 * PatientVisit — صفحة كاملة (مش بوب أب) بتستضيف خطوتين كـ "ديفات" فوق بعض:
 * 1) ديف الكونسلتيشن (الأعراض/التشخيص + Get AI Recommendation)
 * 2) ديف الروشتة، بيظهر تحت الأول أول ما الكونسلتيشن تتحفظ
 *
 * بتتفتح من 3 أماكن:
 * - "New Consultation" في صفحة الـ patient-history (من غير query params)
 * - "Start Follow-up" في صفحة الفولو أبس (?followupId=)
 * - "Edit"/"Add Prescription" في صفحة الـ prescriptions list (?consultationId=&prescriptionId=)
 */
@Component({
  selector: 'app-patient-visit',
  standalone: true,
  imports: [CommonModule, NewConsultationModalComponent, PrescriptionModalComponent],
  templateUrl: './patient-visit.html',
  styleUrl: './patient-visit.css',
})
export class PatientVisit implements OnInit {
  patientId = signal('');
  data = signal<IPatientHistory | null>(null);
  isLoading = signal(false);
  errorMessage = signal('');

  followupId = signal<string | null>(null);
  followupInstructions = signal('');

  // بيبان ديف الكونسلتيشن غير لو الدكتور جاي يعدل/يضيف روشتة لكونسلتيشن موجودة بالفعل
  showConsultationSection = signal(true);
  showPrescriptionSection = signal(false);

  activeConsultationId = signal('');
  existingPrescription = signal<any>(null);

  patientName = computed(() => this.data()?.patient?.name || '');

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

  pageTitle = computed(() => {
    if (this.followupId()) return 'Complete Follow-up';
    if (!this.showConsultationSection()) return this.existingPrescription() ? 'Edit Prescription' : 'Add Prescription';
    return 'New Consultation';
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
    this.loadPatient();

    const params = this.route.snapshot.queryParamMap;
    const followupId = params.get('followupId') || '';
    const prescriptionId = params.get('prescriptionId') || '';
    const consultationId = params.get('consultationId') || '';

    if (followupId) {
      this.followupId.set(followupId);
      this.followupService.getFollowupById(followupId).subscribe({
        next: (res: any) => this.followupInstructions.set(res?.data?.instructions || ''),
        error: () => this.followupInstructions.set(''),
      });
    }

    if (prescriptionId) {
      // تعديل روشتة موجودة لكونسلتيشن موجودة → مفيش داعي لديف الكونسلتيشن خالص
      this.showConsultationSection.set(false);
      this.loadPrescriptionForEdit(prescriptionId);
    } else if (consultationId) {
      // إضافة روشتة لكونسلتيشن موجودة من غير روشتة سابقة
      this.showConsultationSection.set(false);
      this.activeConsultationId.set(consultationId);
      this.showPrescriptionSection.set(true);
    }
  }

  private loadPatient(): void {
    this.isLoading.set(true);
    this.patientService.getHistory(this.patientId()).subscribe({
      next: (res: any) => {
        this.data.set(res.data);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Failed to load patient data');
        this.isLoading.set(false);
      },
    });
  }

  private loadPrescriptionForEdit(prescriptionId: string): void {
    this.prescriptionService.getPrescriptionById(prescriptionId).subscribe({
      next: (res: any) => {
        const prescription = res?.data;
        if (!prescription) return;
        this.existingPrescription.set(prescription);
        this.activeConsultationId.set(
          typeof prescription.consultationId === 'object'
            ? prescription.consultationId?._id
            : prescription.consultationId,
        );
        this.showPrescriptionSection.set(true);
      },
      error: () => {
        Swal.fire('Error', 'Failed to load prescription for editing', 'error');
      },
    });
  }

  // لما الدكتور يحفظ ديف الكونسلتيشن، ديف الروشتة يظهر تحته على طول (من غير
  // ما نخفي ديف الكونسلتيشن، الاتنين فاضلين على الصفحة زي ما طلب)
  onConsultationSaved(event: { consultationId: string; patientId: string }): void {
    this.activeConsultationId.set(event.consultationId);
    this.existingPrescription.set(null);
    this.showPrescriptionSection.set(true);
  }

  onPrescriptionSaved(): void {
    // دايمًا نرجع لصفحة الـ patient-history بعد الحفظ (سواء كونسلتيشن عادية
    // أو إكمال فولو أب) — مش لصفحة الفولو أبس الرئيسية
    this.router.navigate(['/dashboard/patients/history', this.patientId()]);
  }

  goBack(): void {
    this.router.navigate(['/dashboard/patients/history', this.patientId()]);
  }
}
