import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Subscription, of } from 'rxjs';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  map,
  switchMap,
  tap,
} from 'rxjs/operators';
import { PatientService, Patient } from '../../services/patient';
import { ReportService, GeneratedReportData, ReportMeta } from '../../services/report';
import { environment } from '../../../environments/environment';

interface DoctorOption {
  id: string;
  name: string;
  email?: string;
  specialty?: string;
}

interface ReportPatient {
  id: string;
  name: string;
  mrn: string;
  dob: string;
}

interface ReportConsultation {
  id: string;
  date: string;
  diagnosis: string;
}

interface ScopeOption {
  value: 'year' | 'month' | 'consultation';
  label: string;
}

interface MonthOption {
  value: number;
  label: string;
}

@Component({
  selector: 'app-reports-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './reports-list.html',
  styleUrl: './reports-list.css',
})
export class ReportsList implements OnInit, OnDestroy {
  reportForm: FormGroup;

  // ── Step 1: Doctor ──────────────────────────────────────────────
  doctorResults = signal<DoctorOption[]>([]);
  selectedDoctor = signal<DoctorOption | null>(null);
  isSearchingDoctors = signal(false);
  showDoctorDropdown = signal(false);

  // ── Step 2: Patient (مفلترة بالدكتور) ──────────────────────────
  patientResults: ReportPatient[] = [];
  selectedPatient: ReportPatient | null = null;
  isSearchingPatients = signal(false);
  showPatientDropdown = signal(false);

  // ── Consultation picker ─────────────────────────────────────────
  consultations: ReportConsultation[] = [];
  isLoadingConsultations = signal(false);
  consultationsError = '';

  // ── Report output ───────────────────────────────────────────────
  isGeneratingReport = signal(false);
  generateError = '';
  generatedReport: {
    data: GeneratedReportData;
    meta: ReportMeta;
    patientName: string;
    mrn: string;
    dob: string;
    generatedAt: Date;
  } | null = null;

  scopeOptions: ScopeOption[] = [
    { value: 'year', label: 'Yearly Report' },
    { value: 'month', label: 'Monthly Report' },
    { value: 'consultation', label: 'Specific Consultation' },
  ];

  monthOptions: MonthOption[] = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  yearOptions: number[] = [];

