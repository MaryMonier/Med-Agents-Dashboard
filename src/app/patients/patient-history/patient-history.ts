import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';
import { PatientService, IPatientHistory } from '../../services/patient';
import { PrescriptionService, Medication } from '../../services/prescription';
import { ConsultationService } from '../../services/consultation';
import { FollowupService } from '../../services/followup';
import Swal from 'sweetalert2';

interface ActiveDrug {
  name: string;
  source: 'current' | 'history'; // من الروشتة الحالية ولا من الهيستوري
}

@Component({
  selector: 'app-patient-history',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './patient-history.html',
  styleUrl: './patient-history.css',
})
export class PatientHistory implements OnInit {
  patientId = signal('');
  consultationId = signal('');
  followupId = signal('');
  followupInstructions = signal('');
  data = signal<IPatientHistory | null>(null);
  isLoading = signal(false);
  errorMessage = signal('');

  // ─── New Consultation Form ───────────────────────────────────────────────
  symptoms = signal('');
  diagnosis = signal('');
  rawInput = signal('');
  language = signal<'en' | 'ar'>('en');
  followUpDate = signal('');
  isCreatingConsultation = signal(false);

  // لو فيه followupId في الـ URL → فورم "Add Follow-up"
  // لو فيه consultationId في الـ URL → فورم "Add Prescription"
  // لو مفيش حاجة → فورم "Add Consultation" (default)
  isFollowupMode = computed(() => !!this.followupId() && !this.consultationId());
  showConsultationForm = computed(() => !this.consultationId());
  showPrescriptionForm = computed(() => !!this.consultationId());

  // ─── Prescription Form ───────────────────────────────────────────────────
  medications = signal<Medication[]>([]);

  // ─── Drug Autocomplete ────────────────────────────────────────────────────
  drugQuery = signal('');
  drugGenericName = signal(''); // بنحفظ الاسم العلمي عشان نستخدمه في فحص الحساسية
  drugSuggestions = signal<any[]>([]);
  isSuggesting = signal(false);
  showSuggestions = signal(false);
  private drugQuery$ = new Subject<string>();

  // ─── Medication Fields ────────────────────────────────────────────────────
  dose = signal('');
  frequency = signal('');
  durationValue = signal<number | null>(null);
  durationUnit = signal<'days' | 'weeks' | 'months'>('days');
  isChronic = signal(false);

  // ─── Real-time Safety Check ───────────────────────────────────────────────
  isChecking = signal(false);
  currentIssue = signal<string | null>(null);

  isSubmitting = signal(false);

