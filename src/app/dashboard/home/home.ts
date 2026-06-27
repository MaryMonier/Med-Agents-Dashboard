import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ConsultationService } from '../../services/consultation';
import { FollowupService } from '../../services/followup';

@Component({
  selector: 'app-home',
  imports: [CommonModule, RouterModule],
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
    critical: 0, medium: 0, low: 0, unknown: 0
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
    this.http.get<any>(`${this.apiUrl}/auth/doctors`, this.getHeaders()).subscribe({
      next: (res) => this.totalDoctors.set(res.count || res.data?.length || 0),
      error: () => this.totalDoctors.set(0),
    });

    // this.http.get<any>(`${this.apiUrl}/patients`, this.getHeaders()).subscribe({
    //   next: (res) => this.totalPatients.set(res.pagination?.total || res.data?.length || 0),
    //   error: () => this.totalPatients.set(0),
    // });

    this.http.get<any>(`${this.apiUrl}/patients`, this.getHeaders()).subscribe({
  next: (res) => {
    const patients = res.data || [];
    this.totalPatients.set(res.pagination?.total || patients.length || 0);

    // Age Distribution
    const groups: any = { '0-18': 0, '19-40': 0, '41-60': 0, '60+': 0 };
    patients.forEach((p: any) => {
      const age = new Date().getFullYear() - new Date(p.dateOfBirth).getFullYear();
      if (age <= 18) groups['0-18']++;
      else if (age <= 40) groups['19-40']++;
      else if (age <= 60) groups['41-60']++;
      else groups['60+']++;
    });
    const total = patients.length || 1;
    this.ageGroups.set(
      Object.entries(groups).map(([label, count]: any) => ({
        label, count, percent: Math.round((count / total) * 100)
      }))
    );

    // Top Doctors
    this.http.get<any>(`${this.apiUrl}/auth/doctors`, this.getHeaders()).subscribe({
      next: (docRes) => {
        const doctors = docRes.data || [];
        const doctorCount: any = {};
        patients.forEach((p: any) => {
          const id = p.createdBy?._id || p.createdBy;
          if (id) doctorCount[id] = (doctorCount[id] || 0) + 1;
        });
        const top = doctors
          .map((d: any) => ({ ...d, patientCount: doctorCount[d._id] || 0 }))
          .sort((a: any, b: any) => b.patientCount - a.patientCount)
          .slice(0, 5);
        this.topDoctors.set(top);
      }
    });
  },
  error: () => this.totalPatients.set(0),
});

    this.http.get<any>(`${this.apiUrl}/consultations`, this.getHeaders()).subscribe({
      next: (res) => this.totalConsultations.set(res.count || res.data?.length || 0),
      error: () => this.totalConsultations.set(0),
    });

    this.http.get<any>(`${this.apiUrl}/followups`, this.getHeaders()).subscribe({
      next: (res) => this.totalFollowups.set(res.data?.length || 0),
      error: () => this.totalFollowups.set(0),
    });

    this.http.get<any>(`${this.apiUrl}/prescriptions`, this.getHeaders()).subscribe({
      next: (res) => {
        const warnings = res.data?.filter((p: any) => p.warnings?.length > 0).length || 0;
        this.totalWarnings.set(warnings);
      },
      error: () => this.totalWarnings.set(0),
    });
  }

  loadRecentConsultations() {
    this.consultationService.getAll().subscribe({
      next: (res) => {
        const data = res.data || [];

        const sorted = [...data]
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5);
        this.recentConsultations.set(sorted);

        const stats = { critical: 0, medium: 0, low: 0, unknown: 0 };
        data.forEach((c: any) => {
          const lvl = c.urgencyLevel as keyof typeof stats;
          if (lvl in stats) stats[lvl]++;
          else stats.unknown++;
        });
        this.urgencyStats.set(stats);

        const months: { [key: string]: number } = {};
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const key = d.toLocaleString('en', { month: 'short' });
          months[key] = 0;
        }
        data.forEach((c: any) => {
          const d = new Date(c.createdAt);
          const key = d.toLocaleString('en', { month: 'short' });
          if (key in months) months[key]++;
        });
        this.monthlyStats.set(Object.entries(months).map(([month, count]) => ({ month, count })));

        const feed = [...data]
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 3)
          .map((c: any) => ({
            icon: 'medical_services',
            text: `New consultation — ${this.getPatientName(c.patientId)}`,
            time: this.timeAgo(new Date(c.createdAt)),
            color: '#7048E8'
          }));
        this.activityFeed.set(feed);
      },
      error: () => this.recentConsultations.set([]),
    });
  }

  loadUpcomingFollowups() {
    this.followupService.getAllFollowups().subscribe({
      next: (res) => {
        const pending = (res.data || [])
          .filter((f: any) => f.status === 'pending')
          .slice(0, 3);
        this.upcomingFollowups.set(pending);
      },
      error: () => this.upcomingFollowups.set([]),
    });
  }

  getPatientName(patientId: any): string {
    if (!patientId) return '—';
    if (typeof patientId === 'object') return patientId.name || '—';
    return patientId;
  }

  getUrgencyClass(level: string): string {
    return level === 'critical' ? 'urgent-critical'
      : level === 'medium' ? 'urgent-medium'
      : 'urgent-low';
  }

  timeAgo(date: Date): string {
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  getDonutStyle(): string {
    const s = this.urgencyStats();
    const total = s.critical + s.medium + s.low + s.unknown || 1;
    const c1 = (s.critical / total) * 100;
    const c2 = c1 + (s.medium / total) * 100;
    const c3 = c2 + (s.low / total) * 100;
    return `conic-gradient(#C92A2A 0% ${c1}%, #E67700 ${c1}% ${c2}%, #2F9E44 ${c2}% ${c3}%, #CED4DA ${c3}% 100%)`;
  }

  getBarHeight(count: number): string {
    const max = Math.max(...this.monthlyStats().map(m => m.count), 1);
    return `${Math.round((count / max) * 100)}%`;
  }

  
}