  private subs: Subscription[] = [];
  private blurDoctorTimeout?: ReturnType<typeof setTimeout>;
  private blurPatientTimeout?: ReturnType<typeof setTimeout>;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private patientService: PatientService,
    private reportService: ReportService,
  ) {
    const currentYear = new Date().getFullYear();
    for (let y = currentYear; y >= currentYear - 9; y--) this.yearOptions.push(y);

    this.reportForm = this.fb.group({
      doctorSearch: ['', Validators.required],
      doctorId: ['', Validators.required],
      patientSearch: ['', Validators.required],
      patientId: ['', Validators.required],
      scope: ['year', Validators.required],
      year: [currentYear],
      month: [new Date().getMonth() + 1],
      consultationId: [''],
    });
  }

  get f() {
    return this.reportForm.controls;
  }
  get isYearScope() {
    return this.reportForm.get('scope')?.value === 'year';
  }
  get isMonthScope() {
    return this.reportForm.get('scope')?.value === 'month';
  }
  get isSpecificConsultation() {
    return this.reportForm.get('scope')?.value === 'consultation';
  }

  ngOnInit(): void {
    this.watchDoctorSearch();
    this.watchPatientSearch();
    this.watchScopeChanges();
    this.applyScopeValidators('year');
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
    if (this.blurDoctorTimeout) clearTimeout(this.blurDoctorTimeout);
    if (this.blurPatientTimeout) clearTimeout(this.blurPatientTimeout);
  }

  // ── Doctor search ───────────────────────────────────────────────
  watchDoctorSearch(): void {
    const ctrl = this.reportForm.get('doctorSearch');
    if (!ctrl) return;

    this.subs.push(
      ctrl.valueChanges
        .pipe(
          debounceTime(300),
          distinctUntilChanged(),
          tap((v: string) => {
            if (this.selectedDoctor() && v !== this.selectedDoctor()!.name) {
              this.resetDoctorSelection();
            }
            this.isSearchingDoctors.set(true);
          }),
          switchMap((v: string) =>
            this.http.get<any>(`${environment.apiUrl}/auth/doctors`).pipe(
              map((res) => {
                const query = (v || '').toLowerCase().trim();
                const all: any[] = res.data || [];
                return query
                  ? all.filter(
                      (d) =>
                        d.name?.toLowerCase().includes(query) ||
                        d.email?.toLowerCase().includes(query),
                    )
                  : all;
              }),
              map((list) =>
                list.map(
                  (d: any): DoctorOption => ({
                    id: d._id,
                    name: d.name,
                    email: d.email,
                    specialty: d.specialty,
                  }),
                ),
              ),
              catchError(() => of([] as DoctorOption[])),
            ),
          ),
        )
        .subscribe((results) => {
          this.doctorResults.set(results);
          this.isSearchingDoctors.set(false);
        }),
    );
  }

  onDoctorSearchFocus(): void {
    if (this.blurDoctorTimeout) clearTimeout(this.blurDoctorTimeout);
    this.showDoctorDropdown.set(true);
  }

  onDoctorSearchBlur(): void {
    this.blurDoctorTimeout = setTimeout(() => this.showDoctorDropdown.set(false), 150);
  }

  selectDoctor(doctor: DoctorOption): void {
    this.selectedDoctor.set(doctor);
    this.reportForm.patchValue({ doctorId: doctor.id, doctorSearch: doctor.name });
    this.doctorResults.set([]);
    this.showDoctorDropdown.set(false);
    // reset patient لما نغير الدكتور
    this.resetPatientSelection();
  }

  private resetDoctorSelection(): void {
    this.selectedDoctor.set(null);
    this.reportForm.patchValue({ doctorId: '' });
    this.resetPatientSelection();
  }

  // ── Patient search (مفلترة بالـ doctorId) ──────────────────────
  watchPatientSearch(): void {
    const ctrl = this.reportForm.get('patientSearch');
    if (!ctrl) return;

    this.subs.push(
      ctrl.valueChanges
        .pipe(
          debounceTime(300),
          distinctUntilChanged(),
          tap((v: string) => {
            if (this.selectedPatient && v !== this.selectedPatient.name) {
              this.resetPatientSelection();
            }
            this.isSearchingPatients.set(true);
          }),
          switchMap((v: string) => {
            const doctorId = this.selectedDoctor()?.id;
            if (!doctorId) {
              this.isSearchingPatients.set(false);
              return of([]);
            }

            return this.patientService.getByDoctorId(doctorId, 1, 50).pipe(
              map((res) => {
                const query = (v || '').toLowerCase().trim();
                const all = res.data || [];
                return (query ? all.filter((p) => p.name?.toLowerCase().includes(query)) : all).map(
                  (p): ReportPatient => ({
                    id: p._id ?? '',
                    name: p.name ?? '',
                    mrn: p.phone ?? '',
                    dob: p.dateOfBirth ?? '',
                  }),
                );
              }),
              catchError(() => of([] as ReportPatient[])),
            );
          }),
        )
        .subscribe((results) => {
          this.patientResults = results;
          this.isSearchingPatients.set(false);
        }),
    );
  }

  onPatientSearchFocus(): void {
    if (this.blurPatientTimeout) clearTimeout(this.blurPatientTimeout);
    this.showPatientDropdown.set(true);
  }

  onPatientSearchBlur(): void {
    this.blurPatientTimeout = setTimeout(() => this.showPatientDropdown.set(false), 150);
  }

  selectPatient(patient: ReportPatient): void {
    this.selectedPatient = patient;
    this.reportForm.patchValue({ patientId: patient.id, patientSearch: patient.name });
    this.patientResults = [];
    this.showPatientDropdown.set(false);
    this.consultations = [];
    this.consultationsError = '';
    this.generatedReport = null;
    this.reportForm.get('consultationId')?.setValue('');

    if (this.isSpecificConsultation) {
      this.loadConsultationsForPicker(patient.id);
    }
  }

  private resetPatientSelection(): void {
    this.selectedPatient = null;
    this.patientResults = [];
    this.reportForm.patchValue({ patientId: '', patientSearch: '' });
    this.consultations = [];
    this.consultationsError = '';
    this.generatedReport = null;
    this.reportForm.get('consultationId')?.setValue('');
  }

  // ── Consultation picker ─────────────────────────────────────────
  loadConsultationsForPicker(patientId: string): void {
    this.isLoadingConsultations.set(true);
    this.consultations = [];
    this.consultationsError = '';

    this.patientService
      .getHistory(patientId)
      .pipe(
        map((res) =>
          (res.data?.history || []).map((c) => ({
            id: c.consultationId,
            date: c.date,
            diagnosis: c.diagnosis,
          })),
        ),
        catchError(() => {
          this.consultationsError = 'Failed to load consultations.';
          return of([] as ReportConsultation[]);
        }),
      )
      .subscribe({
        next: (list) => {
          this.consultations = list;
          this.isLoadingConsultations.set(false);
        },
      });
  }

  selectConsultation(c: ReportConsultation): void {
    this.reportForm.get('consultationId')?.setValue(c.id);
  }

  // ── Scope ───────────────────────────────────────────────────────
  watchScopeChanges(): void {
    this.subs.push(
      this.reportForm.get('scope')!.valueChanges.subscribe((v) => {
        this.applyScopeValidators(v);
        this.generatedReport = null;
        if (
          v === 'consultation' &&
          this.selectedPatient &&
          this.consultations.length === 0 &&
          !this.isLoadingConsultations()
        ) {
          this.loadConsultationsForPicker(this.selectedPatient.id);
        }
      }),
    );
  }

  private applyScopeValidators(scope: string): void {
    const year = this.reportForm.get('year');
    const month = this.reportForm.get('month');
    const cid = this.reportForm.get('consultationId');
    year?.clearValidators();
    month?.clearValidators();
    cid?.clearValidators();
    if (scope === 'year') year?.setValidators([Validators.required]);
    else if (scope === 'month') {
      year?.setValidators([Validators.required]);
      month?.setValidators([Validators.required]);
    } else cid?.setValidators([Validators.required]);
    year?.updateValueAndValidity();
    month?.updateValueAndValidity();
    cid?.updateValueAndValidity();
  }

  // ── Generate ────────────────────────────────────────────────────
  generateReport(): void {
    if (!this.selectedPatient) {
      this.generateError = 'Please select a patient.';
      return;
    }
    this.isGeneratingReport.set(true);
    this.generateError = '';
    this.generatedReport = null;

    const scope = this.reportForm.get('scope')?.value as 'year' | 'month' | 'consultation';
    const year = this.reportForm.get('year')?.value;
    const month = this.reportForm.get('month')?.value;
    const consultationId = this.reportForm.get('consultationId')?.value;

    this.reportService
      .generate({ patientId: this.selectedPatient.id, scope, year, month, consultationId })
      .subscribe({
        next: (res) => {
          this.isGeneratingReport.set(false);
          if (!res.success) {
            this.generateError = res.message || 'Failed to generate report.';
            return;
          }
          if (res.empty || !res.data) {
            this.generateError =
              res.message || 'No consultations found in the selected time range.';
            return;
          }
          this.generatedReport = {
            data: res.data,
            meta: res.meta,
            patientName: this.selectedPatient!.name,
            mrn: this.selectedPatient!.mrn,
            dob: this.selectedPatient!.dob,
            generatedAt: new Date(res.meta.generatedAt),
          };
        },
        error: (err) => {
          this.isGeneratingReport.set(false);
          this.generateError = err?.error?.message || 'Failed to generate report.';
        },
      });
  }

  formatDate(value: string): string {
    if (!value) return '';
    const d = new Date(value);
    return isNaN(d.getTime()) ? value : d.toLocaleDateString();
  }

  resetForm(): void {
    const currentYear = new Date().getFullYear();
    this.reportForm.reset({
      doctorSearch: '',
      doctorId: '',
      patientSearch: '',
      patientId: '',
      scope: 'year',
      year: currentYear,
      month: new Date().getMonth() + 1,
      consultationId: '',
    });
    this.applyScopeValidators('year');
    this.selectedDoctor.set(null);
    this.selectedPatient = null;
    this.doctorResults.set([]);
    this.patientResults = [];
    this.consultations = [];
    this.consultationsError = '';
    this.generatedReport = null;
    this.generateError = '';
  }

  printReport(): void {
    window.print();
  }
}
