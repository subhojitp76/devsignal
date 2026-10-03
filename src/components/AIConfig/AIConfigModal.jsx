import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { testLlmConnection, fetchLiveGeminiModels, fetchLocalModels } from '../../services/llmService';
import { ACTIVE_GEMINI_MODELS } from '../../constants/defaultData';
import { X, Cpu, Sparkles, CheckCircle2, AlertCircle, RefreshCw, Key, Server, DownloadCloud, Edit3 } from 'lucide-react';

export default function AIConfigModal() {
  const { isAiConfigOpen, setIsAiConfigOpen, aiConfig, setAiConfig, showToast } = useApp();

  const [draftConfig, setDraftConfig] = useState({ ...aiConfig });
  const [testingStatus, setTestingStatus] = useState(null); // { loading: boolean, success: boolean, message: string }
  const [availableModels, setAvailableModels] = useState(ACTIVE_GEMINI_MODELS);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [isCustomModel, setIsCustomModel] = useState(false);

  const [localModels, setLocalModels] = useState([]);
  const [isFetchingLocalModels, setIsFetchingLocalModels] = useState(false);
  const [isCustomLocalModel, setIsCustomLocalModel] = useState(false);

  if (!isAiConfigOpen) return null;

  const handleFetchLiveModels = async () => {
    if (!draftConfig.geminiApiKey?.trim()) {
      showToast('Please enter your Gemini API Key first to fetch active models from Google.', 'error');
      return;
    }

    setIsFetchingModels(true);
    try {
      const models = await fetchLiveGeminiModels(draftConfig.geminiApiKey);
      if (models.length > 0) {
        setAvailableModels(models);
        // If current model not in the list, set to the first active model
        if (!models.some(m => m.id === draftConfig.geminiModel)) {
          setDraftConfig(p => ({ ...p, geminiModel: models[0].id }));
        }
        showToast(`Found ${models.length} active non-deprecated models from Google API!`, 'success');
      } else {
        showToast('No models returned. Using default active Gemini 3 models.', 'info');
      }
    } catch (err) {
      showToast(err.message || 'Failed to fetch live models from Google', 'error');
    } finally {
      setIsFetchingModels(false);
    }
  };

  const handleFetchLocalModels = async () => {
    setIsFetchingLocalModels(true);
    try {
      const models = await fetchLocalModels(draftConfig.ollamaBaseUrl);
      if (models.length > 0) {
        setLocalModels(models);
        setIsCustomLocalModel(false);
        if (!models.some(m => m.id === draftConfig.ollamaModel)) {
          setDraftConfig(p => ({ ...p, ollamaModel: models[0].id }));
        }
        showToast(`Synced ${models.length} loaded model(s) from local server!`, 'success');
      } else {
        showToast('No loaded models found. Ensure a model is loaded in LM Studio or Ollama.', 'info');
      }
    } catch (err) {
      showToast(err.message || 'Failed to connect to local server', 'error');
    } finally {
      setIsFetchingLocalModels(false);
    }
  };

  const handleTest = async () => {
    setTestingStatus({ loading: true, message: 'Testing connection...' });
    try {
      const res = await testLlmConnection(draftConfig);
      setTestingStatus({ loading: false, success: true, message: res.message });
    } catch (err) {
      setTestingStatus({ loading: false, success: false, message: err.message });
    }
  };

  const handleSave = () => {
    setAiConfig(draftConfig);
    showToast(`AI Provider set to ${draftConfig.provider === 'ollama' ? 'Local Ollama' : 'Google Gemini'}`, 'success');
    setIsAiConfigOpen(false);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '16px'
    }} className="no-print">
      <div style={{
        width: '100%',
        maxWidth: '560px',
        background: '#0f172a',
        border: '1px solid var(--border-medium)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-xl)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(15, 23, 42, 0.9)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Cpu className="w-5 h-5 text-sky-400" />
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#f8fafc' }}>
              Dual-LLM Engine Configuration
            </h2>
          </div>
          <button 
            onClick={() => setIsAiConfigOpen(false)}
            style={{ color: 'var(--text-muted)', padding: '4px' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Provider Selection Tabs */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Active AI Provider
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setDraftConfig(p => ({ ...p, provider: 'gemini' }))}
                style={{
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  border: draftConfig.provider === 'gemini' ? '2px solid #38bdf8' : '1px solid var(--border-medium)',
                  background: draftConfig.provider === 'gemini' ? 'rgba(56, 189, 248, 0.1)' : 'rgba(30, 41, 59, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  textAlign: 'left'
                }}
              >
                <Sparkles className="w-5 h-5 text-sky-400" />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px', color: '#f8fafc' }}>Google Gemini</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Fast cloud intelligence</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDraftConfig(p => ({ ...p, provider: 'ollama' }))}
                style={{
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  border: draftConfig.provider === 'ollama' ? '2px solid #34d399' : '1px solid var(--border-medium)',
                  background: draftConfig.provider === 'ollama' ? 'rgba(52, 211, 153, 0.1)' : 'rgba(30, 41, 59, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  textAlign: 'left'
                }}
              >
                <Server className="w-5 h-5 text-emerald-400" />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px', color: '#f8fafc' }}>Local LLM (LM Studio / Ollama)</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Private, offline, zero API quota</div>
                </div>
              </button>
            </div>
          </div>

          {/* Conditional Provider Fields */}
          {draftConfig.provider === 'gemini' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Gemini API Key
                </label>
                <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                  <input
                    type="password"
                    value={draftConfig.geminiApiKey}
                    onChange={e => setDraftConfig(p => ({ ...p, geminiApiKey: e.target.value }))}
                    placeholder="AIzaSy..."
                    style={{ width: '100%', paddingLeft: '34px' }}
                  />
                  <Key className="w-4 h-4 text-slate-500" style={{ position: 'absolute', left: '10px' }} />
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Your key is stored locally in your browser and never sent to any third-party server.
                </p>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>
                    Gemini Model
                  </label>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={handleFetchLiveModels}
                      disabled={isFetchingModels || !draftConfig.geminiApiKey}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '11px',
                        color: '#38bdf8',
                        background: 'rgba(56, 189, 248, 0.1)',
                        border: '1px solid rgba(56, 189, 248, 0.25)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '3px 8px'
                      }}
                      title="Fetch live active models directly from Google Gemini API"
                    >
                      <RefreshCw className={`w-3 h-3 ${isFetchingModels ? 'animate-spin' : ''}`} />
                      <span>{isFetchingModels ? 'Fetching...' : 'Sync Live Models'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsCustomModel(!isCustomModel)}
                      style={{
                        fontSize: '11px',
                        color: 'var(--text-muted)',
                        padding: '3px 6px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(30, 41, 59, 0.4)'
                      }}
                    >
                      {isCustomModel ? 'Select List' : 'Custom'}
                    </button>
                  </div>
                </div>

                {isCustomModel ? (
                  <input
                    type="text"
                    value={draftConfig.geminiModel}
                    onChange={e => setDraftConfig(p => ({ ...p, geminiModel: e.target.value }))}
                    placeholder="e.g. gemini-3.8-flash, gemini-3.9-flash"
                    style={{ width: '100%', fontFamily: 'var(--font-mono)' }}
                  />
                ) : (
                  <select
                    value={draftConfig.geminiModel}
                    onChange={e => setDraftConfig(p => ({ ...p, geminiModel: e.target.value }))}
                    style={{ width: '100%' }}
                  >
                    {availableModels.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name || m.id} {m.id === draftConfig.geminiModel ? '✓' : ''}
                      </option>
                    ))}
                  </select>
                )}
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Only current, non-deprecated models are listed. Click "Sync Live Models" to pull real-time models from your Google account.
                </p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>
                    Local Server Base URL
                  </label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => setDraftConfig(p => ({ ...p, ollamaBaseUrl: 'http://localhost:1234' }))}
                      style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-sm)',
                        background: draftConfig.ollamaBaseUrl?.includes('1234') ? 'rgba(56, 189, 248, 0.2)' : 'rgba(30, 41, 59, 0.4)',
                        color: draftConfig.ollamaBaseUrl?.includes('1234') ? '#38bdf8' : 'var(--text-muted)',
                        border: '1px solid var(--border-subtle)'
                      }}
                    >
                      LM Studio (1234)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDraftConfig(p => ({ ...p, ollamaBaseUrl: 'http://localhost:11434' }))}
                      style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-sm)',
                        background: draftConfig.ollamaBaseUrl?.includes('11434') ? 'rgba(52, 211, 153, 0.2)' : 'rgba(30, 41, 59, 0.4)',
                        color: draftConfig.ollamaBaseUrl?.includes('11434') ? '#34d399' : 'var(--text-muted)',
                        border: '1px solid var(--border-subtle)'
                      }}
                    >
                      Ollama (11434)
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  value={draftConfig.ollamaBaseUrl}
                  onChange={e => setDraftConfig(p => ({ ...p, ollamaBaseUrl: e.target.value }))}
                  placeholder="http://localhost:1234"
                  style={{ width: '100%', fontFamily: 'var(--font-mono)' }}
                />
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  LM Studio runs on <code>http://localhost:1234</code>. Ollama runs on <code>http://localhost:11434</code>.
                </p>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>
                    Model Identifier
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={handleFetchLocalModels}
                      disabled={isFetchingLocalModels}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '11px',
                        color: '#34d399',
                        background: 'rgba(52, 211, 153, 0.1)',
                        border: '1px solid rgba(52, 211, 153, 0.25)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '3px 8px'
                      }}
                      title="Sync currently loaded models from LM Studio / Ollama"
                    >
                      <RefreshCw className={`w-3 h-3 ${isFetchingLocalModels ? 'animate-spin' : ''}`} />
                      <span>{isFetchingLocalModels ? 'Syncing...' : 'Sync Loaded Models'}</span>
                    </button>

                    {localModels.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setIsCustomLocalModel(!isCustomLocalModel)}
                        style={{
                          fontSize: '11px',
                          color: 'var(--text-muted)',
                          padding: '3px 6px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'rgba(30, 41, 59, 0.4)'
                        }}
                      >
                        {isCustomLocalModel ? 'Select List' : 'Custom'}
                      </button>
                    )}
                  </div>
                </div>

                {!isCustomLocalModel && localModels.length > 0 ? (
                  <select
                    value={draftConfig.ollamaModel}
                    onChange={e => setDraftConfig(p => ({ ...p, ollamaModel: e.target.value }))}
                    style={{ width: '100%' }}
                  >
                    {localModels.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name || m.id} {m.id === draftConfig.ollamaModel ? '✓' : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={draftConfig.ollamaModel}
                    onChange={e => setDraftConfig(p => ({ ...p, ollamaModel: e.target.value }))}
                    placeholder="e.g. google/gemma-4-12b-qat, deepseek-coder:6.7b"
                    style={{ width: '100%', fontFamily: 'var(--font-mono)' }}
                  />
                )}
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Click "Sync Loaded Models" to auto-detect models loaded in LM Studio or Ollama.
                </p>
              </div>
            </div>
          )}

          {/* Test Status feedback */}
          {testingStatus && (
            <div style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: testingStatus.loading 
                ? 'rgba(56, 189, 248, 0.1)' 
                : testingStatus.success 
                  ? 'rgba(52, 211, 153, 0.1)' 
                  : 'rgba(251, 113, 133, 0.1)',
              border: testingStatus.loading 
                ? '1px solid rgba(56, 189, 248, 0.3)' 
                : testingStatus.success 
                  ? '1px solid rgba(52, 211, 153, 0.3)' 
                  : '1px solid rgba(251, 113, 133, 0.3)',
              color: testingStatus.loading 
                ? '#38bdf8' 
                : testingStatus.success 
                  ? '#34d399' 
                  : '#fb7185'
            }}>
              {testingStatus.loading && <RefreshCw className="w-4 h-4 animate-spin" />}
              {testingStatus.success && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              {!testingStatus.loading && !testingStatus.success && <AlertCircle className="w-4 h-4 text-rose-400" />}
              <span style={{ flex: 1 }}>{testingStatus.message}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--border-subtle)',
          background: 'rgba(15, 23, 42, 0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <button
            type="button"
            onClick={handleTest}
            disabled={testingStatus?.loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(30, 41, 59, 0.8)',
              border: '1px solid var(--border-medium)',
              fontSize: '13px',
              color: 'var(--text-primary)',
              fontWeight: 500
            }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testingStatus?.loading ? 'animate-spin' : ''}`} />
            <span>Test Connection</span>
          </button>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setIsAiConfigOpen(false)}
              style={{
                padding: '8px 14px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '13px',
                color: 'var(--text-muted)'
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              style={{
                padding: '8px 18px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--accent-primary)',
                color: '#090d16',
                fontSize: '13px',
                fontWeight: 600,
                boxShadow: 'var(--accent-glow)'
              }}
            >
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
