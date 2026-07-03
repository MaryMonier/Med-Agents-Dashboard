import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SubscriptionService {
  private http = inject(HttpClient);

  private api = 'http://localhost:5000/api/subscription';

  getDoctorsSubscriptions(): Observable<any> {
    return this.http.get(`${this.api}/doctors`);
  }

  renewSubscription(
    doctorId: string,
    data: {months: number }
  ): Observable<any> {
    return this.http.patch(
      `${this.api}/${doctorId}/renew`,
      data
    );
  }
}
