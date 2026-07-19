import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface GeneratedReportData {
  reportTitle: string;
  executiveSummary: string;
  patientCondition: string;
  clinicalFindings: string;
  treatmentPlan: string;
  recommendations: string;
  followupNotes: string;
}

export interface ReportMeta {
  patientId: string;
  scope: 'year' | 'month' | 'consultation';
  year: number | null;
  month: number | null;
  consultationId: string | null;
  consultationCount: number;
  scopeLabel: string;
  rangeLabel: string;
  generatedAt: string;
}

export interface GenerateReportResponse {
  success: boolean;
  empty?: boolean;
  message?: string;
  data: GeneratedReportData | null;
  meta: ReportMeta;
}

export interface GenerateReportPayload {
  patientId: string;
  scope: 'year' | 'month' | 'consultation';
  year?: number;
  month?: number;
  consultationId?: string;
  language?: 'en' | 'ar';
}

@Injectable({ providedIn: 'root' })
export class ReportService {
  private apiUrl = `${environment.apiUrl}/reports`;

  constructor(private http: HttpClient) {}

  generate(payload: GenerateReportPayload): Observable<GenerateReportResponse> {
    return this.http.post<GenerateReportResponse>(`${this.apiUrl}/generate`, payload);
  }
}
