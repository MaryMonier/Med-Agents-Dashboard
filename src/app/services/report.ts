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

@Injectable({
  providedIn: 'root',
})
export class ReportService {

  private apiUrl = 'http://localhost:5000/api/report';

  constructor(private http: HttpClient) {}

  generate(
    consultationId: string,
    language: string = 'en'
  ): Observable<any> {
    return this.http.post(`${this.apiUrl}/generate`, {
      consultationId,
      language,
    });
  }

  downloadAsText(data: ReportData, filename: string): void {
    const content = JSON.stringify(data, null, 2);

    const blob = new Blob([content], {
      type: 'text/plain',
    });

    const url = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();

    window.URL.revokeObjectURL(url);
  }
}
