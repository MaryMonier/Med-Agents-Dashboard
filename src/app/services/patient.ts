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
   nationalID: string;
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


getAll(search = '', page = 1, limit = 10): Observable<{
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