  constructor(
    private patientService: PatientService,
    private prescriptionService: PrescriptionService,
    private consultationService: ConsultationService,
    private followupService: FollowupService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.params['id'];
    this.patientId.set(id);
    this.loadHistory();

    this.route.queryParamMap.subscribe((params) => {
      const consultationId = params.get('consultationId') || '';
      const followupId = params.get('followupId') || '';
      this.consultationId.set(consultationId);
      this.followupId.set(followupId);

      // لو فيه followupId، نجيب الـ instructions من الباك عشان نعرضها
      if (followupId) {
        this.loadFollowupInstructions(followupId);
      }
    });

    // ─── Autocomplete pipeline ────────────────────────────────────────────
    this.drugQuery$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((query) => {
          if (!query || query.trim().length < 2) {
            this.isSuggesting.set(false);
            return of({ data: [] });
          }
          this.isSuggesting.set(true);
          return this.prescriptionService.searchDrugs(query.trim());
        }),
      )
      .subscribe({
        next: (res: any) => {
          this.drugSuggestions.set(res.data || []);
          this.isSuggesting.set(false);
        },
        error: () => {
          this.isSuggesting.set(false);
        },
      });
  }

  loadFollowupInstructions(followupId: string): void {
    this.followupService.getFollowupById(followupId).subscribe({
      next: (res: any) => {
        this.followupInstructions.set(res?.data?.instructions || '');
      },
      error: () => {
        this.followupInstructions.set('');
      },
    });
  }

  loadHistory(): void {
    this.isLoading.set(true);
    this.patientService.getHistory(this.patientId()).subscribe({
      next: (res) => {
        this.data.set(res.data);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Failed to load patient history');
        this.isLoading.set(false);
      },
    });
  }

  // ─── Create Consultation ─────────────────────────────────────────────────
  createConsultation(): void {
    const symptomsArr = this.symptoms()
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (symptomsArr.length === 0 || !this.rawInput().trim()) {
      Swal.fire('Error', 'Please fill symptoms and the consultation note', 'error');
      return;
    }

    this.isCreatingConsultation.set(true);

    const payload: any = {
      patientId: this.patientId(),
      symptoms: symptomsArr,
      diagnosis: this.diagnosis().trim(),
      rawInput: this.rawInput().trim(),
      language: this.language(),
    };

    if (this.followUpDate()) {
      payload.followUpDate = this.followUpDate();
    }

    // لو كنا في فولو أب mode، نبعت الـ followupId للباك عشان يغير الـ status لـ confirmed
    if (this.followupId()) {
      payload.followupId = this.followupId();
    }

    this.consultationService.create(payload).subscribe({
      next: (res: any) => {
        this.isCreatingConsultation.set(false);
        const newId = res?.data?._id;
        if (newId) {
          this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { consultationId: newId },
            queryParamsHandling: 'merge',
          });
          // صفر الـ followupId من الـ URL لأننا خلصنا منه
          setTimeout(() => {
            this.router.navigate([], {
              relativeTo: this.route,
              queryParams: { consultationId: newId, followupId: null },
              queryParamsHandling: 'merge',
            });
          }, 0);
        }
        this.followupId.set('');
        this.followupInstructions.set('');
        Swal.fire('Success!', 'Consultation created. You can now add a prescription.', 'success');
        this.loadHistory();
      },
      error: (err) => {
        this.isCreatingConsultation.set(false);
        const msg = err?.error?.message || 'Failed to create consultation.';
        Swal.fire('Error', msg, 'error');
      },
    });
  }

  calculateAge(dateOfBirth: string): number {
    const today = new Date();
    const birth = new Date(dateOfBirth);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  }

  urgencyClass(level: string): string {
    return 'urgency-' + (level || 'low').toLowerCase();
  }

  goBack(): void {
    this.router.navigate(['/dashboard/patients']);
  }

  // ─── Drug Autocomplete ────────────────────────────────────────────────────
  onDrugInput(value: string): void {
    this.drugQuery.set(value);
    this.drugGenericName.set(''); // الدكتور بيكتب يدوي، مفيش اسم علمي معروف لحد ما يختار من القايمة
    this.showSuggestions.set(true);
    this.currentIssue.set(null);
    this.drugQuery$.next(value);
  }

  selectDrug(drug: any): void {
    const name = drug.brandName !== 'N/A' ? drug.brandName : drug.genericName;
    this.drugQuery.set(name);
    this.drugGenericName.set(drug.genericName || '');
    this.drugSuggestions.set([]);
    this.showSuggestions.set(false);
    this.runSafetyCheck(name, drug.genericName || '');
  }

  hideSuggestionsDelayed(): void {
    // delay عشان نسمح للـ click event يحصل قبل ما الـ blur يقفل القايمة
    setTimeout(() => this.showSuggestions.set(false), 150);
  }

  // ─── Figure out which drugs from history are still active ───────────────
  private getActiveDrugsFromHistory(): ActiveDrug[] {
    const history = this.data()?.history || [];
    const active: ActiveDrug[] = [];
    const now = new Date();

    for (const item of history) {
      const prescription = item.prescription;
      if (!prescription) continue;

      for (const med of prescription.medications) {
        const durationText = (med.duration || med.dose || '').toString().toLowerCase();
        const isChronicText = durationText.includes('forever') || durationText.includes('chronic');

        if (isChronicText) {
          active.push({ name: med.name, source: 'history' });
          continue;
        }

        // نحاول نحسب تاريخ الانتهاء من المدة + تاريخ الكونسلتيشن
        const days = this.parseDurationToDays(durationText);
        if (days === null) {
          // مش عارفين نحسب المدة، نعتبره شغال احتياطياً (أأمن للدكتور)
          active.push({ name: med.name, source: 'history' });
          continue;
        }

        const startDate = new Date(item.date);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + days);

        if (endDate >= now) {
          active.push({ name: med.name, source: 'history' });
        }
      }
    }

    return active;
  }

  private parseDurationToDays(text: string): number | null {
    const match = text.match(/(\d+)\s*(day|week|month)/);
    if (!match) return null;

    const num = parseInt(match[1], 10);
    const unit = match[2];

    if (unit.startsWith('day')) return num;
    if (unit.startsWith('week')) return num * 7;
    if (unit.startsWith('month')) return num * 30;
    return null;
  }

  // ─── Real-time Safety Check ───────────────────────────────────────────────
  private runSafetyCheck(newDrugName: string, newDrugGeneric: string = ''): void {
    if (!newDrugName) return;

    // الأدوية الشغالة من الروشتة الحالية
    const currentMeds: ActiveDrug[] = this.medications().map((m) => ({
      name: m.name,
      source: 'current',
    }));

    // الأدوية الشغالة من الهيستوري (باستثناء الـ chronic اللي علمنا عليها يدوي بالفعل موجودة)
    const historyMeds = this.getActiveDrugsFromHistory();

    const activeMedications = [...currentMeds, ...historyMeds];

    this.isChecking.set(true);
    this.currentIssue.set(null);

    const allergies = this.data()?.patient?.allergies || [];
    const dob = this.data()?.patient?.dateOfBirth;
    const patientAge = dob ? this.calculateAge(dob) : null;
    const patientGender = this.data()?.patient?.gender || null;

    // بنبعت الاسم العلمي مع الاسم التجاري عشان فحص الحساسية يشتغل
    // حتى لو الدكتور دوّس على اسم تجاري (Brand Name) غير اسم المادة الفعالة
    const drugLabel =
      newDrugGeneric && newDrugGeneric !== newDrugName
        ? `${newDrugName} (${newDrugGeneric})`
        : newDrugName;

    this.prescriptionService
      .quickDrugCheck({
        newDrug: { name: drugLabel },
        activeMedications: activeMedications.map((m) => ({ name: m.name })),
        allergies,
        patientAge,
        patientGender,
        language: 'en',
      })
      .subscribe({
        next: (res: any) => {
          this.isChecking.set(false);
          if (res.data?.hasIssue) {
            this.currentIssue.set(res.data.message);
          } else {
            this.currentIssue.set(null);
          }
        },
        error: () => {
          this.isChecking.set(false);
        },
      });
  }

  // ─── Add Medication to List ───────────────────────────────────────────────
  addMedication(): void {
    const name = this.drugQuery().trim();

    if (!name || !this.dose().trim() || !this.frequency().trim()) {
      Swal.fire('Error', 'Please fill drug name, dose, and frequency', 'error');
      return;
    }

    if (!this.isChronic() && !this.durationValue()) {
      Swal.fire('Error', 'Please enter duration or mark as chronic', 'error');
      return;
    }

    const durationText = this.isChronic()
      ? 'chronic'
      : `${this.durationValue()} ${this.durationUnit()}`;

    const newMed: Medication = {
      name,
      dose: this.dose().trim(),
      frequency: this.frequency().trim(),
      duration: durationText,
    };

    this.medications.update((list) => [...list, newMed]);

    // reset fields
    this.drugQuery.set('');
    this.drugGenericName.set('');
    this.dose.set('');
    this.frequency.set('');
    this.durationValue.set(null);
    this.durationUnit.set('days');
    this.isChronic.set(false);
    this.currentIssue.set(null);
    this.drugSuggestions.set([]);
  }

  removeMedication(index: number): void {
    this.medications.update((list) => list.filter((_, i) => i !== index));
  }

  // ─── Submit Prescription ──────────────────────────────────────────────────
  submitPrescription(): void {
    if (!this.medications().length) {
      Swal.fire('Error', 'Please add at least one medication', 'error');
      return;
    }

    if (!this.consultationId()) {
      Swal.fire('Error', 'Missing consultation ID', 'error');
      return;
    }

    this.isSubmitting.set(true);

    this.prescriptionService
      .createPrescription({
        consultationId: this.consultationId(),
        patientId: this.patientId(),
        language: 'en',
        medications: this.medications(),
      })
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.medications.set([]);

          // نفضي الـ consultationId من الـ signal والـ URL
          // عشان فورم الـ "New Consultation" يظهر تاني بدل فورم الروشتة
          this.consultationId.set('');
          this.router.navigate([], {
            relativeTo: this.route,
            queryParams: {},
          });

          // نصفر فورم الكونسلتيشن كمان عشان يبتدي فاضي
          this.symptoms.set('');
          this.diagnosis.set('');
          this.rawInput.set('');
          this.followUpDate.set('');

          Swal.fire('Success!', 'Prescription created successfully.', 'success');
          this.loadHistory();
        },
        error: () => {
          this.isSubmitting.set(false);
          Swal.fire('Error', 'Failed to create prescription.', 'error');
        },
      });
  }
}
