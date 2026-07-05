import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { PatientService, Patient } from '../../services/patient';
import { ConsultationService } from '../../services/consultation';
import { ConsultationWithPatient } from '../../models/consultations';
import { FollowupService } from '../../services/followup';
import { Followup } from '../../models/followup';
import { environment } from '../../../environments/environment';

type TabKey = 'patients' | 'consultations' | 'followups';

interface CalendarDay {
  date: Date;
  dateKey: string;
  inCurrentMonth: boolean;
  isToday: boolean;
  hasActivity: boolean;
}

@Component({
  selector: 'app-doctor-detail',
  imports: [CommonModule],
  templateUrl: './doctor-detail.html',
  styleUrl: './doctor-detail.css',
})
export class DoctorDetail implements OnInit {
  doctor = signal<any>(null);
  patients = signal<Patient[]>([]);
  consultations = signal<ConsultationWithPatient[]>([]);
  followups = signal<Followup[]>([]);

  isLoading = signal(false);
  isLoadingPatients = signal(false);
  isLoadingConsultations = signal(false);
  isLoadingFollowups = signal(false);
  errorMessage = signal('');

  doctorId = signal('');
  activeTab = signal<TabKey>('patients');

  calendarMonth = signal(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  selectedDateKey = signal<string | null>(null);

  totalPatients = computed(() => this.patients().length);
  totalConsultations = computed(() => this.consultations().length);
  totalFollowups = computed(() => this.followups().length);

  filteredPatients = computed(() => {
    const list = this.patients();
    const key = this.selectedDateKey();
    if (!key) return list;

    // نجمع الـ IDs بتوع المرضى اللي ليهم consultation أو follow-up في اليوم ده
    const activePatientIds = new Set<string>();

    this.consultations().forEach((c) => {
      if (this.toDateKey(c.createdAt) === key) {
        const pid = typeof c.patientId === 'string' ? c.patientId : c.patientId?._id;
        if (pid) activePatientIds.add(pid);
      }
    });

    this.followups().forEach((f) => {
      if (this.toDateKey(f.scheduledDate) === key) {
        const pid = f.patientId?._id;
        if (pid) activePatientIds.add(pid);
      }
    });

    return list.filter((p) => p._id && activePatientIds.has(p._id));
  });

  filteredConsultations = computed(() => {
    const list = this.consultations();
    const key = this.selectedDateKey();
    if (!key) return list;
    return list.filter((c) => this.toDateKey(c.createdAt) === key);
  });

  filteredFollowups = computed(() => {
    const list = this.followups();
    const key = this.selectedDateKey();
    if (!key) return list;
    return list.filter((f) => this.toDateKey(f.scheduledDate) === key);
  });

  calendarDays = computed<CalendarDay[]>(() => {
    const monthStart = this.calendarMonth();
    const year = monthStart.getFullYear();
    const month = monthStart.getMonth();

    const firstOfMonth = new Date(year, month, 1);
    const startWeekday = firstOfMonth.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const todayKey = this.toDateKey(new Date().toISOString());

    const activityKeys = new Set<string>();
    if (this.activeTab() === 'consultations') {
      this.consultations().forEach((c) => activityKeys.add(this.toDateKey(c.createdAt)));
    } else if (this.activeTab() === 'followups') {
      this.followups().forEach((f) => activityKeys.add(this.toDateKey(f.scheduledDate)));
    } else {
      this.consultations().forEach((c) => activityKeys.add(this.toDateKey(c.createdAt)));
      this.followups().forEach((f) => activityKeys.add(this.toDateKey(f.scheduledDate)));
    }

    const days: CalendarDay[] = [];

    for (let i = 0; i < startWeekday; i++) {
      const date = new Date(year, month, 1 - (startWeekday - i));
      const dateKey = this.toDateKey(date.toISOString());
      days.push({ date, dateKey, inCurrentMonth: false, isToday: dateKey === todayKey, hasActivity: activityKeys.has(dateKey) });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const dateKey = this.toDateKey(date.toISOString());
      days.push({ date, dateKey, inCurrentMonth: true, isToday: dateKey === todayKey, hasActivity: activityKeys.has(dateKey) });
    }

    while (days.length % 7 !== 0) {
      const last = days[days.length - 1].date;
      const date = new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1);
      const dateKey = this.toDateKey(date.toISOString());
      days.push({ date, dateKey, inCurrentMonth: false, isToday: dateKey === todayKey, hasActivity: activityKeys.has(dateKey) });
    }

    return days;
  });

  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private patientService: PatientService,
    private consultationService: ConsultationService,
    private followupService: FollowupService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.params['id'];
    if (!id) {
      this.errorMessage.set('No doctor specified');
      return;
    }
    this.doctorId.set(id);
    this.loadDoctor();
    this.loadDoctorPatients();
    this.loadDoctorConsultations();
    this.loadDoctorFollowups();
  }

  loadDoctor(): void {
    this.isLoading.set(true);
    this.http.get<any>(`${this.apiUrl}/auth/doctors/${this.doctorId()}`).subscribe({
      next: (res) => {
        this.doctor.set(res.data);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Failed to load doctor');
        this.isLoading.set(false);
      },
    });
  }

  loadDoctorPatients(): void {
    this.isLoadingPatients.set(true);
    this.patientService.getByDoctorId(this.doctorId()).subscribe({
      next: (res) => {
        this.patients.set(res.data || []);
        this.isLoadingPatients.set(false);
      },
      error: () => {
        this.errorMessage.set('Failed to load patients for this doctor');
        this.isLoadingPatients.set(false);
      },
    });
  }

  loadDoctorConsultations(): void {
    this.isLoadingConsultations.set(true);
    this.consultationService.getByDoctorId(this.doctorId()).subscribe({
      next: (res) => {
        this.consultations.set((res.data as unknown as ConsultationWithPatient[]) || []);
        this.isLoadingConsultations.set(false);
      },
      error: () => {
        this.errorMessage.set('Failed to load consultations for this doctor');
        this.isLoadingConsultations.set(false);
      },
    });
  }

  loadDoctorFollowups(): void {
    this.isLoadingFollowups.set(true);
    this.followupService.getFollowupsByDoctorId(this.doctorId()).subscribe({
      next: (res) => {
        this.followups.set(res.data || []);
        this.isLoadingFollowups.set(false);
      },
      error: () => {
        this.errorMessage.set('Failed to load follow-ups for this doctor');
        this.isLoadingFollowups.set(false);
      },
    });
  }

  setTab(tab: TabKey): void {
    this.activeTab.set(tab);
    this.selectedDateKey.set(null);
  }

  prevMonth(): void {
    const current = this.calendarMonth();
    this.calendarMonth.set(new Date(current.getFullYear(), current.getMonth() - 1, 1));
  }

  nextMonth(): void {
    const current = this.calendarMonth();
    this.calendarMonth.set(new Date(current.getFullYear(), current.getMonth() + 1, 1));
  }

  selectDay(day: CalendarDay): void {
    if (this.selectedDateKey() === day.dateKey) {
      this.selectedDateKey.set(null);
    } else {
      this.selectedDateKey.set(day.dateKey);
    }
  }

  clearDateFilter(): void {
    this.selectedDateKey.set(null);
  }

  monthLabel(): string {
    return this.calendarMonth().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  selectedDateLabel(): string {
    const key = this.selectedDateKey();
    if (!key) return '';
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }

  private toDateKey(isoDate: string): string {
    if (!isoDate) return '';
    const d = new Date(isoDate);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  calculateAge(dateOfBirth: string): number {
    if (!dateOfBirth) return 0;
    const today = new Date();
    const birth = new Date(dateOfBirth);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  }

  getPatientName(patientId: any): string {
    if (!patientId) return 'Unknown';
    if (typeof patientId === 'string') return 'Unknown';
    return patientId.name || 'Unknown';
  }

  getUrgencyClass(level: string | undefined): string {
    switch (level) {
      case 'critical':
        return 'urgent-critical';
      case 'medium':
        return 'urgent-medium';
      case 'low':
        return 'urgent-low';
      default:
        return '';
    }
  }

  goToPatientHistory(patientId: string): void {
    this.router.navigate(['/dashboard/patients/history', patientId]);
  }

  goBack(): void {
    this.router.navigate(['/dashboard/doctors']);
  }
}