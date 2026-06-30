import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ConsultationService } from '../../services/consultation';
import { FollowupService } from '../../services/followup';

@Component({
  selector: 'app-home',
  imports: [CommonModule, RouterModule, BaseChartDirective],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit, OnDestroy {
  totalDoctors = signal(0);
  totalPatients = signal(0);
  totalConsultations = signal(0);
  totalWarnings = signal(0);
  totalFollowups = signal(0);

  recentConsultations = signal<any[]>([]);
  upcomingFollowups = signal<any[]>([]);

  topDoctors = signal<any[]>([]);
  ageGroups = signal<{ label: string; count: number; percent: number }[]>([]);

  urgencyStats = signal<{ critical: number; medium: number; low: number; unknown: number }>({
    critical: 0,
    medium: 0,
    low: 0,
    unknown: 0,
  });
  monthlyStats = signal<{ month: string; count: number }[]>([]);
  activityFeed = signal<{ icon: string; text: string; time: string; color: string }[]>([]);

  private apiUrl = 'http://localhost:5000/api';
  private refreshInterval: any;

  constructor(
    private http: HttpClient,
    private consultationService: ConsultationService,
    private followupService: FollowupService,
  ) {}

  ngOnInit() {
    this.loadStats();
    this.loadRecentConsultations();
    this.loadUpcomingFollowups();
  }

  ngOnDestroy() {}

  private getHeaders() {
    const token = localStorage.getItem('token');
    return { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) };
  }

  loadStats() {
    this.http.get<any>(`${this.apiUrl}/auth/doctors`).subscribe({
      next: (res) => this.totaldoctors.set(res.data?.length || 0),
      error: () => this.totaldoctors.set(0),
    });
    this.http.get<any>(`${this.apiUrl}/patients`).subscribe({
      next: (res) => this.totalPatients.set(res.data?.length || 0),
      error: () => this.totalPatients.set(0),
    });

    this.http.get<any>(`${this.apiUrl}/consultations`).subscribe({
      next: (res) => this.totalConsultation.set(res.data?.length || 0),
      error: () => this.totalConsultation.set(0),
    });

    this.http.get<any>(`${this.apiUrl}/followups`).subscribe({
      next: (res) => this.totalFollowups.set(res.count || res.data?.length || 0),
      error: () => this.totalFollowups.set(0),
    });

    this.http.get<any>(`${this.apiUrl}/prescriptions`, this.getHeaders()).subscribe({
      next: (res) => {
        const warnings = res.data?.filter((p: any) => p.warnings?.length > 0).length || 0;
        this.totalWarnings.set(warnings);
        this.updateCharts();
      },
      error: () => this.totalWarnings.set(0),
    });
  }
}
