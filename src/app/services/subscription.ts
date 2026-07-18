import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SubscriptionService {
  private http = inject(HttpClient);

  private api = `${environment.apiUrl}/subscription`;

  getDoctorsSubscriptions(
    search = '',
    status = '',
    plan = '',
    page = 1,
    limit = 10
  ): Observable<any> {
    let params = `?page=${page}&limit=${limit}`;
    if (search) params += `&search=${search}`;
    if (status) params += `&status=${status}`;
    if (plan) params += `&plan=${plan}`;
    return this.http.get(`${this.api}/doctors${params}`);
  }

  renewSubscription(
    doctorId: string,
    data: { plan: string; months: number }
  ): Observable<any> {
    return this.http.patch(`${this.api}/${doctorId}/renew`, data);
  }
}
