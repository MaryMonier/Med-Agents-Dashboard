import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Subject, forkJoin, takeUntil } from 'rxjs';
import { ChartConfiguration, ChartData, ChartType, Chart } from 'chart.js';
import {
  LineController, LineElement, BarController, BarElement,
  PointElement, CategoryScale, LinearScale, Filler, Tooltip, Legend,
  DoughnutController, ArcElement
} from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import {
  DashboardService, ChartPeriod, DashboardStats,
  ConsultationSummary, ChartDataPoint,
} from '../../services/dashboard.service';

Chart.register(
  LineController, LineElement, BarController, BarElement,
  PointElement, CategoryScale, LinearScale, Filler, Tooltip, Legend,
  DoughnutController, ArcElement
);

export interface KpiCard {
  label: string;
  value: number;
  icon: string;
  sub: string;
  color: string;
  bg: string;
  iconBg: string;
  loading: boolean;
}

export interface RecentPatientRow {
  id: string;
  name: string;
  initials: string;
  avatarBg: string;
  condition: string;
  urgency: 'low' | 'medium' | 'critical';
  time: string;
  status: 'completed' | 'pending' | 'follow-up';
}

const AVATAR_COLORS = ['#E6F1FB','#E6FBF3','#FBF3E6','#F3E6FB','#FBE6E6','#E6F8FB'];

