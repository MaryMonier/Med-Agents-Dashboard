import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Medication {
  name: string;
  activeIngredient?: string | null;
  dosageAmount: number;
  dosageUnit: 'mcg' | 'mg' | 'g';
  frequencyCount: number;
  frequencyPeriod: 'per day' | 'per week' | 'per month';
  isChronic: boolean;
  durationValue?: number;
  durationUnit?: 'days' | 'weeks' | 'months';
  // مرجعة من الباك إند فقط (auto-derived display strings + quick-check result)
  dose?: string;
  frequency?: string;
  duration?: string;
  quickCheckMessage?: string | null;
}

export interface PrescriptionPayload {
  consultationId: string;
  patientId: string;
  language: string;
  medications: Medication[];
}

export interface DrugSuggestion {
  brandName: string;
  genericName: string;
  displayName: string;
  manufacturer: string;
  dosageForms: string[];
  route: string;
}

@Injectable({
  providedIn: 'root',
})
export class PrescriptionService {
  private prescriptionApiUrl = 'http://localhost:5000/api/prescriptions';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');

    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
  }

  searchDrugs(name: string): Observable<{ success: boolean; data: DrugSuggestion[] }> {
    return this.http.get<{ success: boolean; data: DrugSuggestion[] }>(
      `${this.prescriptionApiUrl}/drugs/search?name=${encodeURIComponent(name)}`,
      { headers: this.getHeaders() },
    );
  }

  // فحص سلامة لايف وهو الدكتور بيكتب في المودال — بيرجع جملة واحدة لكل دواء
  // (نفس الإندبوينت اللي بيستخدمه الفرونت إند الرياكت)
  checkPrescriptionSafety(payload: {
    patientId: string;
    medications: { name: string; activeIngredient?: string | null }[];
    excludePrescriptionId?: string;
  }): Observable<{ success: boolean; data: { patient: any; medications: Medication[] } }> {
    return this.http.post<{ success: boolean; data: { patient: any; medications: Medication[] } }>(
      `${this.prescriptionApiUrl}/safety-check`,
      payload,
      { headers: this.getHeaders() },
    );
  }

  getAllPrescriptions(params?: {
    search?: string;
    date?: string;
    page?: number;
    limit?: number;
  }): Observable<any> {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.date) query.set('date', params.date);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    return this.http.get(`${this.prescriptionApiUrl}${qs ? '?' + qs : ''}`, {
      headers: this.getHeaders(),
    });
  }

  getPrescriptionDates(): Observable<{ success: boolean; data: string[] }> {
    return this.http.get<{ success: boolean; data: string[] }>(`${this.prescriptionApiUrl}/dates`, {
      headers: this.getHeaders(),
    });
  }

  createPrescription(data: PrescriptionPayload): Observable<any> {
    return this.http.post(this.prescriptionApiUrl, data, {
      headers: this.getHeaders(),
    });
  }

  getPrescriptionById(id: string): Observable<any> {
    return this.http.get(`${this.prescriptionApiUrl}/${id}`, {
      headers: this.getHeaders(),
    });
  }

  getPrescriptionByConsultation(consultationId: string): Observable<any> {
    return this.http.get(`${this.prescriptionApiUrl}/consultation/${consultationId}`, {
      headers: this.getHeaders(),
    });
  }

  getPrescriptionsByPatient(patientId: string): Observable<any> {
    return this.http.get(`${this.prescriptionApiUrl}/patient/${patientId}`, {
      headers: this.getHeaders(),
    });
  }

  updatePrescription(id: string, data: Partial<PrescriptionPayload>): Observable<any> {
    return this.http.patch(`${this.prescriptionApiUrl}/${id}`, data, {
      headers: this.getHeaders(),
    });
  }

  deletePrescription(id: string): Observable<any> {
    return this.http.delete(`${this.prescriptionApiUrl}/${id}`, {
      headers: this.getHeaders(),
    });
  }
}
