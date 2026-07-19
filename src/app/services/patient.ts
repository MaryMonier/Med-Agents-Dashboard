// import { Injectable } from '@angular/core';

// @Injectable({
//   providedIn: 'root',
// })
// export class Patient {}

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Patient {
  _id?: string;
  name: string;
  phone: string;
  dateOfBirth: string;
  gender: 'male' | 'female';
  bloodType: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
  allergies?: string[];
  chronicConditions?: string[];
  chronicMedications?: string[];
  discontinuedMedications?: {
    prescriptionId: string;
    medicationId: string;
    medicationName?: string;
    discontinuedAt: string;
    reason?: string | null;
  }[];
  createdBy?: string;
  createdAt?: string;
}

export interface DoctorInfo {
  _id: string;
  name: string;
  specialty?: string;
  email?: string;
}

export interface PatientWithDoctor extends Omit<Patient, 'createdBy'> {
  createdBy?: DoctorInfo | string;
}

export interface PrescriptionInfo {
  _id?: string;
  medications: {
    _id?: string;
    name: string;
    dose?: string;
    dosage?: string;
    frequency?: string;
    duration?: string;
    isChronic?: boolean;
    isDiscontinued?: boolean;
    discontinuedAt?: string | null;
    discontinuedReason?: string | null;
  }[];
  interactions: string[];
  warnings: string[];
}

export interface ConsultationHistory {
  consultationId: string;
  date: string;
  symptoms: string[];
  diagnosis: string;
  urgencyLevel: string;
  suggestedSpecialist: string | null;
  structuredNote: string | null;
  doctorNotes: string | null;
  isFollowup?: boolean;
  prescription: PrescriptionInfo | null;
}

export interface IPatientHistory {
  patient: PatientWithDoctor;
  history: ConsultationHistory[];
}

@Injectable({ providedIn: 'root' })
export class PatientService {
  private apiUrl = `${environment.apiUrl}/patients`;

  constructor(private http: HttpClient) {}

  getAll(
    search = '',
    page = 1,
    limit = 10,
  ): Observable<{
    success: boolean;
    data: Patient[];
    pagination: { total: number; page: number; limit: number; totalPages: number } | null;
  }> {
    let params = `?page=${page}&limit=${limit}`;
    if (search) params += `&search=${search}`;
    return this.http.get<any>(`${this.apiUrl}${params}`);
  }
  getById(id: string): Observable<{ success: boolean; data: Patient }> {
    return this.http.get<{ success: boolean; data: Patient }>(`${this.apiUrl}/${id}`);
  }
  getByDoctorId(
    doctorId: string,
    page = 1,
    limit = 50,
  ): Observable<{
    success: boolean;
    data: Patient[];
    pagination: { total: number; page: number; limit: number; totalPages: number } | null;
  }> {
    return this.http.get<any>(`${this.apiUrl}/by-doctor/${doctorId}?page=${page}&limit=${limit}`);
  }
  getHistory(id: string): Observable<{ success: boolean; data: IPatientHistory }> {
    return this.http.get<{ success: boolean; data: IPatientHistory }>(
      `${this.apiUrl}/${id}/history`,
    );
  }
  create(patient: Partial<Patient>): Observable<{ success: boolean; data: Patient }> {
    return this.http.post<{ success: boolean; data: Patient }>(this.apiUrl, patient);
  }

  update(id: string, patient: Partial<Patient>): Observable<{ success: boolean; data: Patient }> {
    return this.http.patch<{ success: boolean; data: Patient }>(`${this.apiUrl}/${id}`, patient);
  }

  delete(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.apiUrl}/${id}`);
  }

  discontinueMedication(
    patientId: string,
    payload: { prescriptionId: string; medicationId: string; reason?: string },
  ): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(
      `${this.apiUrl}/${patientId}/discontinue-medication`,
      payload,
    );
  }

  reactivateMedication(
    patientId: string,
    medicationId: string,
  ): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(
      `${this.apiUrl}/${patientId}/reactivate-medication`,
      { medicationId },
    );
  }
}
