/**
 * NEXUS LLM GATEWAY - INTERACTIVE CONTROL PLANE SCRIPT
 * High-performance vanilla JS engine for real-time telemetry, routing simulation,
 * interactive playground, audit traces, and policy enforcement.
 */

// Application State
const state = {
  activeTab: 'playground',
  activeTeamKey: 'team-alpha-key',
  selectedModel: 'qwen/qwen3.8-27b',
  isExecuting: false,
  autoSync: true,
  syncIntervalId: null,
  cachedStats: null,
  cachedLogs: [],
  lastResponseData: null,
};

// Preset Prompts for CV Live Demo
const DEMO_PRESETS = {
  'fast-ping': {
    model: 'qwen/qwen3.8-27b',
    prompt: "Respond with 'Nexus Gateway: Online 200 OK' and state your inference engine latency in 10 words.",
    maxTokens: 64,
    temp: 0.3,
  },
  'failover': {
    model: 'fail-test-model',
    prompt: "Simulate a live failover scenario: explain why upstream redundancy is critical for 99.99% LLM reliability.",
    maxTokens: 180,
    temp: 0.7,
  },
  'explain-gateway': {
    model: 'qwen/qwen3.8-27b',
    prompt: "In 2 crisp bullet points, explain why enterprises deploy an LLM API Gateway instead of direct client-to-API calls.",
    maxTokens: 150,
    temp: 0.6,
  },
  'heavy-code': {
    model: 'qwen/qwen3.8-27b',
    prompt: "Write a production-ready Python helper function for exponential backoff with full type hints.",
    maxTokens: 256,
    temp: 0.4,
  }
};

// DOM Elements
const DOM = {
  // Tabs
  tabs: document.querySelectorAll('.nav-tab'),
  tabPanels: document.querySelectorAll('.tab-panel'),
  autoRefreshToggle: document.getElementById('auto-refresh-toggle'),
  btnRefreshAll: document.getElementById('btn-refresh-all'),
  btnSeedDemo: document.getElementById('btn-seed-demo'),

  // Header status
  headerStatusPill: document.getElementById('system-status-pill'),
  headerStatusLabel: document.getElementById('status-label'),
  headerLatency: document.getElementById('header-latency'),
  teamSelect: document.getElementById('team-select'),

  // Playground elements
  modelSelect: document.getElementById('model-select'),
  customModelBox: document.getElementById('custom-model-box'),
  customModelInput: document.getElementById('custom-model-input'),
  tempSlider: document.getElementById('temp-slider'),
  tempVal: document.getElementById('temp-val'),
  tokensSlider: document.getElementById('tokens-slider'),
  tokensVal: document.getElementById('tokens-val'),
  streamToggle: document.getElementById('stream-toggle'),
  customKeyBox: document.getElementById('custom-key-box'),
  customKeyInput: document.getElementById('custom-key-input'),
  btnDispatch: document.getElementById('btn-dispatch'),
  dispatchSpinner: document.getElementById('dispatch-spinner'),
  dispatchBtnText: document.getElementById('dispatch-btn-text'),
  presetButtons: document.querySelectorAll('.btn-preset'),

  // Console elements
  terminalBody: document.getElementById('terminal-body'),
  promptInput: document.getElementById('prompt-input'),
  btnSendInline: document.getElementById('btn-send-inline'),
  charCount: document.getElementById('char-count'),
  routeTrackerPill: document.getElementById('route-tracker-pill'),
  routeTrackerText: document.getElementById('route-tracker-text'),
  btnClearConsole: document.getElementById('btn-clear-console'),
  btnCopyResponse: document.getElementById('btn-copy-response'),
  btnViewRawJson: document.getElementById('btn-view-raw-json'),

  // Pipeline Stepper
  stepAuth: document.getElementById('step-auth'),
  stepBudget: document.getElementById('step-budget'),
  stepTpm: document.getElementById('step-tpm'),
  stepRouter: document.getElementById('step-router'),
  stepLog: document.getElementById('step-log'),

  // Telemetry Banner
  telemetryBanner: document.getElementById('telemetry-banner'),
  telemStatus: document.getElementById('telem-status'),
  telemModel: document.getElementById('telem-model'),
  telemLatency: document.getElementById('telem-latency'),
  telemTokens: document.getElementById('telem-tokens'),
  telemCost: document.getElementById('telem-cost'),

  // Topology Elements
  btnSimNormal: document.getElementById('btn-sim-normal'),
  btnSimFailover: document.getElementById('btn-sim-failover'),
  wireClientAuth: document.getElementById('wire-client-auth'),
  wireAuthLimiter: document.getElementById('wire-auth-limiter'),
  wireLimiterRouter: document.getElementById('wire-limiter-router'),
  wireRouterGroq: document.getElementById('wire-router-groq'),
  wireRouterOpenrouter: document.getElementById('wire-router-openrouter'),
  nodeClient: document.getElementById('node-client'),
  nodeAuth: document.getElementById('node-auth'),
  nodeLimiter: document.getElementById('node-limiter'),
  nodeRouter: document.getElementById('node-router'),
  nodeGroq: document.getElementById('node-groq'),
  nodeOpenrouter: document.getElementById('node-openrouter'),

  // Telemetry Dashboard KPIs
  kpiTotalRequests: document.getElementById('kpi-total-requests'),
  kpiSuccessRate: document.getElementById('kpi-success-rate'),
  kpiSuccessBreakdown: document.getElementById('kpi-success-breakdown'),
  kpiFallbackCount: document.getElementById('kpi-fallback-count'),
  kpiAvgLatency: document.getElementById('kpi-avg-latency'),
  kpiTotalTokens: document.getElementById('kpi-total-tokens'),
  kpiTotalCost: document.getElementById('kpi-total-cost'),
  latencyBarsContainer: document.getElementById('latency-bars-container'),
  modelDistributionList: document.getElementById('model-distribution-list'),
  barSegSuccess: document.getElementById('bar-seg-success'),
  barSegFallback: document.getElementById('bar-seg-fallback'),
  barSegFailed: document.getElementById('bar-seg-failed'),
  legSuccessTxt: document.getElementById('leg-success-txt'),
  legFallbackTxt: document.getElementById('leg-fallback-txt'),
  legFailedTxt: document.getElementById('leg-failed-txt'),

  // Audit Logs
  logsCountBadge: document.getElementById('logs-count-badge'),
  logsTableBody: document.getElementById('logs-table-body'),
  logSearchInput: document.getElementById('log-search-input'),
  logTeamFilter: document.getElementById('log-team-filter'),
  logStatusFilter: document.getElementById('log-status-filter'),
  btnClearDb: document.getElementById('btn-clear-db'),

  // Quotas Elements
  alphaTpmVals: document.getElementById('alpha-tpm-vals'),
  alphaTpmBar: document.getElementById('alpha-tpm-bar'),
  alphaBudgetVals: document.getElementById('alpha-budget-vals'),
  alphaBudgetBar: document.getElementById('alpha-budget-bar'),
  betaTpmVals: document.getElementById('beta-tpm-vals'),
  betaTpmBar: document.getElementById('beta-tpm-bar'),
  betaBudgetVals: document.getElementById('beta-budget-vals'),
  betaBudgetBar: document.getElementById('beta-budget-bar'),
  btnTrigger429: document.querySelector('.btn-trigger-429'),
  btnTriggerBeta: document.querySelector('.btn-trigger-beta'),

  // Code Studio
  codeTabs: document.querySelectorAll('.code-tab'),
  codeDisplay: document.getElementById('code-display'),
  btnCopyCode: document.getElementById('btn-copy-code'),

  // Modal
  traceModal: document.getElementById('trace-modal'),
  traceJsonContent: document.getElementById('trace-json-content'),
  btnCloseModal: document.getElementById('btn-close-modal'),
  btnModalDone: document.getElementById('btn-modal-done'),
  btnModalCopy: document.getElementById('btn-modal-copy'),

  // Toast
  toastContainer: document.getElementById('toast-container'),
};

