import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Followup {
  _id: string;
  consultationId: string;
  patientId: string;
  instructions: string;
  scheduledDate?: string;
  reminderSent: boolean;
  status: 'pending' | 'done';
  language: 'en' | 'ar';
  createdAt: string;
  updatedAt: string;
}

export interface CreateFollowupDto {
  consultationId: string;
  patientId: string;
  instructions: string;
  scheduledDate?: string;
  language?: 'en' | 'ar';
}

export interface FollowupResponse {
  success: boolean;
  count?: number;
  data: Followup[];
}

@Injectable({ providedIn: 'root' })
export class FollowupService {
  private readonly apiUrl = 'http://localhost:5000/api/followups';

  constructor(private http: HttpClient) {}

  getAll(): Observable<FollowupResponse> {
    return this.http.get<FollowupResponse>(this.apiUrl);
  }

  getById(id: string): Observable<{ success: boolean; data: Followup }> {
    return this.http.get<{ success: boolean; data: Followup }>(`${this.apiUrl}/${id}`);
  }

  create(data: CreateFollowupDto): Observable<{ success: boolean; message: string; data: Followup }> {
    return this.http.post<{ success: boolean; message: string; data: Followup }>(this.apiUrl, data);
  }

  update(id: string, data: Partial<CreateFollowupDto & { status: 'pending' | 'done'; reminderSent: boolean }>): Observable<{ success: boolean; data: Followup }> {
    return this.http.put<{ success: boolean; data: Followup }>(`${this.apiUrl}/${id}`, data);
  }

  delete(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.apiUrl}/${id}`);
  }

  generateFollowupPlan(consultationId: string, language = 'en'): Observable<any> {
    return this.http.post('http://localhost:5000/api/followup-agent/generate', {
      consultationId,
      language,
    });
  }
}
