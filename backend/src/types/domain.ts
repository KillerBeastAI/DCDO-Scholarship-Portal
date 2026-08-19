export type UserRole = 'admin' | 'evaluator' | 'finance_auditor';

export interface User {
  user_id: string;
  username: string;
  email: string;
  password_hash?: string;
  department: string;
  role: UserRole;
  created_at: Date;
}

export type ProviderStatus = 'active' | 'inactive' | 'suspended';

export interface TrainingProvider {
  provider_id: string;
  institution_name: string;
  email_website_fb?: string | null;
  institution_type: string;
  classification: string;
  type_of_program?: string | null;
  sector?: string | null;
  qualification_title?: string | null;
  training_duration_hours?: number | null;
  sil_duration_hours?: number | null;
  program_registration_number?: string | null;
  date_validity?: string | null;
  school_id?: string | null;
  complete_address?: string;
  contact_number?: string | null;
  status: ProviderStatus;
}

export interface ScholarshipProgram {
  program_id: string;
  program_code: string;
  program_name: string;
  fiscal_year: number;
  total_allocated: number;
  total_disbursed: number;
}

export type QMStatus = 'draft' | 'approved' | 'completed' | 'cancelled';

export interface QualificationMap {
  qm_id: string;
  program_id: string;
  provider_id: string;
  rqm_code?: string | null;
  nqm_code?: string | null;
  pqm_code?: string | null;
  sector: string;
  tvet_qualification: string;
  qualification_level: string;
  delivery_mode: string;
  total_slots: number;
  training_cost_per_capita: number;
  support_fund_per_capita: number;
  assessment_fee: number;
  total_approved_amount: number;
  status: QMStatus;
  created_at: Date;
  // Joined fields
  program_name?: string;
  institution_name?: string;
}

export interface PhysicalAccomplishment {
  accomplishment_id: string;
  qm_id: string;
  enrolled_male: number;
  enrolled_female: number;
  dropped_male: number;
  dropped_female: number;
  dropped_amount_deduction: number;
  graduated_completed_male: number;
  graduated_completed_female: number;
  graduated_pending_assessment_male: number;
  graduated_pending_assessment_female: number;
  assessed_male: number;
  assessed_female: number;
  certified_male: number;
  certified_female: number;
  employed_male: number;
  employed_female: number;
  unutilized_slots: number;
  unutilized_amount: number;
  last_updated: Date;
}

export type VerificationStatus = 'pending' | 'verified' | 'rejected' | 'returned';

export interface InternalBilling {
  billing_id: string;
  provider_id: string;
  qm_id: string;
  external_reference_no: string;
  claimed_amount: number;
  verification_status: VerificationStatus;
  recorded_by: string;
  created_at: Date;
  // Joined fields
  institution_name?: string;
  tvet_qualification?: string;
  recorded_by_name?: string;
}

export interface DashboardSummary {
  totalPrograms: number;
  totalProviders: number;
  totalAllocatedBudget: number;
  totalDisbursedBudget: number;
  totalSlots: number;
  totalEnrolled: number;
  totalCertified: number;
  billingsPending: number;
  billingsVerified: number;
  billingsPaid: number;
}