// ==========================================================================
// INITIALIZATION
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  fetchStats();
  fetchLogs();
  fetchTeams();
  startAutoSync();
});

function setupEventListeners() {
  // Navigation Tabs
  DOM.tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      switchTab(target);
    });
  });

  // Auto-sync toggle
  DOM.autoRefreshToggle.addEventListener('change', (e) => {
    state.autoSync = e.target.checked;
    if (state.autoSync) {
      startAutoSync();
      showToast('Auto-sync enabled (3s heartbeat)', 'success');
    } else {
      stopAutoSync();
      showToast('Auto-sync paused', 'warning');
    }
  });

  // Manual refresh button
  DOM.btnRefreshAll.addEventListener('click', () => {
    fetchStats();
    fetchLogs();
    fetchTeams();
    showToast('Telemetry refreshed', 'success');
  });

  // Seed demo data button
  DOM.btnSeedDemo.addEventListener('click', async () => {
    try {
      const res = await fetch('/api/reset-demo', { method: 'POST' });
      const data = await res.json();
      showToast(data.message || 'Demo data seeded!', 'success');
      await fetchStats();
      await fetchLogs();
      await fetchTeams();
    } catch (err) {
      showToast('Failed to seed demo data', 'error');
    }
  });

  // Clear DB button
  DOM.btnClearDb.addEventListener('click', async () => {
    if (!confirm('Are you sure you want to clear the audit logs database?')) return;
    try {
      await fetch('/api/clear-logs', { method: 'POST' });
      showToast('Audit records cleared from SQLite', 'warning');
      await fetchStats();
      await fetchLogs();
      await fetchTeams();
    } catch (err) {
      showToast('Failed to clear logs', 'error');
    }
  });

  // Team Selector in Header
  DOM.teamSelect.addEventListener('change', (e) => {
    const val = e.target.value;
    if (val === 'custom') {
      DOM.customKeyBox.classList.remove('hidden');
      state.activeTeamKey = DOM.customKeyInput.value.trim() || 'team-alpha-key';
    } else {
      DOM.customKeyBox.classList.add('hidden');
      state.activeTeamKey = val;
    }
    updateCodeSnippets();
    showToast(`Switched active tenant auth to: ${val}`, 'info');
  });

  DOM.customKeyInput.addEventListener('input', (e) => {
    state.activeTeamKey = e.target.value.trim() || 'team-alpha-key';
    updateCodeSnippets();
  });

  // Model Selection
  DOM.modelSelect.addEventListener('change', (e) => {
    const val = e.target.value;
    state.selectedModel = val;
    updateCodeSnippets();
  });

  // Sliders
  DOM.tempSlider.addEventListener('input', (e) => {
    DOM.tempVal.textContent = e.target.value;
  });

  DOM.tokensSlider.addEventListener('input', (e) => {
    DOM.tokensVal.textContent = e.target.value;
  });

  // Character counter for prompt textarea
  DOM.promptInput.addEventListener('input', (e) => {
    DOM.charCount.textContent = `${e.target.value.length} characters`;
  });

  // Prompt submit on Ctrl+Enter
  DOM.promptInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      executeGatewayProxy();
    }
  });

  // Dispatch buttons
  DOM.btnDispatch.addEventListener('click', executeGatewayProxy);
  DOM.btnSendInline.addEventListener('click', executeGatewayProxy);

  // Preset buttons
  DOM.presetButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const presetKey = btn.dataset.preset;
      applyPreset(presetKey);
    });
  });

  // Console actions
  DOM.btnClearConsole.addEventListener('click', () => {
    DOM.terminalBody.innerHTML = `
      <div class="terminal-welcome">
        <div class="welcome-icon">⚡</div>
        <h3>Console Cleared</h3>
        <p>Ready for next execution trace. Submit a prompt or choose a preset.</p>
      </div>`;
    DOM.telemetryBanner.style.display = 'none';
    resetPipelineStepper();
  });

  DOM.btnCopyResponse.addEventListener('click', () => {
    const bubbles = DOM.terminalBody.querySelectorAll('.chat-msg.assistant .msg-bubble');
    if (!bubbles.length) {
      showToast('No assistant response to copy', 'warning');
      return;
    }
    const lastMsg = bubbles[bubbles.length - 1].textContent;
    navigator.clipboard.writeText(lastMsg);
    showToast('Response copied to clipboard', 'success');
  });

  DOM.btnViewRawJson.addEventListener('click', () => {
    if (!state.lastResponseData) {
      showToast('Execute a request first to inspect JSON payload', 'warning');
      return;
    }
    openModal('Last Request Trace & Execution Payload', state.lastResponseData);
  });

  // Topology simulation buttons
  DOM.btnSimNormal.addEventListener('click', () => simulateTopologyFlow(false));
  DOM.btnSimFailover.addEventListener('click', () => simulateTopologyFlow(true));

  // Logs table filtering
  DOM.logSearchInput.addEventListener('input', debounce(() => fetchLogs(), 300));
  DOM.logTeamFilter.addEventListener('change', () => fetchLogs());
  DOM.logStatusFilter.addEventListener('change', () => fetchLogs());

  // Quotas stress test triggers
  if (DOM.btnTrigger429) {
    DOM.btnTrigger429.addEventListener('click', triggerRateLimitBurst);
  }
  if (DOM.btnTriggerBeta) {
    DOM.btnTriggerBeta.addEventListener('click', () => {
      DOM.teamSelect.value = 'team-beta-key';
      DOM.teamSelect.dispatchEvent(new Event('change'));
      switchTab('playground');
      applyPreset('fast-ping');
      executeGatewayProxy();
    });
  }

  // Code studio tab switcher
  DOM.codeTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      DOM.codeTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      updateCodeSnippets(tab.dataset.code);
    });
  });

  DOM.btnCopyCode.addEventListener('click', () => {
    const code = DOM.codeDisplay.textContent;
    navigator.clipboard.writeText(code);
    showToast('Code snippet copied to clipboard', 'success');
  });

  // Modal actions
  DOM.btnCloseModal.addEventListener('click', closeModal);
  DOM.btnModalDone.addEventListener('click', closeModal);
  DOM.btnModalCopy.addEventListener('click', () => {
    navigator.clipboard.writeText(DOM.traceJsonContent.textContent);
    showToast('Trace JSON copied to clipboard', 'success');
  });
  DOM.traceModal.addEventListener('click', (e) => {
    if (e.target === DOM.traceModal) closeModal();
  });
}

