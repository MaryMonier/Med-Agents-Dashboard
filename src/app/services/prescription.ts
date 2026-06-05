import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Medication {
  name: string;
  dose: string;
  frequency: string;
  duration: string;
}

export interface PrescriptionPayload {
  consultationId: string;
  patientId: string;
  language: string;
  medications: Medication[];
}

@Injectable({
  providedIn: 'root',
})
export class PrescriptionService {
  private apiUrl = 'http://localhost:5000/api/prescriptions';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');

    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
  }

  createPrescription(data: PrescriptionPayload): Observable<any> {
    return this.http.post(this.apiUrl, data, {
      headers: this.getHeaders(),
    });
  }

  getPrescriptionById(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`, {
      headers: this.getHeaders(),
    });
  }

  getPrescriptionsByPatient(patientId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/patient/${patientId}`, {
      headers: this.getHeaders(),
    });
  }

  updatePrescription(id: string, data: Partial<PrescriptionPayload>): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}`, data, {
      headers: this.getHeaders(),
    });
  }

  deletePrescription(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, {
      headers: this.getHeaders(),
    });
  }
}
