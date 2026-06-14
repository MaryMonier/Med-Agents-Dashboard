import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { FollowupResponse } from '../models/followup';

@Injectable({
  providedIn: 'root',
})
export class FollowupService {
  private baseUrl = 'http://localhost:5000/api/followups';

  constructor(private http: HttpClient) {}

  getFollowupsByPatient(patientId: string): Observable<FollowupResponse> {
    return this.http.get<FollowupResponse>(`${this.baseUrl}/patient/${patientId}`);
  }

  updateStatus(id: string, status: 'pending' | 'done' | 'cancelled'): Observable<any> {
    return this.http.put(`${this.baseUrl}/${id}`, { status });
  }

  getAllFollowups(): Observable<FollowupResponse> {
    return this.http.get<FollowupResponse>(this.baseUrl);
  }
}