// ==========================================================================
// TAB SWITCHING
// ==========================================================================
function switchTab(tabKey) {
  state.activeTab = tabKey;
  DOM.tabs.forEach(tab => {
    if (tab.dataset.tab === tabKey) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });

  DOM.tabPanels.forEach(panel => {
    if (panel.id === `tab-${tabKey}`) {
      panel.classList.add('active');
    } else {
      panel.classList.remove('active');
    }
  });

  if (tabKey === 'telemetry') fetchStats();
  if (tabKey === 'logs') fetchLogs();
  if (tabKey === 'quotas') fetchTeams();
  if (tabKey === 'integration') updateCodeSnippets();
}

// ==========================================================================
// PRESET APPLICATION
// ==========================================================================
function applyPreset(presetKey) {
  const preset = DEMO_PRESETS[presetKey];
  if (!preset) return;

  DOM.modelSelect.value = preset.model;
  state.selectedModel = preset.model;
  DOM.promptInput.value = preset.prompt;
  DOM.tokensSlider.value = preset.maxTokens;
  DOM.tokensVal.textContent = preset.maxTokens;
  DOM.tempSlider.value = preset.temp;
  DOM.tempVal.textContent = preset.temp;
  DOM.charCount.textContent = `${preset.prompt.length} characters`;

  // Focus and scroll into view if on playground
  DOM.promptInput.focus();
  showToast(`Applied preset: ${presetKey}`, 'info');
}

