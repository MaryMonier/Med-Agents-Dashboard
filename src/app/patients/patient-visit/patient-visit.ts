import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { PatientService, IPatientHistory } from '../../services/patient';
import { PrescriptionService } from '../../services/prescription';
import { FollowupService } from '../../services/followup';
import { ConsultationService } from '../../services/consultation';
import { NewConsultationModalComponent } from '../../shared/new-consultation-modal/new-consultation-modal';
import { PrescriptionModalComponent } from '../../shared/prescription-modal/prescription-modal';
import Swal from 'sweetalert2';

/**
 * PatientVisit — صفحة كاملة (مش بوب أب) بتستضيف خطوتين كـ "ديفات" فوق بعض:
 * 1) ديف الكونسلتيشن (الأعراض/التشخيص + Get AI Recommendation)
 * 2) ديف الروشتة
 *
 * بتتفتح من عدة أماكن، على حسب query params:
 * - من غير باراميترز: "New Consultation" → إنشاء كونسلتيشن جديدة، وديف
 *   الروشتة بيظهر تحتها بعد الحفظ.
 * - ?followupId=X: "Start Follow-up" (لو الفولو أب لسه pending) → إنشاء
 *   كونسلتيشن إكمال جديدة مربوطة بالفولو أب دي. لو الفولو أب already
 *   confirmed (يعني اتكملت قبل كده)، بيتحول تلقائي لوضع "Edit" لزيارة
 *   الإكمال بتاعتها.
 * - ?editConsultationId=X: "Edit" لكونسلتيشن موجودة (من صفحة الكونسلتيشنز) →
 *   الديفين بيظهروا مباشرة معبيين بالبيانات الموجودة، والحفظ بيعدّل مكان ما ينشئ.
 * - ?consultationId=&prescriptionId=: تعديل/إضافة روشتة بس لكونسلتيشن
 *   موجودة (من صفحة الـ Prescriptions)، من غير لمس بيانات الكونسلتيشن نفسها.
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
  // ملخص الكونسلتيشن الأصلية اللي جدولت الفولو أب دي (أعراض/تشخيص/ملاحظات)
  // عشان الدكتور يشوف السياق وهو بيكمل الفولو أب
  followupConsultationSummary = signal<{
    rawInput?: string;
    symptoms?: string[];
    diagnosis?: string;
    previousPrescription?: {
      name: string;
      dosageAmount?: number;
      dosageUnit?: string;
      frequencyCount?: number;
      frequencyPeriod?: string;
      isChronic?: boolean;
    }[];
  } | null>(null);

  // وضع التعديل: لو معبية، الفورم بيتملى بيها والحفظ بيبقى Update مش Create
  existingConsultation = signal<any>(null);

  showConsultationSection = signal(true);
  showPrescriptionSection = signal(false);

  activeConsultationId = signal('');
  existingPrescription = signal<any>(null);
  // بيانات الكونسلتيشن الحالية اللي اتحفظت، عشان نبعتها لإيجنت اقتراح
  // الأدوية في مودال الروشتة (نفس الحاجة اللي React بتعملها)
  activeDiagnosis = signal('');
  activeSymptoms = signal<string[]>([]);
  activeRawInput = signal('');

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
    if (this.existingConsultation()) {
      return this.followupId() ? 'Edit Follow-up Visit' : 'Edit Consultation';
    }
    if (this.followupId()) return 'Complete Follow-up';
    if (!this.showConsultationSection()) {
      return this.existingPrescription() ? 'Edit Prescription' : 'Add Prescription';
    }
    return 'New Consultation';
  });

  constructor(
    private patientService: PatientService,
    private prescriptionService: PrescriptionService,
    private followupService: FollowupService,
    private consultationService: ConsultationService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.params['id'];
    this.patientId.set(id);
    this.loadPatient();

    const params = this.route.snapshot.queryParamMap;
    const followupId = params.get('followupId') || '';
    const editConsultationId = params.get('editConsultationId') || '';
    const prescriptionId = params.get('prescriptionId') || '';
    const consultationId = params.get('consultationId') || '';

    if (editConsultationId) {
      // ─── تعديل كونسلتيشن مباشرة (من صفحة الكونسلتيشنز) ────────────────
      this.loadConsultationForEdit(editConsultationId);
      return;
    }

    if (followupId) {
      this.followupId.set(followupId);
      this.followupService.getFollowupById(followupId).subscribe({
        next: (res: any) => {
          const f = res?.data;
          this.followupInstructions.set(f?.instructions || '');

          // الكونسلتيشن الأصلية اللي جدولت الفولو أب دي (السياق اللي محتاجه
          // الدكتور وهو بيكمل الزيارة)
          const originConsultation = f?.consultationId;
          if (originConsultation && typeof originConsultation === 'object') {
            this.followupConsultationSummary.set({
              rawInput: originConsultation.rawInput,
              symptoms: originConsultation.symptoms,
              diagnosis: originConsultation.diagnosis,
            });

            // كمان نجيب الروشتة اللي اتكتبت في الزيارة دي عشان إيجنت
            // التشخيص وإيجنت اقتراح الأدوية يقدروا يقارنوا بيها (تحسّن؟
            // نفس الحالة؟ محتاج جرعة أعلى أو دواء تاني؟)
            const originConsultationId = originConsultation._id;
            if (originConsultationId) {
              this.prescriptionService
                .getPrescriptionByConsultation(originConsultationId)
                .subscribe({
                  next: (presRes: any) => {
                    const meds = presRes?.data?.medications || [];
                    this.followupConsultationSummary.update((prev) => ({
                      ...(prev || {}),
                      previousPrescription: meds.map((m: any) => ({
                        name: m.name,
                        dosageAmount: m.dosageAmount,
                        dosageUnit: m.dosageUnit,
                        frequencyCount: m.frequencyCount,
                        frequencyPeriod: m.frequencyPeriod,
                        isChronic: m.isChronic,
                      })),
                    }));
                  },
                  error: () => {
                    // مفيش روشتة مسجلة للزيارة دي — طبيعي، منسيبش previousPrescription
                  },
                });
            }
          }

          const completionId =
            typeof f?.completionConsultationId === 'object'
              ? f?.completionConsultationId?._id
              : f?.completionConsultationId;

          if (f?.status === 'confirmed' && completionId) {
            // الفولو أب دي اتكملت قبل كده → وضع تعديل لزيارة الإكمال بتاعتها
            this.loadConsultationForEdit(completionId);
          }
        },
        error: () => this.followupInstructions.set(''),
      });
      return;
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
      this.consultationService.getById(consultationId).subscribe({
        next: (res: any) => {
          const c = res?.data;
          this.activeDiagnosis.set(c?.diagnosis || '');
          this.activeSymptoms.set(c?.symptoms || []);
          this.activeRawInput.set(c?.rawInput || '');
        },
        error: () => {},
      });
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

  // بيحمّل كونسلتيشن موجودة عشان تتعدل، ويحمّل الروشتة بتاعتها (لو موجودة)
  // جنبها في نفس الوقت — الاتنين بيظهروا فورًا معبيين بالبيانات
  private loadConsultationForEdit(consultationId: string): void {
    this.consultationService.getById(consultationId).subscribe({
      next: (res: any) => {
        const consultation = res?.data;
        if (!consultation) {
          this.errorMessage.set('Consultation not found');
          return;
        }
        this.existingConsultation.set(consultation);
        this.activeConsultationId.set(consultationId);
        this.activeDiagnosis.set(consultation?.diagnosis || '');
        this.activeSymptoms.set(consultation?.symptoms || []);
        this.activeRawInput.set(consultation?.rawInput || '');
        this.showConsultationSection.set(true);
        // ديف الروشتة مش بيتعرض فورًا هنا — بيفضل مستني لحد ما الدكتور
        // يدوس Save/Update على ديف الكونسلتيشن (نفس سلوك الإنشاء بالظبط)،
        // فبنحمّل بيانات الروشتة الموجودة في الخلفية بس من غير ما نعرض الديف
        this.prescriptionService.getPrescriptionByConsultation(consultationId).subscribe({
          next: (presRes: any) => this.existingPrescription.set(presRes?.data || null),
          error: () => this.existingPrescription.set(null),
        });
      },
      error: () => {
        this.errorMessage.set('Failed to load consultation for editing');
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
    this.showPrescriptionSection.set(true);

    this.consultationService.getById(event.consultationId).subscribe({
      next: (res: any) => {
        const c = res?.data;
        this.activeDiagnosis.set(c?.diagnosis || '');
        this.activeSymptoms.set(c?.symptoms || []);
        this.activeRawInput.set(c?.rawInput || '');
      },
      error: () => {
        // مش قاتل — زرار "اقترح أدوية" هيبقى معطّل لو مفيش diagnosis بس
      },
    });
  }

  onPrescriptionSaved(): void {
    // دايمًا نرجع لصفحة الـ patient-history بعد الحفظ (سواء كونسلتيشن عادية،
    // إكمال فولو أب، أو تعديل) — مش لصفحة الفولو أبس الرئيسية
    this.router.navigate(['/dashboard/patients/history', this.patientId()]);
  }

  goBack(): void {
    this.router.navigate(['/dashboard/patients/history', this.patientId()]);
  }
}
