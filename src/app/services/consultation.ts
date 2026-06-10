
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  Consultations,
  CreateConsultationDto,
  ConsultationResponse
} from '../models/consultations';
@Injectable({ providedIn: 'root' })
export class ConsultationService {
  private apiUrl = 'http://localhost:5000/api/consultations';

  constructor(private http: HttpClient) {}

  getAll(search?: string): Observable<ConsultationResponse> {
    let params = new HttpParams();
    if (search) params = params.set('search', search);
    return this.http.get<ConsultationResponse>(this.apiUrl, { params });
  }

  getById(id: string): Observable<{ success: boolean; data: Consultations }> {
    return this.http.get<{ success: boolean; data: Consultations }>(`${this.apiUrl}/${id}`);
  }

  create(data: CreateConsultationDto): Observable<{ success: boolean; data: Consultations }> {
    return this.http.post<{ success: boolean; data: Consultations }>(this.apiUrl, data);
  }

  update(id: string, data: Partial<Consultations>): Observable<{ success: boolean; data: Consultations }> {
    return this.http.put<{ success: boolean; data: Consultations }>(`${this.apiUrl}/${id}`, data);
  }

  delete(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.apiUrl}/${id}`);
  }
}