// ==========================================================================
// PLAYGROUND GATEWAY EXECUTION ENGINE
// ==========================================================================
async function executeGatewayProxy() {
  if (state.isExecuting) return;

  const prompt = DOM.promptInput.value.trim();
  if (!prompt) {
    showToast('Please enter a prompt or select a preset', 'warning');
    DOM.promptInput.focus();
    return;
  }

  const model = DOM.modelSelect.value;
  const maxTokens = parseInt(DOM.tokensSlider.value, 10);
  const temperature = parseFloat(DOM.tempSlider.value);
  const stream = DOM.streamToggle.checked;
  const teamKey = state.activeTeamKey;

  // Set UI state to executing
  state.isExecuting = true;
  setDispatchButtonState(true);
  resetPipelineStepper();

  // Clear welcome placeholder if present
  const welcome = DOM.terminalBody.querySelector('.terminal-welcome');
  if (welcome) welcome.remove();

  // Append user message to terminal
  appendChatMessage('user', prompt);
  DOM.promptInput.value = '';
  DOM.charCount.textContent = '0 characters';

  // Animate Stepper Step 1: Bearer Auth
  highlightStepperStep(DOM.stepAuth, true);
  await sleep(120);

  // Stepper Step 2: Budget check
  highlightStepperStep(DOM.stepBudget, true);
  await sleep(100);

  // Stepper Step 3: Rate Limiter
  highlightStepperStep(DOM.stepTpm, true);
  await sleep(100);

  // Stepper Step 4: Smart Router Dispatched
  highlightStepperStep(DOM.stepRouter, true, model.includes('fail'));

  const startTime = performance.now();

  try {
    const payload = {
      model: model,
      messages: [
        { role: 'system', content: 'You are an intelligent, concise AI running through Nexus Enterprise LLM Gateway.' },
        { role: 'user', content: prompt }
      ],
      temperature: temperature,
      max_tokens: maxTokens,
      stream: stream
    };

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${teamKey}`
    };

    // If streaming enabled
    if (stream) {
      const response = await fetch('/v1/chat/completions', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: response.statusText }));
        throw new Error(errorData.detail || `Gateway error HTTP ${response.status}`);
      }

      // Create assistant container
      const assistantMsgEl = createAssistantMessageElement();
      DOM.terminalBody.appendChild(assistantMsgEl);
      const textContainer = assistantMsgEl.querySelector('.msg-bubble');

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data:')) {
            const dataStr = trimmed.replace('data:', '').trim();
            if (dataStr === '[DONE]') continue;
            try {
              const parsed = JSON.parse(dataStr);
              const delta = parsed.choices?.[0]?.delta?.content || '';
              fullContent += delta;
              textContainer.textContent = fullContent;
              DOM.terminalBody.scrollTop = DOM.terminalBody.scrollHeight;
            } catch (e) {
              // Raw text chunk fallback
              fullContent += dataStr;
              textContainer.textContent = fullContent;
            }
          } else if (trimmed) {
            fullContent += trimmed;
            textContainer.textContent = fullContent;
          }
        }
      }

      const totalTimeMs = Math.round(performance.now() - startTime);

      // Stepper Step 5: Audit Log
      highlightStepperStep(DOM.stepLog, true);

      // Telemetry update
      const estimatedTokens = Math.ceil(prompt.length / 4) + Math.ceil(fullContent.length / 4);
      const estimatedCost = (estimatedTokens * 0.00000006).toFixed(6);

      const isFallback = model.includes('fail');
      renderTelemetryBanner({
        status: isFallback ? '200 OK (Recovered)' : '200 OK (Direct)',
        model: isFallback ? 'openai/gpt-oss-20b (Failover)' : model,
        latencyMs: totalTimeMs,
        tokens: estimatedTokens,
        cost: `$${estimatedCost}`,
        isFallback: isFallback
      });

      state.lastResponseData = {
        status: '200 OK',
        model_routed: isFallback ? 'openai/gpt-oss-20b' : model,
        original_model: model,
        latency_ms: totalTimeMs,
        tokens: estimatedTokens,
        cost_usd: parseFloat(estimatedCost),
        response_text: fullContent,
        timestamp: new Date().toISOString()
      };

    } else {
      // Standard JSON non-streaming call
      const response = await fetch('/v1/chat/completions', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
      });

      const totalTimeMs = Math.round(performance.now() - startTime);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || `Gateway error HTTP ${response.status}`);
      }

      // Stepper Step 5: Audit Log
      highlightStepperStep(DOM.stepLog, true);

      const reply = data.choices?.[0]?.message?.content || JSON.stringify(data);
      appendChatMessage('assistant', reply);

      const isFallback = (data.model || '').includes('fallback');
      const tokens = data.usage?.total_tokens || maxTokens;
      const cost = data.usage?.cost ? `$${parseFloat(data.usage.cost).toFixed(6)}` : `$${(tokens * 0.00000006).toFixed(6)}`;

      renderTelemetryBanner({
        status: isFallback ? '200 OK (Failover Success)' : '200 OK (Success)',
        model: data.model || model,
        latencyMs: totalTimeMs,
        tokens: tokens,
        cost: cost,
        isFallback: isFallback
      });

      state.lastResponseData = data;
    }

    // Refresh telemetry and logs
    setTimeout(() => {
      fetchStats();
      fetchLogs();
      fetchTeams();
    }, 600);

  } catch (err) {
    const totalTimeMs = Math.round(performance.now() - startTime);
    appendChatMessage('error-msg', `[GATEWAY EXCEPTION] ${err.message}`);
    renderTelemetryBanner({
      status: 'Error / Blocked',
      model: model,
      latencyMs: totalTimeMs,
      tokens: 0,
      cost: '$0.000000',
      isError: true
    });
    showToast(err.message, 'error');
  } finally {
    state.isExecuting = false;
    setDispatchButtonState(false);
  }
}

function setDispatchButtonState(loading) {
  if (loading) {
    DOM.dispatchSpinner.classList.remove('hidden');
    DOM.dispatchBtnText.textContent = 'Routing LLM Packet...';
    DOM.btnDispatch.disabled = true;
    DOM.btnSendInline.disabled = true;
  } else {
    DOM.dispatchSpinner.classList.add('hidden');
    DOM.dispatchBtnText.textContent = 'Execute Gateway Proxy';
    DOM.btnDispatch.disabled = false;
    DOM.btnSendInline.disabled = false;
  }
}

function resetPipelineStepper() {
  [DOM.stepAuth, DOM.stepBudget, DOM.stepTpm, DOM.stepRouter, DOM.stepLog].forEach(step => {
    step.classList.remove('active', 'step-failover');
  });
}

function highlightStepperStep(stepEl, active, isFailover = false) {
  if (active) {
    stepEl.classList.add('active');
    if (isFailover) stepEl.classList.add('step-failover');
  } else {
    stepEl.classList.remove('active', 'step-failover');
  }
}

function appendChatMessage(role, text) {
  const msgEl = document.createElement('div');
  msgEl.className = `chat-msg ${role}`;

  const roleName = role === 'user' ? 'Client Request' : role === 'assistant' ? 'Gateway Output' : 'Gateway Alert';
  const roleBadge = role === 'user' ? 'badge-info' : role === 'assistant' ? 'badge-prod' : 'badge-danger';

  msgEl.innerHTML = `
    <div class="msg-meta">
      <span class="badge ${roleBadge}">${roleName}</span>
      <span>${new Date().toLocaleTimeString()}</span>
    </div>
    <div class="msg-bubble">${escapeHtml(text)}</div>
  `;

  DOM.terminalBody.appendChild(msgEl);
  DOM.terminalBody.scrollTop = DOM.terminalBody.scrollHeight;
}

function createAssistantMessageElement() {
  const msgEl = document.createElement('div');
  msgEl.className = 'chat-msg assistant';
  msgEl.innerHTML = `
    <div class="msg-meta">
      <span class="badge badge-prod">Gateway Output (Streaming)</span>
      <span>${new Date().toLocaleTimeString()}</span>
    </div>
    <div class="msg-bubble"></div>
  `;
  return msgEl;
}

function renderTelemetryBanner({ status, model, latencyMs, tokens, cost, isFallback, isError }) {
  DOM.telemetryBanner.style.display = 'grid';
  DOM.telemStatus.textContent = status;
  DOM.telemModel.textContent = model;
  DOM.telemLatency.textContent = `${latencyMs} ms`;
  DOM.telemTokens.textContent = `${tokens} tok`;
  DOM.telemCost.textContent = cost;

  // Header quick latency pill
  DOM.headerLatency.textContent = `${latencyMs} ms`;

  // Route tracker in console header
  DOM.routeTrackerPill.className = 'route-tracker-pill';
  if (isError) {
    DOM.routeTrackerPill.classList.add('error');
    DOM.routeTrackerText.textContent = `Route: Blocked (${status})`;
  } else if (isFallback) {
    DOM.routeTrackerPill.classList.add('fallback');
    DOM.routeTrackerText.textContent = 'Route: Auto-Failover Triggered ➔ Recovered (200 OK)';
  } else {
    DOM.routeTrackerPill.classList.add('primary');
    DOM.routeTrackerText.textContent = 'Route: Groq LPU (Sub-second Primary)';
  }
}

// ==========================================================================
// TOPOLOGY VISUALIZER & FAILOVER SIMULATION
// ==========================================================================
async function simulateTopologyFlow(isFailover = false) {
  // Reset nodes
  const nodes = [DOM.nodeClient, DOM.nodeAuth, DOM.nodeLimiter, DOM.nodeRouter, DOM.nodeGroq, DOM.nodeOpenrouter];
  nodes.forEach(n => n.classList.remove('node-pulse', 'node-outage', 'node-failover-active'));

  const wires = [DOM.wireClientAuth, DOM.wireAuthLimiter, DOM.wireLimiterRouter, DOM.wireRouterGroq, DOM.wireRouterOpenrouter];
  wires.forEach(w => w.classList.remove('active-wire', 'failover-wire'));

  // Step 1: Client -> Auth
  DOM.nodeClient.classList.add('node-pulse');
  DOM.wireClientAuth.classList.add('active-wire');
  await sleep(400);

  // Step 2: Auth -> Rate Limiter
  DOM.nodeClient.classList.remove('node-pulse');
  DOM.nodeAuth.classList.add('node-pulse');
  DOM.wireAuthLimiter.classList.add('active-wire');
  await sleep(400);

  // Step 3: Limiter -> Router
  DOM.nodeAuth.classList.remove('node-pulse');
  DOM.nodeLimiter.classList.add('node-pulse');
  DOM.wireLimiterRouter.classList.add('active-wire');
  await sleep(400);

  // Step 4: Router
  DOM.nodeLimiter.classList.remove('node-pulse');
  DOM.nodeRouter.classList.add('node-pulse');
  await sleep(350);

  if (!isFailover) {
    // Standard Normal Primary Flow
    DOM.wireRouterGroq.classList.add('active-wire');
    await sleep(250);
    DOM.nodeRouter.classList.remove('node-pulse');
    DOM.nodeGroq.classList.add('node-pulse');
    showToast('Direct Primary Route to Groq LPU: 200 OK (<500ms)', 'success');
  } else {
    // Failover Flow: Primary Fails -> Fallback Active
    DOM.wireRouterGroq.classList.add('failover-wire');
    DOM.nodeGroq.classList.add('node-outage');
    showToast('⚠️ Primary Provider Failed! Triggering instantaneous auto-failover...', 'warning');
    await sleep(600);

    // Reroute to secondary
    DOM.wireRouterOpenrouter.classList.add('failover-wire');
    await sleep(300);
    DOM.nodeOpenrouter.classList.add('node-failover-active');
    showToast('✓ Failover Complete! Rerouted to Secondary: 200 OK', 'success');
  }
}

// ==========================================================================
// TELEMETRY & ANALYTICS FETCHING
// ==========================================================================
async function fetchStats() {
  try {
    const res = await fetch('/api/stats');
    if (!res.ok) return;
    const stats = await res.json();
    state.cachedStats = stats;
    renderStats(stats);
  } catch (err) {
    console.error('Failed to fetch stats:', err);
  }
}

function renderStats(stats) {
  DOM.kpiTotalRequests.textContent = stats.total_requests || 0;
  DOM.kpiSuccessRate.textContent = `${stats.effective_success_rate || 100}%`;
  DOM.kpiSuccessBreakdown.textContent = `${stats.success_count || 0} direct + ${stats.fallback_count || 0} fallbacks`;
  DOM.kpiFallbackCount.textContent = stats.fallback_count || 0;
  DOM.kpiAvgLatency.textContent = `${(stats.avg_latency || 0).toFixed(2)}s`;
  DOM.kpiTotalTokens.textContent = (stats.total_tokens || 0).toLocaleString();
  DOM.kpiTotalCost.textContent = `$${(stats.total_cost || 0).toFixed(6)}`;

  // Header status indicator
  if (stats.system_health?.status === 'healthy') {
    DOM.headerStatusLabel.textContent = 'Gateway Operational';
  }

  // Render recent latency bars
  renderLatencyBars(stats.recent_trend || []);

  // Render model distribution
  renderModelDistribution(stats.model_stats || [], stats.total_requests || 1);

  // Render resolution breakdown
  renderResolutionBreakdown(stats);
}

function renderLatencyBars(trend) {
  if (!trend.length) {
    DOM.latencyBarsContainer.innerHTML = '<div class="chart-placeholder">No latency samples logged yet.</div>';
    return;
  }

  const maxLat = Math.max(...trend.map(t => t.latency || 0.1), 1.0);
  DOM.latencyBarsContainer.innerHTML = '';

  trend.forEach(item => {
    const barItem = document.createElement('div');
    barItem.className = 'chart-bar-item';

    const heightPct = Math.min(100, Math.max(8, Math.round((item.latency / maxLat) * 100)));
    const isFallback = (item.status === 'fallback_success');
    const isFailure = (item.status === 'total_failure');

    const barClass = isFailure ? 'failure-bar' : isFallback ? 'fallback-bar' : '';

    barItem.innerHTML = `
      <div class="bar-pill ${barClass}" style="height: ${heightPct}%;" title="ID: ${item.id} | Latency: ${item.latency.toFixed(2)}s | ${item.status}"></div>
      <span class="bar-val">${item.latency.toFixed(1)}s</span>
    `;

    DOM.latencyBarsContainer.appendChild(barItem);
  });
}

function renderModelDistribution(modelStats, totalReqs) {
  if (!modelStats.length) {
    DOM.modelDistributionList.innerHTML = '<div class="chart-placeholder">No model traffic logged yet.</div>';
    return;
  }

  DOM.modelDistributionList.innerHTML = '';
  modelStats.forEach(m => {
    const pct = Math.round((m.count / totalReqs) * 100);
    const row = document.createElement('div');
    row.className = 'model-stat-row';
    row.innerHTML = `
      <div class="stat-head">
        <span class="stat-name">${escapeHtml(m.model)}</span>
        <span class="stat-metric">${m.count} calls (${pct}%) • ${m.avg_lat.toFixed(2)}s avg</span>
      </div>
      <div class="stat-bar-track">
        <div class="stat-bar-fill" style="width: ${pct}%;"></div>
      </div>
    `;
    DOM.modelDistributionList.appendChild(row);
  });
}

function renderResolutionBreakdown(stats) {
  const total = stats.total_requests || 1;
  const succPct = Math.round((stats.success_count / total) * 100);
  const fbPct = Math.round((stats.fallback_count / total) * 100);
  const failPct = Math.round((stats.failure_count / total) * 100);

  DOM.barSegSuccess.style.width = `${succPct}%`;
  DOM.barSegFallback.style.width = `${fbPct}%`;
  DOM.barSegFailed.style.width = `${failPct}%`;

  DOM.legSuccessTxt.textContent = `Direct Success (${succPct}%)`;
  DOM.legFallbackTxt.textContent = `Fallback Recovered (${fbPct}%)`;
  DOM.legFailedTxt.textContent = `Total Failures (${failPct}%)`;
}

// ==========================================================================
// AUDIT LOGS FETCHING & FILTERING
// ==========================================================================
async function fetchLogs() {
  try {
    const search = DOM.logSearchInput.value.trim();
    const team = DOM.logTeamFilter.value;
    const status = DOM.logStatusFilter.value;

    let url = `/api/logs?limit=50`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (team !== 'all') url += `&team_id=${encodeURIComponent(team)}`;
    if (status !== 'all') url += `&status=${encodeURIComponent(status)}`;

    const res = await fetch(url);
    if (!res.ok) return;
    const data = await res.json();
    state.cachedLogs = data.logs || [];
    renderLogsTable(state.cachedLogs);
  } catch (err) {
    console.error('Failed to fetch logs:', err);
  }
}

function renderLogsTable(logs) {
  DOM.logsCountBadge.textContent = logs.length;

  if (!logs.length) {
    DOM.logsTableBody.innerHTML = `
      <tr>
        <td colspan="9" class="td-empty">No audit records match the current filter criteria.</td>
      </tr>`;
    return;
  }

  DOM.logsTableBody.innerHTML = '';
  logs.forEach(log => {
    const tr = document.createElement('tr');

    let statusChipClass = 'chip-success';
    let statusLabel = 'Success';
    if (log.status === 'fallback_success') {
      statusChipClass = 'chip-fallback';
      statusLabel = 'Failover Recovered';
    } else if (log.status === 'total_failure') {
      statusChipClass = 'chip-failure';
      statusLabel = 'Total Failure';
    }

    const timeFormatted = log.timestamp ? log.timestamp.split('T')[1]?.substring(0, 8) || log.timestamp : '--';

    tr.innerHTML = `
      <td><code>#${log.id}</code></td>
      <td style="color: var(--text-muted); font-size: 0.75rem;">${timeFormatted}</td>
      <td><strong>${escapeHtml(log.team_id)}</strong></td>
      <td title="${escapeHtml(log.model)}"><code>${escapeHtml(log.model)}</code></td>
      <td style="text-align: right; font-family: var(--font-mono);">${log.total_tokens || 0}</td>
      <td style="text-align: right; font-family: var(--font-mono); color: #facc15;">$${parseFloat(log.cost || 0).toFixed(6)}</td>
      <td style="text-align: right; font-family: var(--font-mono); color: var(--emerald-glow);">${parseFloat(log.latency || 0).toFixed(2)}s</td>
      <td style="text-align: center;"><span class="status-chip ${statusChipClass}">${statusLabel}</span></td>
      <td style="text-align: center;">
        <button class="btn btn-outline btn-xs btn-inspect-row" data-log-id="${log.id}">Inspect</button>
      </td>
    `;

    DOM.logsTableBody.appendChild(tr);
  });

  // Attach inspect clicks
  DOM.logsTableBody.querySelectorAll('.btn-inspect-row').forEach(btn => {
    btn.addEventListener('click', () => {
      const logId = parseInt(btn.dataset.logId, 10);
      const record = logs.find(l => l.id === logId);
      if (record) {
        openModal(`Audit Trace Details: Request #${record.id}`, record);
      }
    });
  });
}

