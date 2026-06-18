
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, map } from 'rxjs';

export type ChartPeriod = 'week' | 'month' | 'quarter';

export interface DashboardStats {
  totalPatients: number;
  totalConsultations: number;
  activeFollowups: number;
  drugWarningsCount: number;
}

export interface PatientSummary {
  _id: string;
  name: string;
  gender: string;
  createdAt: string;
  chronicConditions: string[];
  allergies: string[];
}

export interface ConsultationSummary {
  _id: string;
  patientId: PatientSummary | null;
  urgencyLevel: 'low' | 'medium' | 'critical';
  status: 'pending' | 'completed';
  diagnosis: string;
  createdAt: string;
  language: 'en' | 'ar';   // ← التعديل الوحيد هنا
}

export interface ChartDataPoint {
  label: string;
  consultations: number;
  followups: number;
}

export interface DashboardChartResponse {
  success: boolean;
  period: ChartPeriod;
  data: ChartDataPoint[];
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly base = 'http://localhost:5000/api';

  constructor(private http: HttpClient) {}

  getStats(): Observable<DashboardStats> {
    return forkJoin({
      patients:      this.http.get<{ success: boolean; data: PatientSummary[] }>(`${this.base}/patients`),
      consultations: this.http.get<{ success: boolean; count: number; data: ConsultationSummary[] }>(`${this.base}/consultations`),
      followups:     this.http.get<{ success: boolean; count: number; data: any[] }>(`${this.base}/followups`),
    }).pipe(
      map(({ patients, consultations, followups }) => {
        const activeFollowups   = followups.data?.filter((f: any) => f.status === 'pending').length ?? 0;
        const drugWarningsCount = consultations.data?.filter(
          (c: ConsultationSummary) => c.urgencyLevel === 'critical'
        ).length ?? 0;
        return {
          totalPatients:      patients.data?.length ?? 0,
          totalConsultations: consultations.count ?? consultations.data?.length ?? 0,
          activeFollowups,
          drugWarningsCount,
        };
      })
    );
  }

  getRecentConsultations(limit = 6): Observable<ConsultationSummary[]> {
    return this.http
      .get<{ success: boolean; count: number; data: ConsultationSummary[] }>(`${this.base}/consultations`)
      .pipe(map(res => (res.data ?? []).slice(0, limit)));
  }

  getChartData(period: ChartPeriod): Observable<DashboardChartResponse> {
    const params = new HttpParams().set('period', period);
    return this.http.get<DashboardChartResponse>(`${this.base}/dashboard/analytics`, { params });
  }

  generateReport(consultationId: string, language = 'en'): Observable<any> {
    return this.http.post(`${this.base}/report/generate`, { consultationId, language });
  }

  getAllConsultationsForChart(): Observable<ConsultationSummary[]> {
    return this.http
      .get<{ success: boolean; data: ConsultationSummary[] }>(`${this.base}/consultations`)
      .pipe(map(res => res.data ?? []));
  }

  getAllFollowupsForChart(): Observable<any[]> {
    return this.http
      .get<{ success: boolean; data: any[] }>(`${this.base}/followups`)
      .pipe(map(res => res.data ?? []));
  }
}
