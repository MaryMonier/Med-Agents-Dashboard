import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { FollowupResponse } from '../models/followup';

@Injectable({
  providedIn: 'root',
})
export class FollowupService {
  private baseUrl = 'http://localhost:5000/api/followups';
  private agentUrl = 'http://localhost:5000/api/followup-agent';

  constructor(private http: HttpClient) {}

  getAllFollowups(): Observable<FollowupResponse> {
    return this.http.get<FollowupResponse>(this.baseUrl);
  }

  getFollowupsByPatient(patientId: string): Observable<FollowupResponse> {
    return this.http.get<FollowupResponse>(`${this.baseUrl}/patient/${patientId}`);
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