// ==========================================================================
// TEAMS & QUOTAS MANAGEMENT
// ==========================================================================
async function fetchTeams() {
  try {
    const res = await fetch('/api/teams');
    if (!res.ok) return;
    const data = await res.json();
    renderTeams(data.teams || []);
  } catch (err) {
    console.error('Failed to fetch teams:', err);
  }
}

function renderTeams(teams) {
  const alpha = teams.find(t => t.id === 'team-alpha');
  if (alpha) {
    DOM.alphaTpmVals.textContent = `${alpha.current_tpm} / ${alpha.tpm_limit} TPM`;
    DOM.alphaTpmBar.style.width = `${alpha.tpm_percent}%`;

    DOM.alphaBudgetVals.textContent = `$${alpha.current_spend.toFixed(4)} / $${alpha.budget_limit.toFixed(2)}`;
    DOM.alphaBudgetBar.style.width = `${alpha.spend_percent}%`;
  }

  const beta = teams.find(t => t.id === 'team-beta');
  if (beta) {
    DOM.betaTpmVals.textContent = `${beta.current_tpm} / ${beta.tpm_limit.toLocaleString()} TPM`;
    DOM.betaTpmBar.style.width = `${beta.tpm_percent}%`;

    DOM.betaBudgetVals.textContent = `$${beta.current_spend.toFixed(4)} / $${beta.budget_limit.toFixed(2)}`;
    DOM.betaBudgetBar.style.width = `${beta.spend_percent}%`;
  }
}

