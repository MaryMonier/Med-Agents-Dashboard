import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, signal, computed } from '@angular/core';
import { RouterModule } from '@angular/router';

interface ReportItem {
  patientName: string;
  specialist: string;
  urgency: string;
  status: string;
  followUp: string;
}

interface MonthBar {
  month: string;
  value: number;
  percentage: number;
  color: string;
}

@Component({
  selector: 'app-home',
  imports: [CommonModule, RouterModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit {
  totaldoctors    = signal(0);
  totalPatients   = signal(0);
  totalConsultation = signal(0);
  totalWarnings   = signal(0);
  totalFollowups  = signal(0);

  recentReports   = signal<ReportItem[]>([]);

  today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  // Realistic bar chart data (last 6 months)
  monthlyData: MonthBar[] = [
    { month: 'Jan', value: 32, percentage: 53, color: '#c7d2fe' },
    { month: 'Feb', value: 41, percentage: 68, color: '#a5b4fc' },
    { month: 'Mar', value: 38, percentage: 63, color: '#818cf8' },
    { month: 'Apr', value: 55, percentage: 92, color: '#6366f1' },
    { month: 'May', value: 47, percentage: 78, color: '#4f46e5' },
    { month: 'Jun', value: 60, percentage: 100, color: '#4338ca' },
  ];

  private apiUrl = 'http://localhost:5000/api';

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadStats();
  }

  loadStats() {
    this.http.get<any>(`${this.apiUrl}/auth/doctors`).subscribe({
      next: (res) => this.totaldoctors.set(res.data?.length || 0),
      error: () => this.totaldoctors.set(0)
    });

    this.http.get<any>(`${this.apiUrl}/patients`).subscribe({
      next: (res) => this.totalPatients.set(res.data?.length || 0),
      error: () => this.totalPatients.set(0)
    });

    this.http.get<any>(`${this.apiUrl}/consultations`).subscribe({
      next: (res) => {
        const consultations = res.data || [];
        this.totalConsultation.set(consultations.length);

        // Build recent reports from consultations
        const recent = consultations.slice(0, 6).map((c: any) => ({
          patientName: c.patientName || c.patientId || 'Unknown',
          specialist: c.suggestedSpecialist || '',
          urgency: c.urgencyLevel || 'low',
          status: c.status || 'pending',
          followUp: c.followUpDate
            ? new Date(c.followUpDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : '',
        }));
        this.recentReports.set(recent);
      },
      error: () => this.totalConsultation.set(0)
    });

    this.http.get<any>(`${this.apiUrl}/followups`).subscribe({
      next: (res) => this.totalFollowups.set(res.count || res.data?.length || 0),
      error: () => this.totalFollowups.set(0)
    });

    this.http.get<any>(`${this.apiUrl}/prescriptions`).subscribe({
      next: (res) => {
        const warnings = res.data?.filter((p: any) => p.warnings?.length > 0).length || 0;
        this.totalWarnings.set(warnings);
      },
      error: () => this.totalWarnings.set(0)
    });
  }

  getInitials(name: string): string {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  }
}