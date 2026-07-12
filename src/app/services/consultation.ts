import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Consultations,
  CreateConsultationDto,
  ConsultationResponse,
} from '../models/consultations';

@Injectable({ providedIn: 'root' })
export class ConsultationService {
  private apiUrl = `${environment.apiUrl}/consultations`;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
  }

  getAll(search?: string): Observable<ConsultationResponse> {
    let params = new HttpParams();
    if (search) params = params.set('search', search);
    return this.http.get<ConsultationResponse>(`${this.apiUrl}/doctor`, {
      params,
      headers: this.getHeaders(),
    });
  }

  getById(id: string): Observable<{ success: boolean; data: Consultations }> {
    return this.http.get<{ success: boolean; data: Consultations }>(`${this.apiUrl}/${id}`, {
      headers: this.getHeaders(),
    });
  }
  getByDoctorId(doctorId: string): Observable<ConsultationResponse> {
    return this.http.get<ConsultationResponse>(`${this.apiUrl}/by-doctor/${doctorId}`, {
      headers: this.getHeaders(),
    });
  }

  getAIRecommendation(data: {
    rawInput: string;
    symptoms: string[];
    diagnosis?: string;
    language: string;
    visitType?: string;
    previousDiagnosis?: string;
    previousSymptoms?: string;
    previousInstructions?: string;
    previousPrescription?: string;
  }): Observable<{ success: boolean; data: any }> {
    return this.http.post<{ success: boolean; data: any }>(
      `${this.apiUrl}/ai-recommendation`,
      data,
      { headers: this.getHeaders() },
    );
  }

  // إيجنت اقتراح الأدوية — بيقرا التشخيص/الأعراض، ولو الزيارة دي فولو أب
  // بيبص كمان على الروشتة السابقة عشان يقرر يزود الجرعة/يغيّر الدواء/يسيبه
  getMedicationSuggestions(data: {
    diagnosis: string;
    symptoms: string[];
    rawInput: string;
    language: string;
    patientId: string;
    isFollowup?: boolean;
    previousPrescription?: {
      name: string;
      dosageAmount?: number;
      dosageUnit?: string;
      frequencyCount?: number;
      frequencyPeriod?: string;
      isChronic?: boolean;
    }[];
  }): Observable<{ success: boolean; data: any[] }> {
    return this.http.post<{ success: boolean; data: any[] }>(
      `${this.apiUrl}/medication-suggestions`,
      data,
      { headers: this.getHeaders() },
    );
  }

  create(data: CreateConsultationDto): Observable<{ success: boolean; data: Consultations }> {
    return this.http.post<{ success: boolean; data: Consultations }>(this.apiUrl, data, {
      headers: this.getHeaders(),
    });
  }

  update(
    id: string,
    data: Partial<Consultations>,
  ): Observable<{ success: boolean; data: Consultations }> {
    return this.http.put<{ success: boolean; data: Consultations }>(`${this.apiUrl}/${id}`, data, {
      headers: this.getHeaders(),
    });
  }

  delete(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.apiUrl}/${id}`, {
      headers: this.getHeaders(),
    });
  }
}
