import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export type Gender    = 'male' | 'female';
export type BloodType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

export interface Patient {
  _id: string;
  name: string;
  dateOfBirth: string;
  gender: Gender;
  bloodType: BloodType;
  allergies: string[];
  chronicConditions: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePatientDto {
  name: string;
  dateOfBirth: string;
  gender: Gender;
  bloodType: BloodType;
  allergies?: string[];
  chronicConditions?: string[];
}

export interface PatientResponse {
  success: boolean;
  data: Patient[];
}

@Injectable({ providedIn: 'root' })
export class PatientService {
  private readonly apiUrl = 'http://localhost:5000/api/patients';

  constructor(private http: HttpClient) {}

  getAll(): Observable<PatientResponse> {
    return this.http.get<PatientResponse>(this.apiUrl);
  }

  getById(id: string): Observable<{ success: boolean; data: Patient }> {
    return this.http.get<{ success: boolean; data: Patient }>(`${this.apiUrl}/${id}`);
  }

  create(data: CreatePatientDto): Observable<{ success: boolean; data: Patient }> {
    return this.http.post<{ success: boolean; data: Patient }>(this.apiUrl, data);
  }

  update(id: string, data: Partial<CreatePatientDto>): Observable<{ success: boolean; data: Patient }> {
    return this.http.patch<{ success: boolean; data: Patient }>(`${this.apiUrl}/${id}`, data);
  }

  delete(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.apiUrl}/${id}`);
  }

  checkDrugSafety(medications: { name: string; dose?: string }[], language = 'en'): Observable<any> {
    return this.http.post('http://localhost:5000/api/drug-safety/check', {
      medications,
      language,
    });
  }

  checkDrugSafetyForPatient(
    patientId: string,
    medications: { name: string; dose?: string }[],
    language = 'en'
  ): Observable<any> {
    return this.http.post(`http://localhost:5000/api/drug-safety/check/${patientId}`, {
      medications,
      language,
    });
  }
}
