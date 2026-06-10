// import { Injectable } from '@angular/core';

// @Injectable({
//   providedIn: 'root',
// })
// export class Patient {}


import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Patient {
  _id?: string;
  name: string;
  dateOfBirth: string;
  gender: 'male' | 'female';
  bloodType: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
  allergies?: string[];
  chronicConditions?: string[];
  createdBy?: string;
  createdAt?: string;
}

@Injectable({ providedIn: 'root' })
export class PatientService {
  private apiUrl = 'http://localhost:5000/api/patients';

  constructor(private http: HttpClient) {}

  getAll(): Observable<{ success: boolean; data: Patient[] }> {
    
    return this.http.get<{ success: boolean; data: Patient[] }>(this.apiUrl);
  }

  getById(id: string): Observable<{ success: boolean; data: Patient }> {
    return this.http.get<{ success: boolean; data: Patient }>(`${this.apiUrl}/${id}`);
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
}
