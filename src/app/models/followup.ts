export interface Followup {
  _id: string;
  consultationId: string;
  patientId: string;
  instructions: string;
  scheduledDate: string;
  reminderSent: boolean;
  status: 'pending' | 'done';
  language: 'en' | 'ar';
  createdAt: string;
  updatedAt: string;
}

export interface FollowupResponse {
  success: boolean;
  data: Followup[];
  count: number;
}
