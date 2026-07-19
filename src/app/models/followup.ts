export interface Followup {
  _id: string;
  consultationId?: {
    _id: string;
    doctorId?: {
      _id: string;
      name: string;
    };
    structuredNote?: string;
  };
  // بتتحدد بس بعد ما الفولو أب تتكمّل (Complete Follow-up)، وبتشاور على
  // زيارة الإكمال نفسها (مختلفة عن consultationId اللي فضلت الكونسلتيشن الأصلية)
  completionConsultationId?: {
    _id: string;
    doctorId?: {
      _id: string;
      name: string;
    };
    structuredNote?: string;
    rawInput?: string;
    symptoms?: string[];
    diagnosis?: string;
  };
  patientId?: {
    _id: string;
    name: string;
    phone?: string;
  };
  instructions: string;
  lastConsultationNote?: string; // من الباك عشان يظهر قبل Start Follow-up
  scheduledDate: string;
  reminderSent: boolean;
  status: 'pending' | 'confirmed' | 'cancelled';
  language: 'en' | 'ar';
  createdAt: string;
  updatedAt: string;
}

export interface FollowupResponse {
  success: boolean;
  data: Followup[];
  count: number;
}
