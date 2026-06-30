export type UrgencyLevel = 'low' | 'medium' | 'critical';

export interface Consultations {
  _id: string;
  patientId: string;
  doctorId: string;
  symptoms: string[];
  diagnosis: string;
  rawInput: string;
  structuredNote: string;
  urgencyLevel: UrgencyLevel;
  suggestedSpecialist: string;
  isChronic?: boolean;
  status: 'pending' | 'completed';
  language: 'en' | 'ar';
  followUpDate?: string;
  followupId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateConsultationDto {
  patientId: string;
  symptoms: string[];
  diagnosis: string;
  rawInput: string;
  language: 'en' | 'ar';
  isChronic?: boolean;
  followUpDate?: string;
  followupId?: string;
}

export interface ConsultationResponse {
  success: boolean;
  data: Consultations[];
  count: number;
}
