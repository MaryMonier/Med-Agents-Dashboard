import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { ConsultationService } from '../../services/consultation';
import { FollowupService } from '../../services/followup';
import {
  ClinicalInsightsCardComponent,
  AiRecommendationResult,
} from '../clinical-insights-card/clinical-insights-card';

/**
 * NewConsultationModal — shared standalone component matching the React
 * ConsultationForm's flow exactly: doctor notes → symptoms → Get AI
 * Recommendation → review diagnosis (+ chronic checkbox) → Save Record.
 * On save, emits the created consultation so the parent can immediately
 * open the PrescriptionModal, same as React.
 *
 * Used from the patient-visit page for three flows:
 * - Plain "New Consultation" (no extra input) → creates a new consultation.
 * - "Complete Follow-up" (followupId set, existingConsultation null) →
 *   creates a new consultation linked to that follow-up.
 * - "Edit" (existingConsultation set) → prefills the form from the existing
 *   consultation and PATCHes it in place instead of creating a new one.
 *   If followupId is also set in this case, the follow-up's instructions
 *   get synced with the freshly-edited note on save.
 */
@Component({
  selector: 'app-new-consultation-modal',
  imports: [CommonModule, FormsModule, ClinicalInsightsCardComponent],
  templateUrl: './new-consultation-modal.html',
  styleUrl: './new-consultation-modal.css',
})
export class NewConsultationModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() patientId: string | null = null;
  @Input() patientName = '';
  @Input() followupId: string | null = null; // لو موجودة، يبقى ده "Complete Follow-up"
  @Input() followupInstructions = '';
  // ملخص الكونسلتيشن الأصلية اللي جدولت الفولو أب دي (أعراض/تشخيص/ملاحظات)
  @Input() followupConsultationSummary: {
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
  } | null = null;
  @Input() existingConsultation: any = null; // لو موجودة، يبقى ده "Edit" مش "Create"

  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<{ consultationId: string; patientId: string }>();

  rawInput = signal('');
  symptoms = signal('');
  diagnosis = signal('');
  language = signal<'en' | 'ar'>('en');
  isChronic = signal(false);
  followUpDate = signal('');

  isGeneratingAi = signal(false);
  aiResult = signal<AiRecommendationResult | null>(null);
  isSaved = signal(false); // لازم يدوس Get AI Recommendation الأول
  isSaving = signal(false);

  // لو الدكتور حفظ (Create) وهو لسه في نفس الصفحة، وبعدين عدّل حاجة وحفظ
  // تاني، مش عايزينه يعمل كونسلتيشن تانية مكررة — بنسجل الـ id بتاعة
  // الكونسلتيشن اللي اتعملت وبنحوّل أي حفظ بعد كده لـ "تعديل" تلقائيًا،
  // من غير ما نلمس existingConsultation (عشان منعملش resetForm ونمسح اللي
  // الدكتور كاتبه دلوقتي)
  private createdConsultationId = signal<string | null>(null);

  get isEditMode(): boolean {
    return !!this.existingConsultation || !!this.createdConsultationId();
  }

  private get currentConsultationId(): string | null {
    return this.existingConsultation?._id || this.createdConsultationId();
  }

  constructor(
    private consultationService: ConsultationService,
    private followupService: FollowupService,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['isOpen'] && this.isOpen) || changes['existingConsultation']) {
      this.resetForm();
    }
  }

  private resetForm(): void {
    const c = this.existingConsultation;

    if (c) {
      // وضع التعديل: نملى الفورم بالبيانات الموجودة بالفعل
      this.rawInput.set(c.rawInput || '');
      this.symptoms.set((c.symptoms || []).join(', '));
      this.diagnosis.set(c.diagnosis || '');
      this.language.set(c.language || 'en');
      this.isChronic.set(!!c.isChronic);
      this.followUpDate.set(this.toDateInputValue(c.followUpDate));
      this.aiResult.set({
        structuredNote: c.structuredNote,
        suggestedSpecialist: c.suggestedSpecialist,
        urgencyLevel: c.urgencyLevel,
      });
      this.isSaved.set(true);
    } else {
      this.rawInput.set('');
      this.symptoms.set('');
      this.diagnosis.set('');
      this.language.set('en');
      this.isChronic.set(false);
      this.followUpDate.set('');
      this.aiResult.set(null);
      this.isSaved.set(false);
      this.createdConsultationId.set(null);
    }
  }

  private toDateInputValue(value?: string): string {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  }

  onFieldChanged(): void {
    // أي تعديل في الملاحظات أو الأعراض بعد الحصول على رأي الـ AI (سواء
    // اتجاب من زرار Get AI Recommendation أو كان متعبّي من كونسلتيشن موجودة
    // في وضع التعديل) يبطّله فعليًا — بنمسحه خالص بدل ما نسيبه قاعد بصمت،
    // عشان مايتحفظش تشخيص/ملخص AI قديم بيخص نص مختلف عن اللي اتعدل دلوقتي.
    // الحفظ برضو مش هيتمنع لو مالحقتش تدوس الزرار تاني — هيرجع للنص اللي
    // كتبته كـ fallback (زي ما هو متفق عليه)، بس مش هيفضل فيه رأي AI مضلل
    if (this.aiResult()) {
      this.aiResult.set(null);
    }
    this.isSaved.set(false);
  }

  getAiRecommendation(): void {
    if (!this.rawInput().trim() || this.rawInput().trim().length < 10 || !this.symptoms().trim()) {
      Swal.fire(
        'Missing data',
        'Please fill in the doctor notes (at least 10 characters) and symptoms first.',
        'warning',
      );
      return;
    }

    this.isGeneratingAi.set(true);

    const payload: any = {
      rawInput: this.rawInput().trim(),
      diagnosis: this.diagnosis().trim(),
      language: this.language(),
      symptoms: this.symptoms()
        .split(',')
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0),
    };

    // لو ده Complete Follow-up، ابعت بيانات الزيارة السابقة (موجودة أصلاً في
    // followupConsultationSummary) عشان الإيجنت يقارن ويقول هل المريض اتحسن
    if (this.followupId && this.followupConsultationSummary) {
      payload.visitType = 'followup';
      payload.previousDiagnosis = this.followupConsultationSummary.diagnosis || '';
      payload.previousSymptoms = (this.followupConsultationSummary.symptoms || []).join(', ');
      payload.previousInstructions = this.followupConsultationSummary.rawInput || '';
      payload.previousPrescription = (this.followupConsultationSummary.previousPrescription || [])
        .map((m) => {
          const dose = m.dosageAmount && m.dosageUnit ? `${m.dosageAmount}${m.dosageUnit}` : '';
          const freq =
            m.frequencyCount && m.frequencyPeriod
              ? `${m.frequencyCount}x ${m.frequencyPeriod}`
              : '';
          return [m.name, dose, freq].filter(Boolean).join(' ');
        })
        .join(', ');
    }

    // أول كول ممكن يفشل لظروف بيئة عابرة، فبنعمل كذا محاولة هادية تلقائية
    // قبل ما نضايق الدكتور بإيرور (بدل ما هو يدوس الزرار يدوي كذا مرة)
    const MAX_ATTEMPTS = 3;
    const attempt = (attemptNumber: number) => {
      this.consultationService.getAIRecommendation(payload).subscribe({
        next: (res: { data: any }) => {
          this.isGeneratingAi.set(false);
          this.aiResult.set(res.data);
          this.isSaved.set(true);
        },
        error: (err: any) => {
          // لو السبب rate limit (429)، إعادة المحاولة خلال ثواني مش هتنفع —
          // بنوقف على طول ونوري رسالة واضحة بدل ما نضايق بمحاولات فاشلة
          const isRateLimit = err?.status === 429 || err?.error?.isRateLimit;
          if (!isRateLimit && attemptNumber < MAX_ATTEMPTS) {
            setTimeout(() => attempt(attemptNumber + 1), 1000 * attemptNumber);
          } else {
            this.isGeneratingAi.set(false);
            Swal.fire(
              isRateLimit ? 'AI Assistant Limit Reached' : 'Error',
              isRateLimit
                ? "You've reached your plan's daily limit for AI-powered recommendations. Please upgrade your subscription to continue using this feature."
                : 'Failed to get AI recommendation',
              'error',
            );
          }
        },
      });
    };

    attempt(1);
  }

  saveRecord(): void {
    if (!this.rawInput().trim()) {
      Swal.fire('Missing data', "Please fill in the doctor's notes before saving.", 'warning');
      return;
    }

    if (!this.patientId) {
      Swal.fire('Error', 'Missing patient.', 'error');
      return;
    }

    this.isSaving.set(true);

    const symptomsArray = this.symptoms()
      .split(',')
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0);

    const ai = this.aiResult();

    if (this.isEditMode) {
      // ─── تعديل كونسلتيشن موجودة (أو كونسلتيشن اتعملت لسه في نفس الجلسة) ──
      const consultationId = this.currentConsultationId!;
      const payload: any = {
        rawInput: this.rawInput().trim(),
        diagnosis: this.diagnosis().trim(),
        language: this.language(),
        isChronic: this.isChronic(),
        symptoms: symptomsArray,
        structuredNote: ai?.structuredNote,
        suggestedSpecialist: ai?.suggestedSpecialist,
        urgencyLevel: ai?.urgencyLevel,
      };
      // بنبعت followUpDate دايمًا هنا حتى لو فاضية — عشان الباك يقدر يفرّق
      // بين "الدكتور مسح التاريخ عن قصد" و"الحقل ده أصلاً مش جزء من التعديل"
      payload.followUpDate = this.followUpDate() || '';

      this.consultationService.update(consultationId, payload).subscribe({
        next: () => {
          this.isSaving.set(false);

          // لو التعديل ده لزيارة إكمال فولو أب، حدّث instructions الفولو أب
          // كمان عشان تفضل متزامنة مع أحدث ملاحظة
          if (this.followupId) {
            this.followupService
              .updateInstructions(this.followupId, ai?.structuredNote || this.rawInput().trim())
              .subscribe();
          }

          Swal.fire({
            title: 'Updated Successfully',
            text: this.isChronic()
              ? 'Consultation updated and diagnosis added to patient chronic diseases history.'
              : 'Consultation record updated successfully.',
            icon: 'success',
            timer: 1800,
            showConfirmButton: false,
          });

          this.saved.emit({ consultationId, patientId: this.patientId! });
        },
        error: (err: any) => {
          this.isSaving.set(false);
          Swal.fire('Error', err?.error?.message || 'Failed to update consultation', 'error');
        },
      });
      return;
    }

    // ─── إنشاء كونسلتيشن جديدة (عادية أو إكمال فولو أب) ─────────────────────
    const payload: any = {
      patientId: this.patientId,
      rawInput: this.rawInput().trim(),
      diagnosis: this.diagnosis().trim(),
      language: this.language(),
      isChronic: this.isChronic(),
      symptoms: symptomsArray,
      // القيم دي اتجابت من خطوة Get AI Recommendation قبل كده، فبنبعتها مع
      // الحفظ عشان الباك مايحتاجش يعمل نداء AI تاني وقت الحفظ نفسه (يعني
      // الحفظ بيشتغل عادي حتى لو مفيش توكينز أصلاً وقت الضغط على الزرار)
      structuredNote: ai?.structuredNote,
      suggestedSpecialist: ai?.suggestedSpecialist,
      urgencyLevel: ai?.urgencyLevel,
    };

    if (this.followUpDate()) {
      payload.followUpDate = this.followUpDate();
    }
    if (this.followupId) {
      payload.followupId = this.followupId;
    }

    this.consultationService.create(payload).subscribe({
      next: (res: any) => {
        this.isSaving.set(false);
        const newConsultationId = res?.data?._id;
        // أي حفظ تاني بعد كده في نفس الجلسة يبقى تعديل على الكونسلتيشن دي،
        // مش إنشاء واحدة تانية مكررة
        this.createdConsultationId.set(newConsultationId);

        Swal.fire({
          title: this.followupId ? 'Follow-up Completed' : 'Saved Successfully',
          text: this.isChronic()
            ? 'Consultation saved and diagnosis added to patient chronic diseases history.'
            : this.followupId
              ? 'Follow-up completed and consultation record saved. Now add the prescription.'
              : 'Consultation record saved successfully.',
          icon: 'success',
          timer: 1800,
          showConfirmButton: false,
        });

        this.saved.emit({ consultationId: newConsultationId, patientId: this.patientId! });
      },
      error: (err: any) => {
        this.isSaving.set(false);
        Swal.fire('Error', err?.error?.message || 'Failed to save consultation', 'error');
      },
    });
  }

  close(): void {
    this.closed.emit();
  }
}
