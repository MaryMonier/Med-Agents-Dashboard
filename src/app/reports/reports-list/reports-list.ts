import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-reports-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reports-list.html',
  styleUrl: './reports-list.css',
})
export class ReportsList implements OnInit {
  consultations = signal<any[]>([]);
  selectedConsultationId = signal('');
  report = signal<any>(null);
  isLoading = signal(false);
  isGenerating = signal(false);
  language = signal('en');

  private apiUrl = 'http://localhost:5000/api';

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadConsultations();
  }

  loadConsultations() {
    this.isLoading.set(true);
    this.http.get<any>(`${this.apiUrl}/consultations`).subscribe({
      next: (res) => {
        this.consultations.set(res.data || []);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  generateReport() {
    if (!this.selectedConsultationId()) return;

    this.isGenerating.set(true);
    this.report.set(null);

    this.http.post<any>(`${this.apiUrl}/report/generate`, {
      consultationId: this.selectedConsultationId(),
      language: this.language()
    }).subscribe({
      next: (res) => {
        this.report.set(res.data);
        this.isGenerating.set(false);
      },
      error: () => this.isGenerating.set(false)
    });
  }

  downloadReport() {
    const r = this.report();
    if (!r) return;

    const isAr = this.language() === 'ar';
    const content = isAr
      ? [
          'ميد أيجنتس — تقرير طبي',
          `تاريخ الإنشاء: ${new Date().toLocaleString('ar-EG')}`,
          '─'.repeat(50),
          `العنوان: ${r.reportTitle ?? '—'}`,
          `حالة المريض: ${r.patientCondition ?? '—'}`,
          `النتائج السريرية: ${r.clinicalFindings ?? '—'}`,
          `خطة العلاج: ${r.treatmentPlan ?? '—'}`,
          `التوصيات: ${r.recommendations ?? '—'}`,
          `ملاحظات المتابعة: ${r.followupNotes ?? '—'}`,
        ].join('\n')
      : [
          'MED AGENTS — MEDICAL REPORT',
          `Generated: ${new Date().toLocaleString()}`,
          '─'.repeat(50),
          `Title: ${r.reportTitle ?? '—'}`,
          `Patient Condition: ${r.patientCondition ?? '—'}`,
          `Clinical Findings: ${r.clinicalFindings ?? '—'}`,
          `Treatment Plan: ${r.treatmentPlan ?? '—'}`,
          `Recommendations: ${r.recommendations ?? '—'}`,
          `Follow-up Notes: ${r.followupNotes ?? '—'}`,
        ].join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `med-report-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }
}