async function triggerRateLimitBurst() {
  showToast('Firing burst of requests to trigger Team Alpha 150 TPM Rate Limit...', 'info');

  const requests = [1, 2, 3, 4].map(i => {
    return fetch('/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer team-alpha-key'
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b',
        messages: [{ role: 'user', content: 'Ping' }],
        max_tokens: 120, // 4 x 120 = 480 tokens > 150 TPM limit!
        stream: false
      })
    });
  });

  const responses = await Promise.all(requests);
  let got429 = false;
  let retryAfter = '60';

  for (const r of responses) {
    if (r.status === 429) {
      got429 = true;
      retryAfter = r.headers.get('Retry-After') || '54';
      const body = await r.json().catch(() => ({}));
      openModal('HTTP 429 Rate Limit Exceeded (Live Proof)', {
        http_status: 429,
        status_text: 'Too Many Requests',
        header_retry_after: `${retryAfter} seconds`,
        error_payload: body,
        explanation: 'Team Alpha is restricted to 150 Tokens Per Minute. The RateLimiter caught the token bucket overflow and gracefully responded with 429.'
      });
      break;
    }
  }

  if (got429) {
    showToast(`✓ HTTP 429 Triggered! Retry-After: ${retryAfter}s`, 'warning');
  } else {
    showToast('Burst completed. Check TPM gauge on quotas tab.', 'success');
  }

  fetchTeams();
  fetchLogs();
}

