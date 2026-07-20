import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ConsultationService } from '../../services/consultation';
import { environment } from '../../../environments/environment';

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
  totalFollowups = signal(0);

  recentConsultations = signal<any[]>([]);

  topDoctors = signal<any[]>([]);
  ageGroups = signal<{ label: string; count: number; percent: number }[]>([]);

  urgencyStats = signal<{ critical: number; medium: number; low: number; unknown: number }>({
    critical: 0, medium: 0, low: 0, unknown: 0
  });
  monthlyStats = signal<{ month: string; count: number }[]>([]);
  activityFeed = signal<{ icon: string; text: string; time: string; color: string }[]>([]);

  // الاشتراكات - عدد الدكاترة حسب حالة الاشتراك (trial/active/expired) والخطة
  subscriptionsByStatus = signal<{ trial: number; active: number; expired: number }>({
    trial: 0, active: 0, expired: 0,
  });
  subscriptionsByPlan = signal<{ [plan: string]: number }>({});

  // الإيرادات - إجمالي، حسب الخطة، وآخر 6 شهور
  revenueTotalEGP = signal(0);
  revenueByPlan = signal<{ [plan: string]: number }>({});
  revenueByMonth = signal<{ month: string; totalEGP: number }[]>([]);

  // نمو المرضى شهريًا (آخر 6 شهور)
  patientGrowth = signal<{ month: string; count: number }[]>([]);

  // معدل إنجاز الفوللو أب (بدل ليستة Pending Follow-ups)
  followupCompletion = signal<{
    total: number; completed: number; pending: number; cancelled: number; rate: number;
  }>({ total: 0, completed: 0, pending: 0, cancelled: 0, rate: 0 });

  private apiUrl = environment.apiUrl;
  private refreshInterval: any;

  constructor(
    private http: HttpClient,
    private consultationService: ConsultationService,
  ) {}

  ngOnInit() {
    this.loadDashboardStats();
    this.loadRecentConsultations();
  }

  ngOnDestroy() {}

  private getHeaders() {
    const token = localStorage.getItem('token');
    return { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) };
  }

  // كل الأرقام دي دلوقتي بتيجي من endpoint واحد بيحسبها على كل الداتا في
  // الداتابيز مباشرة (مش على أول صفحة/10 سجلات زي ما كان بيحصل قبل كده لما
  // كنا بنجيب /patients و/prescriptions من غير limit ونحسب من اللي راجع بس).
  loadDashboardStats() {
    this.http.get<any>(`${this.apiUrl}/dashboard/stats`, this.getHeaders()).subscribe({
      next: (res) => {
        const d = res.data || {};
        const counts = d.counts || {};
        this.totalDoctors.set(counts.totalDoctors || 0);
        this.totalPatients.set(counts.totalPatients || 0);
        this.totalConsultations.set(counts.totalConsultations || 0);
        this.totalFollowups.set(counts.totalFollowups || 0);

        this.ageGroups.set(d.ageGroups || []);
        this.topDoctors.set(d.topDoctors || []);

        this.subscriptionsByStatus.set(
          d.subscriptions?.byStatus || { trial: 0, active: 0, expired: 0 },
        );
        this.subscriptionsByPlan.set(d.subscriptions?.byPlan || {});

        this.revenueTotalEGP.set(d.revenue?.totalEGP || 0);
        this.revenueByPlan.set(d.revenue?.byPlan || {});
        this.revenueByMonth.set(d.revenue?.byMonth || []);

        this.patientGrowth.set(d.patientGrowth || []);

        this.followupCompletion.set(
          d.followupCompletion || { total: 0, completed: 0, pending: 0, cancelled: 0, rate: 0 },
        );
      },
      error: () => {
        // في حالة فشل الطلب (مثلاً السيرفر لسه من غير التحديث الجديد)، نسيب
        // كل حاجة على القيم الافتراضية (0) بدل ما نكسر الصفحة كلها
      },
    });
  }

  // الكونسلتيشنز مش فيها مشكلة الـ pagination من الأول (الـ endpoint بيرجع
  // الكل من غير limit)، فسايبينها زي ما هي بتحسب urgencyStats/monthlyStats/
  // activityFeed محليًا من نفس الداتا الكاملة.
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

  getPatientGrowthBarHeight(count: number): string {
    const max = Math.max(...this.patientGrowth().map(m => m.count), 1);
    return `${Math.round((count / max) * 100)}%`;
  }

  getRevenueBarHeight(totalEGP: number): string {
    const max = Math.max(...this.revenueByMonth().map(m => m.totalEGP), 1);
    return `${Math.round((totalEGP / max) * 100)}%`;
  }

  // ألوان ثابتة لكل خطة، مستخدمة في الدونات وفي الليجند بتاعها في نفس الوقت
  private planColors: { [plan: string]: string } = {
    Trial: '#E67700',
    Basic: '#3B5BDB',
    Pro: '#7048E8',
  };

  getPlanColor(plan: string): string {
    return this.planColors[plan] || '#CED4DA';
  }

  // بيبني conic-gradient لأي مجموعة (plan -> count/amount) بنفس أسلوب دونات
  // الـ Urgency الأساسي، عشان نستخدم نفس الشكل مع الاشتراكات والإيرادات
  private buildDonutGradient(entries: [string, number][]): string {
    const total = entries.reduce((sum, [, v]) => sum + v, 0) || 1;
    let acc = 0;
    const stops = entries.map(([label, value]) => {
      const start = (acc / total) * 100;
      acc += value;
      const end = (acc / total) * 100;
      return `${this.getPlanColor(label)} ${start}% ${end}%`;
    });
    return stops.length
      ? `conic-gradient(${stops.join(', ')})`
      : `conic-gradient(#CED4DA 0% 100%)`;
  }

  getSubscriptionsDonutStyle(): string {
    return this.buildDonutGradient(this.objectEntries(this.subscriptionsByPlan()));
  }

  getSubscriptionsPlanTotal(): number {
    return this.objectEntries(this.subscriptionsByPlan()).reduce((s, [, v]) => s + v, 0);
  }

  getRevenueDonutStyle(): string {
    return this.buildDonutGradient(this.objectEntries(this.revenueByPlan()));
  }

  getRevenueByPlanTotal(): number {
    return this.objectEntries(this.revenueByPlan()).reduce((s, [, v]) => s + v, 0);
  }

  // عشان نلف على مفاتيح subscriptionsByPlan/revenueByPlan في الـ template
  objectEntries(obj: { [k: string]: number }): [string, number][] {
    return Object.entries(obj || {});
  }
}