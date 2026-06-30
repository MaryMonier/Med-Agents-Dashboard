import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { ConsultationService } from '../../services/consultation';
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
 * Used as a popup from patient-history's "New Consultation" button, and
 * also covers the "complete this follow-up" case when a followupId is
 * passed in.
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

  constructor(private consultationService: ConsultationService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen) {
      this.resetForm();
    }
  }

  private resetForm(): void {
    this.rawInput.set('');
    this.symptoms.set('');
    this.diagnosis.set('');
    this.language.set('en');
    this.isChronic.set(false);
    this.followUpDate.set('');
    this.aiResult.set(null);
    this.isSaved.set(false);
  }

  onFieldChanged(): void {
    // أي تعديل بعد الحصول على رأي الـ AI يبطّله، عشان الدكتور يطلب رأي جديد قبل الحفظ
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

    const payload = {
      rawInput: this.rawInput().trim(),
      diagnosis: this.diagnosis().trim(),
      language: this.language(),
      symptoms: this.symptoms()
        .split(',')
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0),
    };

    const attempt = (isRetry: boolean) => {
      this.consultationService.getAIRecommendation(payload).subscribe({
        next: (res: { data: any }) => {
          this.isGeneratingAi.set(false);
          this.aiResult.set(res.data);
          this.isSaved.set(true);
        },
        error: () => {
          if (!isRetry) {
            setTimeout(() => attempt(true), 1200);
          } else {
            this.isGeneratingAi.set(false);
            Swal.fire('Error', 'Failed to get AI recommendation', 'error');
          }
        },
      });
    };

    attempt(false);
  }

  saveRecord(): void {
    if (!this.isSaved()) {
      Swal.fire(
        'AI Recommendation required',
        'Please get the AI recommendation before saving the record.',
        'warning',
      );
      return;
    }

    if (!this.patientId) {
      Swal.fire('Error', 'Missing patient.', 'error');
      return;
    }

    this.isSaving.set(true);

    const payload: any = {
      patientId: this.patientId,
      rawInput: this.rawInput().trim(),
      diagnosis: this.diagnosis().trim(),
      language: this.language(),
      isChronic: this.isChronic(),
      symptoms: this.symptoms()
        .split(',')
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0),
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

        Swal.fire({
          title: 'Saved Successfully',
          text: this.isChronic()
            ? 'Consultation saved and diagnosis added to patient chronic diseases history.'
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