// ==========================================================================
// CODE STUDIO GENERATOR
// ==========================================================================
function updateCodeSnippets(lang = 'python') {
  const activeLang = lang || document.querySelector('.code-tab.active')?.dataset.code || 'python';
  const teamKey = state.activeTeamKey;
  const model = state.selectedModel;

  const baseUrl = (typeof window !== 'undefined' && window.location && window.location.origin) 
    ? `${window.location.origin}/v1` 
    : 'http://localhost:8000/v1';

  let snippet = '';

  if (activeLang === 'python') {
    snippet = `# Python OpenAI SDK Drop-In Replacement
from openai import OpenAI

# Connect directly to your Nexus Gateway proxy
client = OpenAI(
    base_url="${baseUrl}",
    api_key="${teamKey}"  # Authenticates tenant quotas
)

response = client.chat.completions.create(
    model="${model}",
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Explain why companies use an LLM API Gateway."}
    ],
    temperature=0.7,
    max_tokens=256
)

print(response.choices[0].message.content)`;
  } else if (activeLang === 'curl') {
    snippet = `# cURL Terminal Command
curl -X POST ${baseUrl}/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${teamKey}" \\
  -d '{
    "model": "${model}",
    "messages": [
      {"role": "user", "content": "Explain why companies use an LLM API Gateway."}
    ],
    "max_tokens": 256,
    "temperature": 0.7
  }'`;
  } else if (activeLang === 'nodejs') {
    snippet = `// Node.js OpenAI SDK Drop-In Replacement
import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: "${baseUrl}",
  apiKey: "${teamKey}",
});

async function main() {
  const completion = await openai.chat.completions.create({
    model: "${model}",
    messages: [
      { role: "user", content: "Explain why companies use an LLM API Gateway." }
    ],
    max_tokens: 256,
  });

  console.log(completion.choices[0].message.content);
}

main();`;
  }

  DOM.codeDisplay.textContent = snippet;
}

