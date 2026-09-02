import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  login(email: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/login`, { email, password });
  }

  register(data: any): Observable<any> {
  return this.http.post(`${this.apiUrl}/auth/register`, data);
}

  logout(): void {
    localStorage.removeItem('token');
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  saveToken(token: string): void {
    localStorage.setItem('token', token);
  }

  // ===== طلبات تسجيل الأطباء المعلّقة (موافقة الأدمن) =====

  getPendingDoctors(): Observable<any> {
    return this.http.get(`${this.apiUrl}/auth/doctors/pending`);
  }

  // بنجيب صورة/PDF الإثبات كـ blob (مش رابط <img src> مباشر) عشان الـ
  // interceptor يقدر يرفق التوكن في الهيدر - الـ endpoint ده محمي ومش
  // شغال من غير تسجيل دخول admin
  getCredentialProofBlob(doctorId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/auth/doctors/${doctorId}/credential-proof`, {
      responseType: 'blob',
    });
  }

  approveDoctor(doctorId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/doctors/${doctorId}/approve`, {});
  }

  rejectDoctor(doctorId: string, reason: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/doctors/${doctorId}/reject`, { reason });
  }
}
