export type UrgencyLevel = 'low' | 'medium' | 'critical';

export interface Consultation {
  _id: string;
  patientId: string;
  doctorId: string;
  symptoms: string[];
  diagnosis: string;
  rawInput: string;
  structuredNote: string;
  urgencyLevel: UrgencyLevel;
  suggestedSpecialist: string;
  status: 'pending' | 'completed';
  language: 'en' | 'ar';
  createdAt: string;
  updatedAt: string;
}

export interface CreateConsultationDto {
  patientId: string;
  symptoms: string[];
  diagnosis: string;
  rawInput: string;
  language: 'en' | 'ar';
}

export interface ConsultationResponse {
  success: boolean;
  data: Consultation[];
  count: number;
}
