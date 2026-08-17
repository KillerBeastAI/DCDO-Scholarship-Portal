import { ProgramModel } from '../models/program.model.js';
import { ScholarshipProgram, ScholarshipProgramSummary } from '../types/domain.js';

export class ProgramService {
  static async getAggregatedSummary(fiscalYear?: string): Promise<ScholarshipProgramSummary[]> {
    return ProgramModel.getAggregatedSummary(fiscalYear);
  }

  static async getAllPrograms(fiscalYear?: number): Promise<ScholarshipProgram[]> {
    return ProgramModel.findAll(fiscalYear);
  }

  static async getProgramById(id: string): Promise<ScholarshipProgram> {
    const program = await ProgramModel.findById(id);
    if (!program) {
      const err = new Error(`Scholarship program with ID '${id}' not found`) as Error & { statusCode?: number };
      err.statusCode = 404;
      throw err;
    }
    return program;
  }

  static async createProgram(data: {
    program_code: string;
    program_name: string;
    fiscal_year: number;
    total_allocated?: number;
    total_disbursed?: number;
  }): Promise<ScholarshipProgram> {
    if (!data.program_code || !data.program_name || !data.fiscal_year) {
      const err = new Error('Missing required program fields') as Error & { statusCode?: number };
      err.statusCode = 400;
      throw err;
    }

    const existing = await ProgramModel.findByCode(data.program_code);
    if (existing) {
      const err = new Error(`Program code '${data.program_code}' already exists`) as Error & { statusCode?: number };
      err.statusCode = 400;
      throw err;
    }

    return ProgramModel.create(data);
  }

  static async updateProgram(
    id: string,
    data: Partial<Omit<ScholarshipProgram, 'program_id'>>,
  ): Promise<ScholarshipProgram> {
    await this.getProgramById(id);

    if (data.program_code) {
      const existing = await ProgramModel.findByCode(data.program_code);
      if (existing && existing.program_id !== id) {
        const err = new Error(`Program code '${data.program_code}' is already used by another program`) as Error & { statusCode?: number };
        err.statusCode = 400;
        throw err;
      }
    }

    const updated = await ProgramModel.update(id, data);
    if (!updated) {
      const err = new Error(`Failed to update program '${id}'`) as Error & { statusCode?: number };
      err.statusCode = 500;
      throw err;
    }
    return updated;
  }

  static async deleteProgram(id: string): Promise<void> {
    await this.getProgramById(id);
    await ProgramModel.delete(id);
  }
}
