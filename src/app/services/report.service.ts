import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ReportData {
  reportTitle: string;
  patientCondition: string;
  clinicalFindings: string;
  treatmentPlan: string;
  recommendations: string;
  followupNotes: string;
}

export interface ReportResponse {
  success: boolean;
  data: ReportData;
}

@Injectable({ providedIn: 'root' })
export class ReportService {
  private readonly apiUrl = 'http://localhost:5000/api/report';

  constructor(private http: HttpClient) {}

  /**
   * Generates an AI medical report for a given consultation.
   * The backend calls the RAG-enabled reportGenAgent.
   */
  generate(consultationId: string, language = 'en'): Observable<ReportResponse> {
    return this.http.post<ReportResponse>(`${this.apiUrl}/generate`, {
      consultationId,
      language,
    });
  }

  /**
   * Client-side helper: converts a ReportData object to a
   * downloadable plain-text blob and triggers browser download.
   */
  downloadAsText(report: ReportData, filename = `med-report-${Date.now()}.txt`): void {
    const content = [
      `MED AGENTS — MEDICAL REPORT`,
      `Generated: ${new Date().toLocaleString()}`,
      `${'─'.repeat(60)}`,
      `Title:              ${report.reportTitle}`,
      `Patient Condition:  ${report.patientCondition}`,
      `Clinical Findings:  ${report.clinicalFindings}`,
      `Treatment Plan:     ${report.treatmentPlan}`,
      `Recommendations:    ${report.recommendations}`,
      `Follow-up Notes:    ${report.followupNotes}`,
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
