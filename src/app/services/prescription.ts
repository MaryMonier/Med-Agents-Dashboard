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
  private prescriptionApiUrl = 'http://localhost:5000/api/prescriptions';
  private patientsApiUrl = 'http://localhost:5000/api/patients';
  private drugSafetyApiUrl = 'http://localhost:5000/api/drug-safety';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');

    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
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

  getPatientById(patientId: string): Observable<any> {
    return this.http.get(`${this.patientsApiUrl}/${patientId}`, {
      headers: this.getHeaders(),
    });
  }

  checkDrugSafetyForPatient(
    patientId: string,
    medications: Medication[],
    language: string
  ): Observable<any> {
    return this.http.post(
      `${this.drugSafetyApiUrl}/check/${patientId}`,
      { medications, language },
      { headers: this.getHeaders() }
    );
  }
}