// ==========================================================================
// MODAL & TOAST HELPERS
// ==========================================================================
function openModal(title, data) {
  document.getElementById('trace-modal-title').textContent = title;
  DOM.traceJsonContent.textContent = JSON.stringify(data, null, 2);
  DOM.traceModal.classList.remove('hidden');
}

function closeModal() {
  DOM.traceModal.classList.add('hidden');
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const icon = type === 'success' ? '✓' : type === 'warning' ? '⚠️' : type === 'error' ? '✕' : 'ℹ️';

  toast.innerHTML = `
    <span>${icon}</span>
    <span>${escapeHtml(message)}</span>
  `;

  DOM.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.25s ease';
    setTimeout(() => toast.remove(), 250);
  }, 3500);
}

// ==========================================================================
// AUTO-SYNC HEARTBEAT
// ==========================================================================
function startAutoSync() {
  stopAutoSync();
  state.syncIntervalId = setInterval(() => {
    if (state.autoSync) {
      fetchStats();
      fetchTeams();
      if (state.activeTab === 'logs') {
        fetchLogs();
      }
    }
  }, 3000);
}

function stopAutoSync() {
  if (state.syncIntervalId) {
    clearInterval(state.syncIntervalId);
    state.syncIntervalId = null;
  }
}

// Utility Functions
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

function escapeHtml(str) {
  if (typeof str !== 'string') return String(str);
  return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
}
