import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ContactMessage {
  _id: string;
  name: string;
  email: string;
  message: string;
  status: 'new' | 'read';
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class ContactService {
  private apiUrl = `${environment.apiUrl}/contact`;

  constructor(private http: HttpClient) {}

  getAll(
    search = '',
    page = 1,
    limit = 10,
  ): Observable<{
    success: boolean;
    data: ContactMessage[];
    pagination: { total: number; page: number; limit: number; totalPages: number } | null;
  }> {
    let params = `?page=${page}&limit=${limit}`;
    if (search) params += `&search=${search}`;
    return this.http.get<any>(`${this.apiUrl}${params}`);
  }
  markAsRead(id: string): Observable<{ success: boolean; data: ContactMessage }> {
  return this.http.patch<{ success: boolean; data: ContactMessage }>(`${this.apiUrl}/${id}/read`, {});
}
}