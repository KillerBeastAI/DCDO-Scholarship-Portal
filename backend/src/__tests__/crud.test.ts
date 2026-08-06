import { jest, describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';

// ─────────────────────────────────────────────────────────────────────────────
// Shared mock fixtures
// ─────────────────────────────────────────────────────────────────────────────
const MOCK_USER_ID = 'a0000000-0000-0000-0000-000000000001';
const MOCK_EVAL_ID = 'a0000000-0000-0000-0000-000000000002';
const MOCK_FINANCE_ID = 'a0000000-0000-0000-0000-000000000003';

const MOCK_PROVIDER_ID = 'b0000000-0000-0000-0000-000000000001';
const MOCK_PROGRAM_ID = 'c0000000-0000-0000-0000-000000000001';
const MOCK_QM_ID = 'd0000000-0000-0000-0000-000000000001';
const MOCK_BILLING_ID = 'e0000000-0000-0000-0000-000000000001';

const MOCK_PROVIDER = {
  provider_id: MOCK_PROVIDER_ID,
  institution_name: 'Test TVET Center',
  institution_type: 'Private',
  classification: 'TVET',
  school_id: null,
  complete_address: '123 Main St, Davao City',
  contact_number: '082-000-0001',
  status: 'active',
};

const MOCK_PROGRAM = {
  program_id: MOCK_PROGRAM_ID,
  program_code: 'PROG-2025-001',
  program_name: 'TESDA Scholarship 2025',
  fiscal_year: 2025,
  total_allocated: 5000000,
  total_disbursed: 1200000,
};

const MOCK_QM = {
  qm_id: MOCK_QM_ID,
  program_id: MOCK_PROGRAM_ID,
  provider_id: MOCK_PROVIDER_ID,
  rqm_code: 'RQM-001',
  nqm_code: null,
  pqm_code: null,
  sector: 'ICT',
  tvet_qualification: 'Computer Systems Servicing NC II',
  qualification_level: 'NC II',
  delivery_mode: 'Institution-Based',
  total_slots: 30,
  training_cost_per_capita: 15000,
  support_fund_per_capita: 2000,
  assessment_fee: 500,
  total_approved_amount: 525000,
  status: 'approved',
  created_at: new Date(),
  program_name: MOCK_PROGRAM.program_name,
  institution_name: MOCK_PROVIDER.institution_name,
};

const MOCK_ACCOMPLISHMENT = {
  accomplishment_id: 'f0000000-0000-0000-0000-000000000001',
  qm_id: MOCK_QM_ID,
  enrolled_male: 15,
  enrolled_female: 10,
  dropped_male: 0,
  dropped_female: 0,
  dropped_amount_deduction: 0,
  graduated_completed_male: 14,
  graduated_completed_female: 9,
  graduated_pending_assessment_male: 1,
  graduated_pending_assessment_female: 1,
  assessed_male: 14,
  assessed_female: 9,
  certified_male: 13,
  certified_female: 8,
  employed_male: 10,
  employed_female: 7,
  unutilized_slots: 5,
  unutilized_amount: 87500,
  last_updated: new Date(),
};

const MOCK_BILLING = {
  billing_id: MOCK_BILLING_ID,
  provider_id: MOCK_PROVIDER_ID,
  qm_id: MOCK_QM_ID,
  external_reference_no: 'REF-2025-0001',
  claimed_amount: 450000,
  verification_status: 'pending',
  recorded_by: MOCK_EVAL_ID,
  created_at: new Date(),
  institution_name: MOCK_PROVIDER.institution_name,
  tvet_qualification: MOCK_QM.tvet_qualification,
  recorded_by_name: 'eval.santos',
};

const MOCK_DASHBOARD_SUMMARY = {
  totalPrograms: 5,
  totalProviders: 12,
  totalAllocatedBudget: 25000000,
  totalDisbursedBudget: 8000000,
  totalSlots: 500,
  totalEnrolled: 480,
  totalCertified: 400,
  billingsPending: 3,
  billingsVerified: 10,
  billingsPaid: 10,
};

// ─────────────────────────────────────────────────────────────────────────────
// DB Mock — intercepts SQL queries and returns fixture data
// ─────────────────────────────────────────────────────────────────────────────
jest.mock('../config/db.js', () => ({
  pool: {
    query: jest.fn(async (text: string, params?: unknown[]) => {
      // ── Training Providers ──
      if (text.includes('FROM training_providers') && text.includes('WHERE') && params?.[0] && params[0] !== MOCK_PROVIDER_ID) {
        // Unknown provider ID — simulate NOT FOUND
        if (String(params[0]).includes('unknown')) {
          return { rows: [], rowCount: 0 };
        }
      }
      if (text.includes('FROM training_providers') && text.includes('WHERE tp.provider_id = $1')) {
        const id = params?.[0];
        return { rows: id === MOCK_PROVIDER_ID ? [MOCK_PROVIDER] : [], rowCount: id === MOCK_PROVIDER_ID ? 1 : 0 };
      }
      if (text.includes('FROM training_providers') && text.includes('WHERE provider_id = $1')) {
        const id = params?.[0];
        return { rows: id === MOCK_PROVIDER_ID ? [MOCK_PROVIDER] : [], rowCount: id === MOCK_PROVIDER_ID ? 1 : 0 };
      }
      if (text.includes('FROM training_providers') && !text.includes('WHERE')) {
        return { rows: [MOCK_PROVIDER], rowCount: 1 };
      }
      if (text.includes('FROM training_providers')) {
        return { rows: [MOCK_PROVIDER], rowCount: 1 };
      }
      if (text.includes('INSERT INTO training_providers')) {
        return { rows: [MOCK_PROVIDER], rowCount: 1 };
      }
      if (text.includes('UPDATE training_providers')) {
        return { rows: [MOCK_PROVIDER], rowCount: 1 };
      }
      if (text.includes('DELETE FROM training_providers')) {
        return { rows: [], rowCount: 1 };
      }

      // ── Scholarship Programs ──
      if (text.includes('FROM scholarship_programs') && text.includes('WHERE program_id = $1')) {
        const id = params?.[0];
        return { rows: id === MOCK_PROGRAM_ID ? [MOCK_PROGRAM] : [], rowCount: id === MOCK_PROGRAM_ID ? 1 : 0 };
      }
      if (text.includes('LOWER(program_code)')) {
        // Simulate no duplicate program code found — always allow creation
        return { rows: [], rowCount: 0 };
      }
      if (text.includes('INSERT INTO scholarship_programs')) {
        return { rows: [MOCK_PROGRAM], rowCount: 1 };
      }
      if (text.includes('UPDATE scholarship_programs')) {
        return { rows: [MOCK_PROGRAM], rowCount: 1 };
      }
      if (text.includes('FROM scholarship_programs') && !text.includes('COUNT') && !text.includes('SUM')) {
        return { rows: [MOCK_PROGRAM], rowCount: 1 };
      }

      // ── Qualification Maps ──
      if (text.includes('FROM qualification_maps') && text.includes('WHERE qm.qm_id = $1')) {
        const id = params?.[0];
        return { rows: id === MOCK_QM_ID ? [MOCK_QM] : [], rowCount: id === MOCK_QM_ID ? 1 : 0 };
      }
      if (text.includes('INSERT INTO qualification_maps')) {
        return { rows: [MOCK_QM], rowCount: 1 };
      }
      if (text.includes('UPDATE qualification_maps')) {
        return { rows: [MOCK_QM], rowCount: 1 };
      }
      if (text.includes('FROM qualification_maps')) {
        return { rows: [MOCK_QM], rowCount: 1 };
      }
      if (text.includes('DELETE FROM qualification_maps')) {
        return { rows: [], rowCount: 1 };
      }

      // ── Physical Accomplishments ──
      if (text.includes('FROM physical_accomplishments') && text.includes('WHERE qm_id = $1')) {
        const id = params?.[0];
        return { rows: id === MOCK_QM_ID ? [MOCK_ACCOMPLISHMENT] : [], rowCount: id === MOCK_QM_ID ? 1 : 0 };
      }
      if (text.includes('UPDATE physical_accomplishments')) {
        return { rows: [MOCK_ACCOMPLISHMENT], rowCount: 1 };
      }
      if (text.includes('INSERT INTO physical_accomplishments')) {
        return { rows: [MOCK_ACCOMPLISHMENT], rowCount: 1 };
      }
      if (text.includes('FROM physical_accomplishments')) {
        return { rows: [MOCK_ACCOMPLISHMENT], rowCount: 1 };
      }

      // ── Internal Billings ──
      if (text.includes('FROM internal_billings') && text.includes('WHERE b.billing_id = $1')) {
        const id = params?.[0];
        return { rows: id === MOCK_BILLING_ID ? [MOCK_BILLING] : [], rowCount: id === MOCK_BILLING_ID ? 1 : 0 };
      }
      if (text.includes('INSERT INTO internal_billings')) {
        return { rows: [MOCK_BILLING], rowCount: 1 };
      }
      if (text.includes('UPDATE internal_billings') && text.includes('SET verification_status')) {
        const status = params?.[0];
        return { rows: [{ ...MOCK_BILLING, verification_status: status }], rowCount: 1 };
      }
      if (text.includes('UPDATE internal_billings')) {
        return { rows: [MOCK_BILLING], rowCount: 1 };
      }
      if (text.includes('DELETE FROM internal_billings')) {
        return { rows: [], rowCount: 1 };
      }
      if (text.includes('FROM internal_billings')) {
        return { rows: [MOCK_BILLING], rowCount: 1 };
      }

      // ── Dashboard ──
      if (text.includes('COUNT(*)') && text.includes('FROM scholarship_programs')) {
        return { rows: [{ count: '5', total_allocated: '25000000', total_disbursed: '8000000' }] };
      }
      if (text.includes('COUNT(*)') && text.includes('FROM training_providers')) {
        return { rows: [{ count: '12' }] };
      }
      if (text.includes('SUM(total_slots)')) {
        return { rows: [{ total_slots: '500' }] };
      }
      if (text.includes('total_enrolled')) {
        return { rows: [{ total_enrolled: '480', total_certified: '400' }] };
      }
      if (text.includes('GROUP BY verification_status') && text.includes('COUNT')) {
        return { rows: [{ verification_status: 'pending', count: '3' }, { verification_status: 'verified', count: '10' }] };
      }
      if (text.includes('budget-by-program') || (text.includes('program_code') && text.includes('ORDER BY fiscal_year'))) {
        return { rows: [MOCK_PROGRAM] };
      }
      if (text.includes('SUM(claimed_amount)') || text.includes('total_amount')) {
        return { rows: [{ status: 'pending', count: 3, total_amount: 1350000 }] };
      }

      // ── Auth queries ──
      if (text.includes('WHERE email = $1')) {
        return { rows: [], rowCount: 0 };
      }
      if (text.includes('WHERE user_id = $1')) {
        return { rows: [], rowCount: 0 };
      }

      // Health check
      if (text.includes('SELECT 1')) {
        return { rows: [{ '?column?': 1 }], rowCount: 1 };
      }

      return { rows: [], rowCount: 0 };
    }),
    end: jest.fn(async () => undefined),
    on: jest.fn(),
  },
  checkDatabaseHealth: jest.fn(async () => true),
}));

// ─────────────────────────────────────────────────────────────────────────────
// Import app + token utility AFTER mocking DB
// ─────────────────────────────────────────────────────────────────────────────
import app from '../index.js';
import { generateAccessToken } from '../utils/token.js';

// ── Helper: generate tokens ────────────────────────────────────────────────
function makeToken(role: 'admin' | 'evaluator' | 'finance_auditor', userId: string = MOCK_USER_ID) {
  return generateAccessToken({
    userId,
    email: `${role}@davao.gov.ph`,
    role,
    username: role,
    department: 'Test Dept',
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Test suites
// ─────────────────────────────────────────────────────────────────────────────
describe('CRUD API — Training Providers', () => {
  let adminToken: string;
  let evalToken: string;

  beforeAll(() => {
    adminToken = makeToken('admin');
    evalToken = makeToken('evaluator', MOCK_EVAL_ID);
  });

  it('GET /api/v1/training-providers — returns list (authenticated)', async () => {
    const res = await request(app)
      .get('/api/v1/training-providers')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
  });

  it('GET /api/v1/training-providers — requires authentication', async () => {
    const res = await request(app).get('/api/v1/training-providers');
    expect(res.status).toBe(401);
  });

  it('GET /api/v1/training-providers/:id — returns provider for valid ID', async () => {
    const res = await request(app)
      .get(`/api/v1/training-providers/${MOCK_PROVIDER_ID}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.provider_id).toBe(MOCK_PROVIDER_ID);
  });

  it('GET /api/v1/training-providers/:id — 404 for unknown ID', async () => {
    const res = await request(app)
      .get('/api/v1/training-providers/unknown-id')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });

  it('POST /api/v1/training-providers — admin can create', async () => {
    const res = await request(app)
      .post('/api/v1/training-providers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        institution_name: 'New TVET Center',
        institution_type: 'Private',
        classification: 'TVET',
        complete_address: '456 Other St, Davao City',
      });
    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('provider_id');
  });

  it('POST /api/v1/training-providers — evaluator can create', async () => {
    const res = await request(app)
      .post('/api/v1/training-providers')
      .set('Authorization', `Bearer ${evalToken}`)
      .send({
        institution_name: 'Another TVET Center',
        institution_type: 'Public',
        classification: 'TVET',
        complete_address: '789 Test Ave, Davao City',
      });
    expect(res.status).toBe(201);
  });

  it('DELETE /api/v1/training-providers/:id — admin can delete', async () => {
    const res = await request(app)
      .delete(`/api/v1/training-providers/${MOCK_PROVIDER_ID}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toContain('deleted successfully');
  });

  it('DELETE /api/v1/training-providers/:id — evaluator cannot delete (403)', async () => {
    const res = await request(app)
      .delete(`/api/v1/training-providers/${MOCK_PROVIDER_ID}`)
      .set('Authorization', `Bearer ${evalToken}`);
    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('CRUD API — Scholarship Programs', () => {
  let adminToken: string;
  let evalToken: string;

  beforeAll(() => {
    adminToken = makeToken('admin');
    evalToken = makeToken('evaluator', MOCK_EVAL_ID);
  });

  it('GET /api/v1/scholarship-programs — returns list', async () => {
    const res = await request(app)
      .get('/api/v1/scholarship-programs')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
  });

  it('GET /api/v1/scholarship-programs/:id — returns program for valid ID', async () => {
    const res = await request(app)
      .get(`/api/v1/scholarship-programs/${MOCK_PROGRAM_ID}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.program_code).toBe('PROG-2025-001');
  });

  it('GET /api/v1/scholarship-programs/:id — 404 for unknown ID', async () => {
    const res = await request(app)
      .get('/api/v1/scholarship-programs/unknown-id')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });

  it('POST /api/v1/scholarship-programs — admin can create', async () => {
    const res = await request(app)
      .post('/api/v1/scholarship-programs')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        program_code: 'PROG-2025-002',
        program_name: 'New Scholarship 2025',
        fiscal_year: 2025,
        total_allocated: 3000000,
      });
    expect(res.status).toBe(201);
  });

  it('POST /api/v1/scholarship-programs — evaluator can create', async () => {
    const res = await request(app)
      .post('/api/v1/scholarship-programs')
      .set('Authorization', `Bearer ${evalToken}`)
      .send({
        program_code: 'PROG-2025-003',
        program_name: 'Eval Program 2025',
        fiscal_year: 2025,
      });
    expect(res.status).toBe(201);
  });

  it('DELETE /api/v1/scholarship-programs/:id — evaluator cannot delete (403)', async () => {
    const res = await request(app)
      .delete(`/api/v1/scholarship-programs/${MOCK_PROGRAM_ID}`)
      .set('Authorization', `Bearer ${evalToken}`);
    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('CRUD API — Qualification Maps', () => {
  let adminToken: string;

  beforeAll(() => {
    adminToken = makeToken('admin');
  });

  it('GET /api/v1/qualification-maps — returns list', async () => {
    const res = await request(app)
      .get('/api/v1/qualification-maps')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
  });

  it('GET /api/v1/qualification-maps/:id — returns QM for valid ID', async () => {
    const res = await request(app)
      .get(`/api/v1/qualification-maps/${MOCK_QM_ID}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.qm_id).toBe(MOCK_QM_ID);
  });

  it('GET /api/v1/qualification-maps/:id — 404 for unknown ID', async () => {
    const res = await request(app)
      .get('/api/v1/qualification-maps/unknown-id')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('CRUD API — Physical Accomplishments', () => {
  let adminToken: string;
  let evalToken: string;

  beforeAll(() => {
    adminToken = makeToken('admin');
    evalToken = makeToken('evaluator', MOCK_EVAL_ID);
  });

  it('GET /api/v1/accomplishments — returns list', async () => {
    const res = await request(app)
      .get('/api/v1/accomplishments')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
  });

  it('GET /api/v1/accomplishments/:qm_id — returns record for valid QM ID', async () => {
    const res = await request(app)
      .get(`/api/v1/accomplishments/${MOCK_QM_ID}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.qm_id).toBe(MOCK_QM_ID);
  });

  it('PUT /api/v1/accomplishments/:qm_id — evaluator can upsert', async () => {
    const res = await request(app)
      .put(`/api/v1/accomplishments/${MOCK_QM_ID}`)
      .set('Authorization', `Bearer ${evalToken}`)
      .send({
        enrolled_male: 16,
        enrolled_female: 11,
        dropped_male: 0,
        dropped_female: 0,
      });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('qm_id');
  });

  it('PUT /api/v1/accomplishments/:qm_id — rejects negative field values (400)', async () => {
    const res = await request(app)
      .put(`/api/v1/accomplishments/${MOCK_QM_ID}`)
      .set('Authorization', `Bearer ${evalToken}`)
      .send({ enrolled_male: -5 });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('non-negative');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('CRUD API — Internal Billings', () => {
  let adminToken: string;
  let evalToken: string;
  let financeToken: string;

  beforeAll(() => {
    adminToken = makeToken('admin');
    evalToken = makeToken('evaluator', MOCK_EVAL_ID);
    financeToken = makeToken('finance_auditor', MOCK_FINANCE_ID);
  });

  it('GET /api/v1/billings — returns list', async () => {
    const res = await request(app)
      .get('/api/v1/billings')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
  });

  it('GET /api/v1/billings/:id — returns billing for valid ID', async () => {
    const res = await request(app)
      .get(`/api/v1/billings/${MOCK_BILLING_ID}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.billing_id).toBe(MOCK_BILLING_ID);
  });

  it('GET /api/v1/billings/:id — 404 for unknown ID', async () => {
    const res = await request(app)
      .get('/api/v1/billings/unknown-id')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });

  it('POST /api/v1/billings — evaluator can create billing', async () => {
    const res = await request(app)
      .post('/api/v1/billings')
      .set('Authorization', `Bearer ${evalToken}`)
      .send({
        provider_id: MOCK_PROVIDER_ID,
        qm_id: MOCK_QM_ID,
        external_reference_no: 'REF-2025-0002',
        claimed_amount: 300000,
        recorded_by: MOCK_EVAL_ID,
      });
    expect(res.status).toBe(201);
  });

  it('POST /api/v1/billings — rejects zero/negative claimed_amount (400)', async () => {
    const res = await request(app)
      .post('/api/v1/billings')
      .set('Authorization', `Bearer ${financeToken}`)
      .send({
        provider_id: MOCK_PROVIDER_ID,
        qm_id: MOCK_QM_ID,
        external_reference_no: 'REF-2025-0003',
        claimed_amount: -100,
        recorded_by: MOCK_FINANCE_ID,
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('positive number');
  });

  it('PATCH /api/v1/billings/:id/status — finance can update status to verified', async () => {
    const res = await request(app)
      .patch(`/api/v1/billings/${MOCK_BILLING_ID}/status`)
      .set('Authorization', `Bearer ${financeToken}`)
      .send({ verification_status: 'verified' });
    expect(res.status).toBe(200);
  });

  it('PATCH /api/v1/billings/:id/status — evaluator cannot update status (403)', async () => {
    const res = await request(app)
      .patch(`/api/v1/billings/${MOCK_BILLING_ID}/status`)
      .set('Authorization', `Bearer ${evalToken}`)
      .send({ verification_status: 'verified' });
    expect(res.status).toBe(403);
  });

  it('PATCH /api/v1/billings/:id/status — missing body field returns 400', async () => {
    const res = await request(app)
      .patch(`/api/v1/billings/${MOCK_BILLING_ID}/status`)
      .set('Authorization', `Bearer ${financeToken}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('verification_status');
  });

  it('DELETE /api/v1/billings/:id — only admin can delete', async () => {
    const res = await request(app)
      .delete(`/api/v1/billings/${MOCK_BILLING_ID}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  it('DELETE /api/v1/billings/:id — finance cannot delete (403)', async () => {
    const res = await request(app)
      .delete(`/api/v1/billings/${MOCK_BILLING_ID}`)
      .set('Authorization', `Bearer ${financeToken}`);
    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('CRUD API — Dashboard', () => {
  let adminToken: string;

  beforeAll(() => {
    adminToken = makeToken('admin');
  });

  it('GET /api/v1/dashboard/summary — returns KPI aggregates', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/summary')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('totalPrograms');
    expect(res.body.data).toHaveProperty('totalAllocatedBudget');
    expect(res.body.data).toHaveProperty('billingsPending');
  });

  it('GET /api/v1/dashboard/budget-by-program — returns program budget breakdown', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/budget-by-program')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
  });

  it('GET /api/v1/dashboard/billing-status-counts — returns billing status counts', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/billing-status-counts')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
  });

  it('GET /api/v1/dashboard/summary — requires authentication', async () => {
    const res = await request(app).get('/api/v1/dashboard/summary');
    expect(res.status).toBe(401);
  });
});
