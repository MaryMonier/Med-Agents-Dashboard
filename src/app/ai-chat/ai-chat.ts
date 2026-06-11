import { Component, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

@Component({
  selector: 'app-ai-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ai-chat.html',
})
export class AiChatComponent implements AfterViewChecked {
  @ViewChild('messagesEnd') private messagesEnd!: ElementRef;

  messages: Message[] = [
    {
      role: 'assistant',
      content: 'Hello, Doctor! I\'m your AI medical assistant. You can ask me about symptoms, diagnoses, treatment plans, or drug interactions.',
      timestamp: new Date()
    }
  ];

  userInput = '';
  isLoading = false;
  errorMessage = '';

  private readonly apiUrl = 'http://localhost:5000/api/medical-agent/chat';

  constructor(private http: HttpClient) {}

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  sendMessage(): void {
    const text = this.userInput.trim();
    if (!text || this.isLoading) return;

    this.messages.push({ role: 'user', content: text, timestamp: new Date() });
    this.userInput = '';
    this.isLoading = true;
    this.errorMessage = '';

    const history = this.messages.slice(1, -1).map(m => ({
      role: m.role,
      content: m.content
    }));

    this.http.post<any>(this.apiUrl, { message: text, conversationHistory: history }).subscribe({
      next: (res) => {
        const reply = res.data?.response ?? res.response ?? res.message ?? 'No response received.';
        this.messages.push({ role: 'assistant', content: reply, timestamp: new Date() });
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = err.error?.message ?? 'Failed to get response. Check backend connection.';
        this.isLoading = false;
      }
    });
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  clearChat(): void {
    this.messages = [this.messages[0]];
    this.errorMessage = '';
  }

  private scrollToBottom(): void {
    try { this.messagesEnd?.nativeElement?.scrollIntoView({ behavior: 'smooth' }); } catch {}
  }

  formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }
}
