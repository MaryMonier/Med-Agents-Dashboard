import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface DashboardStats {
  totalConsultations: number;
  totalPrescriptions: number;
  totalFollowups: number;
}

export interface DashboardStatsResponse {
  success: boolean;
  data: DashboardStats;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private apiUrl = 'http://localhost:5000/api';

  constructor(private http: HttpClient) {}

  getStats(): Observable<DashboardStatsResponse> {
    return this.http.get<DashboardStatsResponse>(`${this.apiUrl}/dashboard/stats`);
  }
}
