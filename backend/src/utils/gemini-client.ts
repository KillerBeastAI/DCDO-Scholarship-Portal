import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../config/env.js';

export class GeminiClient {
  private model: any;

  constructor() {
    if (!env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set in environment');
    }
    const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    this.model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  /** Raw text response from Gemini */
  async generateText(prompt: string): Promise<string> {
    const result = await this.model.generateContent(prompt);
    return result.response.text();
  }

  /** Expect a JSON object in the response */
  async generateJSON(prompt: string): Promise<Record<string, any>> {
    const text = await this.generateText(prompt);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Gemini did not return JSON');
    return JSON.parse(jsonMatch[0]);
  }
}
