import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranscriptionService } from '../../services/transcription';

/**
 * MicButton — بيسجل صوت من الميكروفون (MediaRecorder API)، ولما التسجيل
 * يوقف، بيبعت الملف للباك (Groq Whisper) ويرجّع النص المُفرَّغ عن طريق
 * الـ (transcript) output — نفس سلوك useVoiceRecorder + MicButton في
 * الرياكت بالظبط، بس متلمين في component واحد بدل hook + component
 * (الشكل الطبيعي في أنجولار).
 *
 * الاستخدام (زي الرياكت بالظبط): بيضيف النص المُفرَّغ لآخر الحقل الحالي
 * (مش بيستبدل اللي مكتوب قبل كده) - القرار ده بيتاخد في الكومبوننت الأب
 * (new-consultation-modal) اللي بيسمع للـ (transcript) output.
 */
@Component({
  selector: 'app-mic-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mic-button.html',
  styleUrl: './mic-button.css',
})
export class MicButtonComponent {
  @Input() language: 'ar' | 'en' = 'en';
  @Input() disabled = false;
  @Output() transcript = new EventEmitter<string>();

  isRecording = signal(false);
  isTranscribing = signal(false);
  error = signal<string | null>(null);

  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private stream: MediaStream | null = null;

  constructor(private transcriptionService: TranscriptionService) {}

  toggle(): void {
    if (this.isRecording()) {
      this.stop();
    } else {
      this.start();
    }
  }

  private async start(): Promise<void> {
    this.error.set(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.stream = stream;
      this.chunks = [];

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

      mediaRecorder.ondataavailable = (e: BlobEvent) => {
        if (e.data.size > 0) this.chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        // بنقفل الميكروفون فورًا وقت ما التسجيل يوقف - مش لازم يفضل مفتوح
        // لحد ما التفريغ يخلص
        this.stream?.getTracks().forEach((track) => track.stop());

        const audioBlob = new Blob(this.chunks, { type: 'audio/webm' });

        // تسجيل فاضي (دوس تشغيل ثم إيقاف فورًا من غير كلام) - نتجاهله
        if (audioBlob.size < 1000) {
          this.isTranscribing.set(false);
          return;
        }

        this.isTranscribing.set(true);
        this.transcriptionService.transcribe(audioBlob, this.language).subscribe({
          next: (res) => {
            this.isTranscribing.set(false);
            if (res?.data?.text) {
              this.transcript.emit(res.data.text);
            }
          },
          error: (err) => {
            this.isTranscribing.set(false);
            this.error.set(err?.error?.message || err?.message || 'Transcription failed');
          },
        });
      };

      this.mediaRecorder = mediaRecorder;
      mediaRecorder.start();
      this.isRecording.set(true);
    } catch (err: any) {
      // ممكن يحصل لو المستخدم رفض إذن الميكروفون، أو مفيش ميكروفون أصلاً
      this.error.set(err?.message || 'Could not access microphone');
    }
  }

  private stop(): void {
    if (this.mediaRecorder && this.isRecording()) {
      this.mediaRecorder.stop();
      this.isRecording.set(false);
    }
  }
}
