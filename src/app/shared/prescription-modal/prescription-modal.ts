import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';
import Swal from 'sweetalert2';
import {
  PrescriptionService,
  Medication,
  DrugSuggestion,
} from '../../services/prescription';

export interface MedicationFormState {
  _key: string;
  name: string;
  activeIngredient: string;
  dosageAmount: string;
  dosageUnit: 'mcg' | 'mg' | 'g';
  frequencyCount: string;
  frequencyPeriod: 'per day' | 'per week' | 'per month';
  isChronic: boolean;
  durationValue: string;
  durationUnit: 'days' | 'weeks' | 'months';
}

const emptyMedication = (): MedicationFormState => ({
  _key: Math.random().toString(36).slice(2),
  name: '',
  activeIngredient: '',
  dosageAmount: '',
  dosageUnit: 'mg',
  frequencyCount: '',
  frequencyPeriod: 'per day',
  isChronic: false,
  durationValue: '',
  durationUnit: 'days',
});

function calculateAge(dob?: string | null): number | null {
  if (!dob) return null;
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

/**
 * PrescriptionModal — shared standalone component used by both the
 * consultation-form ("Save Record" step) and patient-history (follow-up /
 * edit-in-place flow), matching the React PrescriptionModal exactly:
 * dynamic medication rows with FDA autocomplete + active ingredient capture,
 * structured dosage/frequency/duration fields, a chronic checkbox, and a
 * live per-medication Quick Drug Check safety panel.
 */
@Component({
  selector: 'app-prescription-modal',
  imports: [CommonModule, FormsModule],
  templateUrl: './prescription-modal.html',
  styleUrl: './prescription-modal.css',
})
export class PrescriptionModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() consultationId: string | null = null;
  @Input() patient: any = null; // { _id, name, allergies, dateOfBirth, gender }
  @Input() language: 'en' | 'ar' = 'en';
  @Input() existingPrescription: any = null; // null when creating, prescription object when editing

  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<any>();

  medications = signal<MedicationFormState[]>([emptyMedication()]);
  checkedMedications = signal<Medication[] | null>(null);
  checkingSafety = signal(false);
  isSaving = signal(false);

  // ─── Per-row drug autocomplete state (keyed by medication _key) ──────────
  suggestionsByKey: Record<string, DrugSuggestion[]> = {};
  searchingByKey: Record<string, boolean> = {};
  showSuggestionsByKey: Record<string, boolean> = {};

  private drugQuery$ = new Subject<{ key: string; query: string }>();
  private safetyCheckTimeout: any = null;
  private blurTimeouts: Record<string, any> = {};

  constructor(private prescriptionService: PrescriptionService) {
    this.drugQuery$
      .pipe(
        debounceTime(350),
        distinctUntilChanged(
          (a: { key: string; query: string }, b: { key: string; query: string }) =>
            a.key === b.key && a.query === b.query,
        ),
        switchMap(({ key, query }: { key: string; query: string }) => {
          if (!query || query.trim().length < 2) {
            this.searchingByKey[key] = false;
            return of({ key, data: [] as DrugSuggestion[] });
          }
          this.searchingByKey[key] = true;
          return this.prescriptionService
            .searchDrugs(query.trim())
            .pipe(switchMap((res: { data: DrugSuggestion[] }) => of({ key, data: res.data || [] })));
        }),
      )
      .subscribe(({ key, data }: { key: string; data: DrugSuggestion[] }) => {
        this.searchingByKey[key] = false;
        this.suggestionsByKey[key] = data;
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.isOpen) return;
    if (changes['isOpen'] || changes['existingPrescription']) {
      this.resetForm();
    }
  }

  private resetForm(): void {
    if (this.existingPrescription?.medications?.length) {
      this.medications.set(
        this.existingPrescription.medications.map((m: any) => ({
          _key: Math.random().toString(36).slice(2),
          name: m.name || '',
          activeIngredient: m.activeIngredient || '',
          dosageAmount: m.dosageAmount != null ? String(m.dosageAmount) : '',
          dosageUnit: m.dosageUnit || 'mg',
          frequencyCount: m.frequencyCount != null ? String(m.frequencyCount) : '',
          frequencyPeriod: m.frequencyPeriod || 'per day',
          isChronic: !!m.isChronic,
          durationValue: m.durationValue != null ? String(m.durationValue) : '',
          durationUnit: m.durationUnit || 'days',
        })),
      );
    } else {
      this.medications.set([emptyMedication()]);
    }
    this.checkedMedications.set(null);
    this.suggestionsByKey = {};
    this.searchingByKey = {};
    this.showSuggestionsByKey = {};
    this.runSafetyCheck();
  }

  get patientAge(): number | null {
    return calculateAge(this.patient?.dateOfBirth);
  }

  // ─── Medication row management ───────────────────────────────────────────
  addMedicationRow(): void {
    this.medications.update((list: MedicationFormState[]) => [...list, emptyMedication()]);
  }

  removeMedicationRow(index: number): void {
    this.medications.update((list: MedicationFormState[]) => list.filter((_, i) => i !== index));
    this.scheduleSafetyCheck();
  }

  updateMedication(index: number, patch: Partial<MedicationFormState>): void {
    this.medications.update((list: MedicationFormState[]) =>
      list.map((m, i) => (i === index ? { ...m, ...patch } : m)),
    );
    this.scheduleSafetyCheck();
  }

  onNameInput(index: number, value: string): void {
    const med = this.medications()[index];
    // لو الدكتور بدأ يعدل الاسم يدويًا، المادة الفعالة المحفوظة قبل كدة مش مضمون تكون صحيحة لسة
    this.updateMedication(index, { name: value, activeIngredient: '' });
    this.showSuggestionsByKey[med._key] = true;
    this.drugQuery$.next({ key: med._key, query: value });
  }

  onNameFocus(key: string): void {
    this.showSuggestionsByKey[key] = true;
  }

  onNameBlur(key: string): void {
    this.blurTimeouts[key] = setTimeout(() => {
      this.showSuggestionsByKey[key] = false;
    }, 200);
  }

  selectSuggestion(index: number, drug: DrugSuggestion): void {
    const activeIngredient =
      drug.genericName &&
      drug.genericName !== 'N/A' &&
      drug.genericName.toLowerCase() !== drug.displayName.toLowerCase()
        ? drug.genericName
        : '';
    const med = this.medications()[index];
    this.updateMedication(index, { name: drug.displayName, activeIngredient });
    this.showSuggestionsByKey[med._key] = false;
    this.suggestionsByKey[med._key] = [];
  }

  // ─── Live safety check (debounced) ───────────────────────────────────────
  private scheduleSafetyCheck(): void {
    if (this.safetyCheckTimeout) clearTimeout(this.safetyCheckTimeout);
    this.safetyCheckTimeout = setTimeout(() => this.runSafetyCheck(), 500);
  }

  private runSafetyCheck(): void {
    const validMeds = this.medications().filter((m: MedicationFormState) => m.name.trim());
    if (validMeds.length === 0 || !this.patient?._id) {
      this.checkedMedications.set(null);
      return;
    }

    this.checkingSafety.set(true);
    this.prescriptionService
      .checkPrescriptionSafety({
        patientId: this.patient._id,
        medications: validMeds.map((m: MedicationFormState) => ({
          name: m.name,
          activeIngredient: m.activeIngredient || null,
        })),
        excludePrescriptionId: this.existingPrescription?._id,
      })
      .subscribe({
        next: (res: { data?: { medications?: Medication[] } }) => {
          this.checkedMedications.set(res.data?.medications || []);
          this.checkingSafety.set(false);
        },
        error: () => {
          this.checkedMedications.set(null);
          this.checkingSafety.set(false);
        },
      });
  }

  // ─── Save ─────────────────────────────────────────────────────────────────
  private validate(): string | null {
    for (const med of this.medications()) {
      if (!med.name.trim()) return 'Every medication needs a name.';
      if (!med.dosageAmount || Number(med.dosageAmount) <= 0) {
        return `Enter a valid dosage amount for ${med.name || 'a medication'}.`;
      }
      if (!med.frequencyCount || Number(med.frequencyCount) <= 0) {
        return `Enter how many times ${med.name || 'the medication'} is taken.`;
      }
      if (!med.isChronic && (!med.durationValue || Number(med.durationValue) <= 0)) {
        return `Enter a duration for ${med.name || 'the medication'}, or mark it as chronic.`;
      }
    }
    return null;
  }

  private buildPayloadMedications(): Medication[] {
    return this.medications().map((m: MedicationFormState) => ({
      name: m.name.trim(),
      activeIngredient: m.activeIngredient?.trim() || null,
      dosageAmount: Number(m.dosageAmount),
      dosageUnit: m.dosageUnit,
      frequencyCount: Number(m.frequencyCount),
      frequencyPeriod: m.frequencyPeriod,
      isChronic: m.isChronic,
      ...(m.isChronic
        ? {}
        : { durationValue: Number(m.durationValue), durationUnit: m.durationUnit }),
    }));
  }

  save(): void {
    const validationError = this.validate();
    if (validationError) {
      Swal.fire('Incomplete medication', validationError, 'warning');
      return;
    }

    this.isSaving.set(true);
    const medications = this.buildPayloadMedications();
    const isEdit = !!this.existingPrescription;

    const request$ = isEdit
      ? this.prescriptionService.updatePrescription(this.existingPrescription._id, {
          medications,
          language: this.language,
        })
      : this.prescriptionService.createPrescription({
          consultationId: this.consultationId!,
          patientId: this.patient._id,
          medications,
          language: this.language,
        });

    request$.subscribe({
      next: (res: any) => {
        this.isSaving.set(false);
        Swal.fire({
          icon: 'success',
          title: isEdit ? 'Prescription updated' : 'Prescription saved',
          timer: 1400,
          showConfirmButton: false,
        });
        this.saved.emit(res.data);
      },
      error: (err: any) => {
        this.isSaving.set(false);
        Swal.fire('Error', err?.error?.message || 'Failed to save prescription', 'error');
      },
    });
  }

  close(): void {
    this.closed.emit();
  }
}