function avatarColor(i: number): string { return AVATAR_COLORS[i % AVATAR_COLORS.length]; }
function initials(name: string): string {
  return (name ?? '?').split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase();
}
function timeAgo(dateStr: string): string {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.floor(hrs / 24)} days ago`;
}
function buildChartLabels(period: ChartPeriod): string[] {
  if (period === 'week')    return ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  if (period === 'month')   return ['Week 1','Week 2','Week 3','Week 4'];
  return ['Month 1','Month 2','Month 3'];
}
function aggregateToChartPoints(
  consultations: ConsultationSummary[], followups: any[], period: ChartPeriod
): ChartDataPoint[] {
  const now = new Date();
  const bucketOf = (d: string) => {
    const dt = new Date(d);
    if (period === 'week')  return dt.getDay() === 0 ? 6 : dt.getDay() - 1;
    if (period === 'month') return Math.floor((now.getDate() - dt.getDate()) / 7);
    return dt.getMonth();
  };
  const rangeMs: Record<ChartPeriod, number> = { week: 7*86400000, month: 30*86400000, quarter: 90*86400000 };
  const cutoff  = now.getTime() - rangeMs[period];
  const buckets = period === 'week' ? 7 : period === 'month' ? 4 : 3;
  const cB = new Array(buckets).fill(0);
  const fB = new Array(buckets).fill(0);
  consultations.filter(c => new Date(c.createdAt).getTime() > cutoff)
    .forEach(c => { const b = Math.max(0, Math.min(buckets-1, bucketOf(c.createdAt))); cB[b]++; });
  followups.filter(f => new Date(f.createdAt).getTime() > cutoff)
    .forEach(f => { const b = Math.max(0, Math.min(buckets-1, bucketOf(f.createdAt))); fB[b]++; });
  return buildChartLabels(period).map((label, i) => ({ label, consultations: cB[i], followups: fB[i] }));
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, BaseChartDirective],
  templateUrl: './home.html',
  styleUrls: ['./home.css'],
})
export class HomeComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  greeting = 'Welcome back';
  statsLoading = true; patientsLoading = true;
  chartLoading = false; exportLoading = false;
  statsError = false;  patientsError = false;
  currentDate = '';
  activePeriod: ChartPeriod = 'week';

  kpiCards: KpiCard[] = [
    { label: 'Total Patients', value: 0, icon: 'ti ti-users', sub: 'registered', color: '#185FA5', bg: 'rgba(24,95,165,0.05)', iconBg: 'rgba(24,95,165,0.1)', loading: true },
    { label: 'Consultations', value: 0, icon: 'ti ti-stethoscope', sub: 'total sessions', color: '#0D9488', bg: 'rgba(13,148,136,0.05)', iconBg: 'rgba(13,148,136,0.1)', loading: true },
    { label: 'Drug Safety Warnings', value: 0, icon: 'ti ti-shield-exclamation', sub: 'critical urgency', color: '#D97706', bg: 'rgba(217,119,6,0.05)', iconBg: 'rgba(217,119,6,0.1)', loading: true },
    { label: 'Active Follow-ups', value: 0, icon: 'ti ti-calendar-check', sub: 'pending review', color: '#4F46E5', bg: 'rgba(79,70,229,0.05)', iconBg: 'rgba(79,70,229,0.1)', loading: true },
  ];

  patientRows: RecentPatientRow[] = [];
  recentActivity: any[] = [];

  lineType: ChartType = 'line';
  lineData: ChartData<'line'> = {
    labels: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
    datasets: [
      {
        label:'Consultations', data:[0,0,0,0,0,0,0],
        borderColor:'#185FA5', backgroundColor:'rgba(24,95,165,0.08)',
        borderWidth:2.5, tension:0.4, fill:true,
        pointBackgroundColor:'#185FA5', pointBorderColor:'#ffffff', pointBorderWidth:2, pointRadius:5, pointHoverRadius:7,
      },
      {
        label:'Follow-ups', data:[0,0,0,0,0,0,0],
        borderColor:'#0D9488', backgroundColor:'rgba(13,148,136,0.06)',
        borderWidth:2, tension:0.4, fill:true,
        pointBackgroundColor:'#0D9488', pointBorderColor:'#ffffff', pointBorderWidth:2, pointRadius:4, pointHoverRadius:6,
      },
    ],
  };

  lineOpts: ChartConfiguration['options'] = {
    responsive:true, maintainAspectRatio:false,
    interaction:{ mode:'index', intersect:false },
    scales: {
      x: { grid:{display:false}, border:{display:false}, ticks:{color:'#94a3b8', font:{size:12}, padding:8} },
      y: { grid:{color:'rgba(148,163,184,0.15)'}, border:{display:false}, ticks:{color:'#94a3b8', font:{size:12}, padding:12, stepSize:2}, beginAtZero:true },
    },
    plugins: {
      legend:{ display:true, position:'top', align:'end',
        labels:{color:'#64748b', usePointStyle:true, pointStyle:'circle', boxWidth:7, padding:20} },
      tooltip:{ backgroundColor:'#ffffff', titleColor:'#1e293b', bodyColor:'#64748b',
        borderColor:'#e2e8f0', borderWidth:1, padding:12, cornerRadius:10 },
    },
  };

  // ─── هنا التعديل الجديد اللي صلح المشكلة ───
  donutType: ChartType = 'doughnut';
  donutData: ChartData<'doughnut'> = {
    labels: ['Low', 'Moderate', 'Critical'],
    datasets: [
      {
        data: [0, 0, 0],
        backgroundColor: ['#10B981', '#F59E0B', '#EF4444'],
        borderWidth: 0,
        hoverOffset: 4,
        // cutout: '75%' // تم نقلها هنا بنجاح متوافق مع النوع
      }
    ]
  };

  donutOpts: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { cornerRadius: 8, padding: 10 }
    }
  };

  private allConsultations: ConsultationSummary[] = [];
  private allFollowups: any[] = [];

  constructor(
    private dashboardService: DashboardService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.currentDate = new Date().toLocaleDateString('en-US', {
      weekday:'long', year:'numeric', month:'long', day:'numeric'
    });
    this.setGreeting();
    this.loadAll();
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  private setGreeting(): void {
    const hr = new Date().getHours();
    if (hr < 12) this.greeting = 'Good morning';
    else if (hr < 18) this.greeting = 'Good afternoon';
    else this.greeting = 'Good evening';
  }

  public loadAll(): void {
    this.loadStats();
    this.loadRecentPatients();
    this.loadChart('week');
  }

  private loadStats(): void {
    this.statsLoading = true; this.statsError = false;
    this.dashboardService.getStats().pipe(takeUntil(this.destroy$)).subscribe({
      next: (stats: DashboardStats) => {
        this.kpiCards[0].value = stats.totalPatients;
        this.kpiCards[1].value = stats.totalConsultations;
        this.kpiCards[2].value = stats.drugWarningsCount;
        this.kpiCards[3].value = stats.activeFollowups;
        this.kpiCards.forEach(c => c.loading = false);
        this.statsLoading = false; this.cdr.markForCheck();
      },
      error: () => {
        this.statsError = true; this.statsLoading = false;
        this.kpiCards.forEach(c => c.loading = false); this.cdr.markForCheck();
      },
    });
  }

  private loadRecentPatients(): void {
    this.patientsLoading = true; this.patientsError = false;
    this.dashboardService.getRecentConsultations(8).pipe(takeUntil(this.destroy$)).subscribe({
      next: (consultations: ConsultationSummary[]) => {
        let lowUrgency = 0;
        let medUrgency = 0;
        let critUrgency = 0;

        this.patientRows = consultations.map((c, i): RecentPatientRow => {
          const name = (c.patientId as any)?.name ?? 'Unknown Patient';
          const urgency = c.urgencyLevel || 'low';

          if (urgency === 'critical') critUrgency++;
          else if (urgency === 'medium') medUrgency++;
          else lowUrgency++;

          return {
            id: c._id, name, initials: initials(name), avatarBg: avatarColor(i),
            condition: c.diagnosis || 'Consultation recorded',
            urgency: urgency, time: timeAgo(c.createdAt),
            status: c.status === 'completed' ? 'completed' : 'pending',
          };
        });

        // تحديث الـ Donut مع الحفاظ على خاصية الـ cutout داخل الـ dataset
        this.donutData = {
          ...this.donutData,
          datasets: [{
            ...this.donutData.datasets[0],
            data: [lowUrgency, medUrgency, critUrgency]
          }]
        };

        this.recentActivity = consultations.slice(0, 4).map(c => ({
          title: c.diagnosis || 'New Consultation',
          sub: `Patient ID: ${(c.patientId as any)?._id || c.patientId}`,
          time: timeAgo(c.createdAt),
          dotColor: c.urgencyLevel === 'critical' ? '#EF4444' : c.urgencyLevel === 'medium' ? '#F59E0B' : '#10B981'
        }));

        this.patientsLoading = false; this.cdr.markForCheck();
      },
      error: () => { this.patientsError = true; this.patientsLoading = false; this.cdr.markForCheck(); },
    });
  }

  loadChart(period: ChartPeriod): void {
    this.activePeriod = period; this.chartLoading = true;
    this.dashboardService.getChartData(period).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => { this.applyChartPoints(res.data, period); this.chartLoading = false; this.cdr.markForCheck(); },
      error: () => this.buildChartFromRawData(period),
    });
  }

  private buildChartFromRawData(period: ChartPeriod): void {
    forkJoin({
      consultations: this.dashboardService.getAllConsultationsForChart(),
      followups:     this.dashboardService.getAllFollowupsForChart(),
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: ({ consultations, followups }) => {
        this.allConsultations = consultations; this.allFollowups = followups;
        this.applyChartPoints(aggregateToChartPoints(consultations, followups, period), period);
        this.chartLoading = false; this.cdr.markForCheck();
      },
      error: () => { this.chartLoading = false; this.cdr.markForCheck(); },
    });
  }

  private applyChartPoints(points: ChartDataPoint[], _period: ChartPeriod): void {
    this.lineData = {
      ...this.lineData,
      labels: points.map(p => p.label),
      datasets: [
        { ...this.lineData.datasets[0], data: points.map(p => p.consultations) },
        { ...this.lineData.datasets[1], data: points.map(p => p.followups) },
      ],
    };
  }

  exportReport(): void {
    if (this.exportLoading) return;

    const latestId = this.patientRows[0]?.id ?? this.allConsultations[0]?._id;
    if (!latestId) { alert('No consultations available to export.'); return; }

    const latestFull = this.allConsultations.find(c => c._id === latestId);
    const lang       = (latestFull as any)?.language ?? 'en';

    this.exportLoading = true;

    this.dashboardService
      .generateReport(latestId, lang)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          const r        = res.data ?? res;
          const isArabic = lang === 'ar';

          const content = isArabic
            ? [
                'ميد أيجنتس — تقرير طبي',
                `تاريخ الإنشاء: ${new Date().toLocaleString('ar-EG')}`,
                '─'.repeat(60),
                `العنوان:               ${r.reportTitle      ?? 'غير متوفر'}`,
                `حالة المريض:          ${r.patientCondition ?? 'غير متوفر'}`,
                `النتائج السريرية:     ${r.clinicalFindings ?? 'غير متوفر'}`,
                `خطة العلاج:           ${r.treatmentPlan    ?? 'غير متوفر'}`,
                `التوصيات:             ${r.recommendations  ?? 'غير متوفر'}`,
                `ملاحظات المتابعة:     ${r.followupNotes    ?? 'غير متوفر'}`,
              ].join('\n')
            : [
                'MED AGENTS — MEDICAL REPORT',
                `Generated: ${new Date().toLocaleString()}`,
                '─'.repeat(60),
                `Title:             ${r.reportTitle      ?? 'N/A'}`,
                `Patient Condition: ${r.patientCondition ?? 'N/A'}`,
                `Clinical Findings: ${r.clinicalFindings ?? 'N/A'}`,
                `Treatment Plan:    ${r.treatmentPlan    ?? 'N/A'}`,
                `Recommendations:   ${r.recommendations  ?? 'N/A'}`,
                `Follow-up Notes:   ${r.followupNotes    ?? 'N/A'}`,
              ].join('\n');

          const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
          const url  = URL.createObjectURL(blob);
          const a    = document.createElement('a');
          a.href     = url;
          a.download = `med-report-${Date.now()}.txt`;
          a.click();
          URL.revokeObjectURL(url);

          this.exportLoading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          alert('Report generation failed.');
          this.exportLoading = false;
          this.cdr.markForCheck();
        },
      });
  }

  goTo(path: string): void {
    this.router.navigate([path]);
  }

  urgencyLabel(u: string): string { return ({low:'Low', medium:'Moderate', critical:'Critical'} as any)[u] ?? u; }
  statusLabel(s:  string): string { return ({completed:'Completed', pending:'Pending', 'follow-up':'Follow-up'} as any)[s] ?? s; }

  trackById(_: number, item: RecentPatientRow): string { return item.id; }

  get totalConsultations(): number { return this.kpiCards[1].value; }
  get totalWarnings():      number { return this.kpiCards[2].value; }
}
