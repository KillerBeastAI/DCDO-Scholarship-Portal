import { GeminiClient } from '../utils/gemini-client.js';
import { ProviderModel } from '../models/provider.model.js';

export class AIImportService {
  /**
   * Ask Gemini to map Excel column headers to DB fields.
   * Returns { [excelHeader]: dbFieldName } mapping.
   */
  static async mapProviderColumns(
    headers: string[],
    sampleRows: string[][],
  ): Promise<Record<string, string>> {
    const prompt = `You are mapping Excel column headers to Training Provider database fields.

Available database fields:
- institution_name: School/institution name (required)
- email_website_fb: Email, website or Facebook URL
- institution_type: Must be exactly one of: Public, Private, LGU-Run
- classification: Must be exactly one of: TTI, TVI, SUC, LUC, HEI, EBT, EBET
- type_of_program: Must be one of: IBT, MTP, EBET, Bundled, MCC, Diploma
- sector: Industry sector or field
- qualification_title: Course or qualification name
- training_duration_hours: Training hours (number)
- sil_duration_hours: SIL hours (number)
- program_registration_number: Registration/PRN number
- date_of_expiration: Expiry date (YYYY-MM-DD or MM/DD/YYYY)
- school_id: TESDA school ID
- complete_address: Full address
- contact_number: Phone or mobile
- __skip__: Use this if a column doesn't match any field

Excel headers: ${JSON.stringify(headers)}
Sample data (first 3 rows):
${sampleRows
  .slice(0, 3)
  .map((r) => headers.map((h, i) => `${h}: ${r[i] ?? ''}`).join(', '))
  .join('\n')}

Respond ONLY with a single JSON object mapping each header string to the best-matching field name.
Example: {"School Name":"institution_name","Type":"institution_type","Tel":"contact_number"}`;

    const gemini = new GeminiClient();
    const raw = await gemini.generateText(prompt);
    // Extract JSON from response
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Gemini did not return a valid JSON mapping');
    return JSON.parse(jsonMatch[0]);
  }

  /**
   * Bulk-insert already-mapped rows into training_providers.
   */
  static async importProviders(rows: Record<string, any>[]) {
    const required = ['institution_name'];
    const validRows = rows.filter(
      (r) => required.every((f) => r[f] != null && String(r[f]).trim() !== ''),
    );
    const inserted = await ProviderModel.bulkCreate(validRows);
    return { inserted: inserted.length, skipped: rows.length - inserted.length };
  }
}
