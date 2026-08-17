export type UserRole = 'admin' | 'evaluator' | 'finance_auditor';

export interface User {
  user_id: string;
  username: string;
  email: string;
  password_plain?: string | null;
  department: string;
  role: UserRole;
  created_at?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
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
  date_of_expiration?: string | null;
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
  appropriation?: string;
  fiscal_year?: string;
  allocation?: string;
  sector: string;
  tvet_qualification: string;
  qualification_level?: string;
  delivery_mode?: string;
  total_slots: number;
  training_cost_per_capita: number;
  support_fund_per_capita: number;
  assessment_fee?: number;
  book_allowance?: number;
  new_normal_assistance?: number;
  annual_accident_insurance?: number;
  entrepreneurship_fee?: number;
  total_training_cost?: number;
  total_support_fund?: number;
  total_book_allowance?: number;
  total_new_normal_assistance?: number;
  total_annual_accident_insurance?: number;
  total_entrepreneurship_fee?: number;
  total_approved_amount: number;
  status?: QMStatus;
  created_at: string;
  program_name?: string;
  institution_name?: string;
}

export interface ScholarshipProgramSummary {
  fiscal_year: string | number;
  program_name: string;
  approved_slots: number;
  amount: number;
  enrolled: number;
  dropouts: number;
  graduates: number;
  assessed: number;
  employed: number;
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
  last_updated: string;
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
  created_at: string;
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
  totalGraduates?: number;
  totalCertified: number;
  totalAssessed?: number;
  totalDropouts?: number;
  totalEmployed?: number;
  billingsPending: number;
  billingsVerified: number;
  billingsPaid: number;
}
