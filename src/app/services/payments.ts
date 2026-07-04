import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class PaymentService {
  private http = inject(HttpClient);

  private api = 'http://localhost:5000/api/payment';

  getAllPayments(
    search = '',
    status = '',
    page = 1,
    limit = 10
  ): Observable<any> {
    let params = `?page=${page}&limit=${limit}`;
    if (search) params += `&search=${search}`;
    if (status) params += `&status=${status}`;
    return this.http.get(`${this.api}/all${params}`);
  }
}
