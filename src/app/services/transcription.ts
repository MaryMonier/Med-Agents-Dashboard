import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface TranscriptionResponse {
  success: boolean;
  data: { text: string };
}

/**
 * TranscriptionService — بيبعت مقطع صوتي (Blob من MediaRecorder) لـ
 * POST /api/transcribe، اللي بيرسله للباك لـ Groq Whisper ويرجّع النص
 * المُفرَّغ منه. نفس الـ endpoint المستخدم في الرياكت (api/transcription.js).
 */
@Injectable({ providedIn: 'root' })
export class TranscriptionService {
  private apiUrl = `${environment.apiUrl}/transcribe`;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
  }

  transcribe(audioBlob: Blob, language?: 'ar' | 'en'): Observable<TranscriptionResponse> {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    if (language) formData.append('language', language);

    return this.http.post<TranscriptionResponse>(this.apiUrl, formData, {
      headers: this.getHeaders(),
    });
  }
}
