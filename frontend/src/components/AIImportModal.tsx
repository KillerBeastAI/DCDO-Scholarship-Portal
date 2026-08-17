import React, { useCallback, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { api } from '../services/api';
import './AIImportModal.css';

interface Props {
  onClose: () => void;
  onImported: () => void;
}

type Step = 'upload' | 'mapping' | 'preview' | 'done';

const DB_FIELDS = [
  { value: '__skip__', label: '— Skip this column —' },
  { value: 'institution_name', label: 'Institution Name ✳' },
  { value: 'email_website_fb', label: 'Email / Website / Facebook' },
  { value: 'institution_type', label: 'Institution Type (Public/Private/LGU-Run)' },
  { value: 'classification', label: 'Classification (TTI/TVI/SUC…)' },
  { value: 'type_of_program', label: 'Type of Program (IBT/MTP/EBET/Bundled/MCC/Diploma)' },
  { value: 'sector', label: 'Sector' },
  { value: 'qualification_title', label: 'Qualification Title' },
  { value: 'training_duration_hours', label: 'Training Duration (hrs)' },
  { value: 'sil_duration_hours', label: 'SIL Duration (hrs)' },
  { value: 'program_registration_number', label: 'Registration Number' },
  { value: 'date_of_expiration', label: 'Date of Expiration' },
  { value: 'school_id', label: 'School ID' },
  { value: 'complete_address', label: 'Complete Address' },
  { value: 'contact_number', label: 'Contact Number' },
];

export const AIImportModal: React.FC<Props> = ({ onClose, onImported }) => {
  const [step, setStep] = useState<Step>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [sampleRows, setSampleRows] = useState<string[][]>([]);
  const [allRows, setAllRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [aiLoading, setAiLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<{ inserted: number; skipped: number } | null>(null);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // Smart heuristic matcher for common column names
  const autoMapHeaders = (hdrs: string[]) => {
    const map: Record<string, string> = {};
    for (const h of hdrs) {
      const clean = h.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (clean.includes('institutionname') || clean.includes('schoolname') || clean === 'institution' || clean === 'school') {
        map[h] = 'institution_name';
      } else if (clean.includes('institutiontype')) {
        map[h] = 'institution_type';
      } else if (clean.includes('classification')) {
        map[h] = 'classification';
      } else if (clean.includes('typeofprogram') || clean.includes('programtype') || clean === 'typeofprog' || clean === 'progtype') {
        map[h] = 'type_of_program';
      } else if (clean.includes('sector')) {
        map[h] = 'sector';
      } else if (clean.includes('qualification') || clean.includes('course') || clean.includes('programtitle')) {
        map[h] = 'qualification_title';
      } else if (clean.includes('silduration') || (clean.includes('sil') && clean.includes('hour'))) {
        map[h] = 'sil_duration_hours';
      } else if (clean.includes('trainingduration') || clean.includes('duration') || clean.includes('traininghour') || clean.includes('hours')) {
        map[h] = 'training_duration_hours';
      } else if (clean.includes('registration') || clean.includes('prn') || clean.includes('copr')) {
        map[h] = 'program_registration_number';
      } else if (clean.includes('expiration') || clean.includes('expiry') || clean.includes('validuntil')) {
        map[h] = 'date_of_expiration';
      } else if (clean.includes('schoolid') || clean.includes('tviid')) {
        map[h] = 'school_id';
      } else if (clean.includes('address') || clean.includes('location')) {
        map[h] = 'complete_address';
      } else if (clean.includes('contact') || clean.includes('phone') || clean.includes('mobile') || clean.includes('tel')) {
        map[h] = 'contact_number';
      } else if (clean.includes('email') || clean.includes('website') || clean.includes('fb') || clean.includes('facebook')) {
        map[h] = 'email_website_fb';
      } else if (clean === 'type') {
        map[h] = 'institution_type';
      } else {
        map[h] = '__skip__';
      }
    }
    return map;
  };

  // Parse excel file client-side
  const parseFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target!.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });
      if (!json.length) { setError('Excel file is empty'); return; }
      const hdrs = (json[0] as string[]).map((h) => String(h ?? '')).filter((h) => h.trim() !== '');
      const rows = json.slice(1).filter((r) => r.some((c) => c !== '' && c != null));
      setHeaders(hdrs);
      setSampleRows(rows.slice(0, 3) as string[][]);
      setAllRows(rows as string[][]);
      setFileName(file.name);
      
      // Immediately set heuristic mapping so user sees matched fields without waiting
      const heuristicMap = autoMapHeaders(hdrs);
      setMapping(heuristicMap);
      setStep('mapping');
      askGemini(hdrs, rows.slice(0, 3) as string[][]);
    };
    reader.readAsArrayBuffer(file);
  };

  const askGemini = async (hdrs: string[], samples: string[][]) => {
    setAiLoading(true);
    setError('');
    try {
      const { data } = await api.post<{ data: Record<string, string> }>(
        '/ai-import/providers/map-columns',
        { headers: hdrs, sampleRows: samples },
      );
      if (data.data && Object.keys(data.data).length > 0) {
        setMapping(data.data);
      }
    } catch {
      // Heuristic mapping is already populated, inform user
      setError('AI auto-detection is offline — columns were mapped using standard header matching.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) parseFile(file);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
  };

  // Build preview rows from mapping
  const buildMappedRows = () =>
    allRows.map((row) => {
      const obj: Record<string, any> = {};
      headers.forEach((h, i) => {
        const field = mapping[h];
        if (field && field !== '__skip__') obj[field] = row[i] ?? '';
      });
      return obj;
    });

  const handleConfirmImport = async () => {
    setImportLoading(true);
    setError('');
    try {
      const rows = buildMappedRows();
      const { data } = await api.post<{ data: { inserted: number; skipped: number } }>(
        '/ai-import/providers/import',
        { rows },
      );
      setImportResult(data.data);
      setStep('done');
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Import failed');
    } finally {
      setImportLoading(false);
    }
  };

  const previewRows = buildMappedRows();
  const activeFields = [...new Set(Object.values(mapping).filter((v) => v !== '__skip__'))];

  return (
    <div className="aimodal-overlay" onClick={onClose}>
      <div className="aimodal-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="aimodal-header">
          <div className="aimodal-title-wrap">
            <span className="aimodal-ai-badge">✨ AI</span>
            <h2 className="aimodal-title">Import Training Providers from Excel</h2>
          </div>
          <button className="aimodal-close" onClick={onClose}>✕</button>
        </div>

        {/* Steps indicator */}
        <div className="aimodal-steps">
          {(['upload', 'mapping', 'preview', 'done'] as Step[]).map((s, i) => (
            <div key={s} className={`aimodal-step ${step === s ? 'active' : ''} ${['upload','mapping','preview','done'].indexOf(step) > i ? 'done' : ''}`}>
              <div className="aimodal-step-num">{['upload','mapping','preview','done'].indexOf(step) > i ? '✓' : i + 1}</div>
              <span>{['Upload', 'Map Columns', 'Preview', 'Done'][i]}</span>
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="aimodal-body">

          {/* ── Step 1: Upload ── */}
          {step === 'upload' && (
            <div
              className={`aimodal-dropzone ${isDragging ? 'dragging' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
            >
              <input
                ref={fileRef}
                id="ai-modal-file-input"
                name="aiModalFileInput"
                type="file"
                accept=".xlsx,.xls,.csv"
                hidden
                onChange={handleFileChange}
              />
              <div className="aimodal-dropzone-icon">📊</div>
              <div className="aimodal-dropzone-text">
                <strong>Drag & drop your Excel file here</strong>
                <span>or click to browse — .xlsx, .xls, .csv</span>
              </div>
            </div>
          )}

          {/* ── Step 2: Mapping ── */}
          {step === 'mapping' && (
            <div className="aimodal-mapping">
              <div className="aimodal-mapping-info">
                <span className="aimodal-file-badge">📄 {fileName}</span>
                {aiLoading
                  ? <span className="aimodal-ai-thinking">✨ Gemini is mapping columns…</span>
                  : <span className="aimodal-ai-done">✅ AI mapping complete — review and adjust if needed</span>}
              </div>
              <div className="aimodal-mapping-table">
                <div className="aimodal-mapping-head">
                  <span>Excel Column</span>
                  <span>Sample Data</span>
                  <span>Maps To (DB Field)</span>
                </div>
                {headers.map((h) => (
                  <div key={h} className="aimodal-mapping-row">
                    <span className="aimodal-col-name">{h}</span>
                    <span className="aimodal-col-sample">{sampleRows[0]?.[headers.indexOf(h)] ?? '—'}</span>
                    <select
                      className="aimodal-select"
                      value={mapping[h] ?? '__skip__'}
                      onChange={(e) => setMapping((prev) => ({ ...prev, [h]: e.target.value }))}
                    >
                      {DB_FIELDS.map((f) => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              <button
                className="btn btn-primary aimodal-btn-next"
                disabled={aiLoading}
                onClick={() => setStep('preview')}
              >
                {aiLoading ? '…' : 'Preview Import →'}
              </button>
            </div>
          )}

          {/* ── Step 3: Preview ── */}
          {step === 'preview' && (
            <div className="aimodal-preview">
              <div className="aimodal-preview-info">
                <span className="aimodal-file-badge">📄 {fileName}</span>
                <span className="aimodal-preview-count">{previewRows.length} rows · {activeFields.length} fields mapped</span>
              </div>
              <div className="aimodal-preview-wrap">
                <table className="aimodal-preview-table">
                  <thead>
                    <tr>{activeFields.map((f) => <th key={f}>{f}</th>)}</tr>
                  </thead>
                  <tbody>
                    {previewRows.slice(0, 10).map((row, i) => (
                      <tr key={i}>
                        {activeFields.map((f) => <td key={f}>{row[f] ?? ''}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewRows.length > 10 && (
                  <div className="aimodal-preview-more">…and {previewRows.length - 10} more rows</div>
                )}
              </div>
              <div className="aimodal-preview-actions">
                <button className="btn btn-secondary" onClick={() => setStep('mapping')}>← Back</button>
                <button
                  className="btn btn-primary"
                  disabled={importLoading}
                  onClick={handleConfirmImport}
                >
                  {importLoading ? 'Importing…' : `✅ Confirm Import (${previewRows.length} rows)`}
                </button>
              </div>
            </div>
          )}

          {/* ── Step 4: Done ── */}
          {step === 'done' && importResult && (
            <div className="aimodal-done">
              <div className="aimodal-done-icon">🎉</div>
              <h3 className="aimodal-done-title">Import Complete!</h3>
              <div className="aimodal-done-stats">
                <div className="aimodal-stat aimodal-stat--success">
                  <div className="aimodal-stat-num">{importResult.inserted}</div>
                  <div className="aimodal-stat-label">Providers Added</div>
                </div>
                <div className="aimodal-stat aimodal-stat--warn">
                  <div className="aimodal-stat-num">{importResult.skipped}</div>
                  <div className="aimodal-stat-label">Rows Skipped</div>
                </div>
              </div>
              <button className="btn btn-primary" onClick={() => { onImported(); onClose(); }}>
                View Training Providers
              </button>
            </div>
          )}

          {error && <div className="aimodal-error">⚠️ {error}</div>}
        </div>
      </div>
    </div>
  );
};
