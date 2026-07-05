import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { FollowupResponse } from '../models/followup';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class FollowupService {
  private baseUrl = `${environment.apiUrl}/followups`;
  private agentUrl = `${environment.apiUrl}/followup-agent`;

  constructor(private http: HttpClient) {}

  getAllFollowups(): Observable<FollowupResponse> {
    return this.http.get<FollowupResponse>(this.baseUrl);
  }

  getFollowupById(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/${id}`);
  }

  getFollowupsByPatient(patientId: string): Observable<FollowupResponse> {
    return this.http.get<FollowupResponse>(`${this.baseUrl}/patient/${patientId}`);
  }
  getFollowupsByDoctorId(doctorId: string): Observable<FollowupResponse> {
  return this.http.get<FollowupResponse>(`${this.baseUrl}/by-doctor/${doctorId}`);
}

  updateStatus(id: string, status: 'pending' | 'confirmed' | 'cancelled'): Observable<any> {
    return this.http.put(`${this.baseUrl}/${id}`, { status });
  }

  updateInstructions(id: string, instructions: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/${id}`, { instructions });
  }

  generateFollowupPlan(
    consultationId: string,
    scheduledDate: string,
    language: string,
  ): Observable<any> {
    return this.http.post(`${this.agentUrl}/generate`, {
      consultationId,
      scheduledDate,
      language,
    });
  }
}
