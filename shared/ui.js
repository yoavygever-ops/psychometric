// ============================================================
// UI helpers — settings, question, keypad, feedback, effects, summary
// ============================================================

const UI = (() => {

  // ============================================================
  // Visual effects
  // ============================================================
  function celebrate() {
    const colors = ['#10b981', '#34d399', '#6ee7b7', '#fbbf24', '#f59e0b', '#60a5fa', '#a78bfa'];
    const container = document.body;
    for (let i = 0; i < 22; i++) {
      const p = document.createElement('div');
      p.className = 'confetti';
      p.style.background = colors[Math.floor(Math.random() * colors.length)];
      p.style.left = (35 + Math.random() * 30) + '%';
      p.style.top = '42%';
      const angle = Math.random() * Math.PI * 2;
      const dist = 100 + Math.random() * 220;
      p.style.setProperty('--tx', Math.cos(angle) * dist + 'px');
      p.style.setProperty('--ty', (Math.sin(angle) * dist + 80) + 'px');
      p.style.setProperty('--rot', (Math.random() * 720) + 'deg');
      p.style.animationDelay = (Math.random() * 80) + 'ms';
      container.appendChild(p);
      setTimeout(() => p.remove(), 1200);
    }
  }

  function shake(el) {
    if (!el) return;
    el.classList.remove('shake');
    void el.offsetWidth; // restart animation
    el.classList.add('shake');
    setTimeout(() => el.classList.remove('shake'), 500);
  }

  function flashRed() {
    const flash = document.createElement('div');
    flash.className = 'flash-red';
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 600);
  }

  // ============================================================
  // Settings page
  // ============================================================
  function buildSettings(opts) {
    const c = opts.container;
    c.innerHTML = `
      <div class="settings-section">
        <h2>נושאים</h2>
        <div class="topic-grid">
          ${opts.topics.map(t => `
            <label class="topic-chip">
              <input type="checkbox" value="${t.id}" checked>
              <span class="topic-chip-label">${t.label}</span>
            </label>
          `).join('')}
        </div>
      </div>

      <div class="settings-section">
        <h2>קושי</h2>
        <div class="radio-row">
          <label><input type="radio" name="difficulty" value="easy"><span>קל</span></label>
          <label><input type="radio" name="difficulty" value="medium" checked><span>בינוני</span></label>
          <label><input type="radio" name="difficulty" value="hard"><span>קשה</span></label>
        </div>
        ${opts.advancedHTML ? `
          <details class="advanced">
            <summary>כוונון מתקדם</summary>
            <div>${opts.advancedHTML}</div>
          </details>
        ` : ''}
      </div>

      <div class="settings-section">
        <h2>סוג תשובה</h2>
        <div class="radio-row">
          <label><input type="radio" name="answerMode" value="choice" checked><span>בחירה מ-4</span></label>
          <label><input type="radio" name="answerMode" value="write"><span>כתיבה</span></label>
        </div>
      </div>

      <div class="settings-section">
        <h2>טיימר</h2>
        <div class="toggle-row">
          <label for="timer-toggle">הגבלת זמן לשאלה</label>
          <input type="checkbox" id="timer-toggle" class="toggle">
        </div>
        <div class="input-row">
          <label>שניות לשאלה</label>
          <input type="number" id="timer-seconds" min="5" max="600" value="30" disabled>
        </div>
      </div>

      <div class="settings-section">
        <h2>כמות שאלות</h2>
        <div class="toggle-row">
          <label for="infinite-toggle">אינסופי (עד שעוצרים)</label>
          <input type="checkbox" id="infinite-toggle" class="toggle" checked>
        </div>
        <div class="input-row">
          <label>מספר שאלות</label>
          <input type="number" id="question-count" min="1" max="200" value="10" disabled>
        </div>
      </div>

      <button class="btn" id="start-btn">התחל ▸</button>
    `;

    const timerToggle = c.querySelector('#timer-toggle');
    const timerSeconds = c.querySelector('#timer-seconds');
    timerToggle.addEventListener('change', () => { timerSeconds.disabled = !timerToggle.checked; });

    const infToggle = c.querySelector('#infinite-toggle');
    const qCount = c.querySelector('#question-count');
    infToggle.addEventListener('change', () => { qCount.disabled = infToggle.checked; });

    // Wire any inter-dependent advanced toggles
    if (opts.wireAdvanced) opts.wireAdvanced(c);

    c.querySelector('#start-btn').addEventListener('click', () => {
      const topics = Array.from(c.querySelectorAll('.topic-chip input:checked')).map(i => i.value);
      if (topics.length === 0) { alert('יש לבחור לפחות נושא אחד'); return; }
      const difficulty = c.querySelector('input[name="difficulty"]:checked').value;
      const answerMode = c.querySelector('input[name="answerMode"]:checked').value;
      const timeLimit = timerToggle.checked ? parseInt(timerSeconds.value, 10) : 0;
      const questionCount = infToggle.checked ? 0 : parseInt(qCount.value, 10);
      const advanced = opts.collectAdvanced ? opts.collectAdvanced(c) : {};
      opts.onStart({ topics, difficulty, answerMode, timeLimit, questionCount, advanced });
    });
  }

  // ============================================================
  // Session shell
  // ============================================================
  function buildSession(container) {
    container.innerHTML = `
      <div class="session-header">
        <button class="stop" id="stop-btn">עצור ◂</button>
        <div class="session-stat" id="progress-stat"></div>
        <div class="session-score" id="score-stat">0</div>
      </div>
      <div class="timer-bar" id="timer-bar" hidden>
        <div class="timer-fill" id="timer-fill" style="width:100%"></div>
      </div>
      <div class="question-card" id="question-card">
        <div class="label" id="q-label">שאלה</div>
        <div class="question-text" id="q-text"></div>
      </div>
      <div id="answer-area"></div>
      <div id="feedback-area"></div>
    `;
    return {
      stopBtn: container.querySelector('#stop-btn'),
      progressStat: container.querySelector('#progress-stat'),
      scoreStat: container.querySelector('#score-stat'),
      timerBar: container.querySelector('#timer-bar'),
      timerFill: container.querySelector('#timer-fill'),
      qLabel: container.querySelector('#q-label'),
      qText: container.querySelector('#q-text'),
      qCard: container.querySelector('#question-card'),
      answerArea: container.querySelector('#answer-area'),
      feedbackArea: container.querySelector('#feedback-area'),
    };
  }

  // ============================================================
  // Render question + answer interface
  // ============================================================
  function renderQuestion(refs, question, mode, onAnswer) {
    refs.qLabel.textContent = question.topicLabel || 'שאלה';
    refs.qText.innerHTML = question.question;
    refs.feedbackArea.innerHTML = '';

    if (mode === 'choice') {
      renderChoiceMode(refs, question, onAnswer);
    } else {
      renderWriteMode(refs, question, onAnswer);
    }
  }

  function renderChoiceMode(refs, question, onAnswer) {
    const choices = question.choices || Engine.makeChoices(question.answer);
    refs.answerArea.innerHTML = `<div class="choices">${
      choices.map((c, i) => `<button class="choice" data-idx="${i}">${formatChoice(c)}</button>`).join('')
    }</div>`;
    refs.answerArea.querySelectorAll('.choice').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx, 10);
        onAnswer(choices[idx], btn);
      });
    });
  }

  function renderWriteMode(refs, question, onAnswer) {
    refs.answerArea.innerHTML = `
      <div class="keypad-display empty" id="kp-display">הקלידו תשובה</div>
      <div class="keypad" id="keypad">
        <button class="kp-btn" data-key="7">7</button>
        <button class="kp-btn" data-key="8">8</button>
        <button class="kp-btn" data-key="9">9</button>
        <button class="kp-btn" data-key="4">4</button>
        <button class="kp-btn" data-key="5">5</button>
        <button class="kp-btn" data-key="6">6</button>
        <button class="kp-btn" data-key="1">1</button>
        <button class="kp-btn" data-key="2">2</button>
        <button class="kp-btn" data-key="3">3</button>
        <button class="kp-btn kp-action" data-key=".">.</button>
        <button class="kp-btn" data-key="0">0</button>
        <button class="kp-btn kp-action" data-key="/">/</button>
        <button class="kp-btn kp-action" data-key="neg">±</button>
        <button class="kp-btn kp-action" data-key="back">⌫</button>
        <button class="kp-btn kp-submit" data-key="submit">בדוק</button>
      </div>
    `;

    const display = refs.answerArea.querySelector('#kp-display');
    const keypad = refs.answerArea.querySelector('#keypad');
    let value = '';

    const updateDisplay = () => {
      if (!value) {
        display.textContent = 'הקלידו תשובה';
        display.classList.add('empty');
      } else {
        display.textContent = value;
        display.classList.remove('empty');
      }
    };

    const handleKey = (k) => {
      if (k === 'back') {
        value = value.slice(0, -1);
      } else if (k === 'neg') {
        if (value.startsWith('-')) value = value.slice(1);
        else value = '-' + value;
      } else if (k === 'submit') {
        if (!value || value === '-') return;
        onAnswer(value, display);
        return;
      } else if (k === '.') {
        if (value.includes('.') || value.includes('/')) return;
        if (value === '' || value === '-') value += '0';
        value += '.';
      } else if (k === '/') {
        if (value.includes('/') || value.includes('.')) return;
        if (value === '' || value === '-') return;
        value += '/';
      } else {
        // digit
        value += k;
      }
      updateDisplay();
    };

    keypad.addEventListener('click', (e) => {
      const btn = e.target.closest('.kp-btn');
      if (!btn || btn.disabled) return;
      handleKey(btn.dataset.key);
    });
  }

  function formatChoice(v) {
    if (Number.isInteger(v)) return String(v);
    return String(Math.round(v * 1000) / 1000);
  }

  // ============================================================
  // Show feedback + effects
  // ============================================================
  function showFeedback(refs, question, mode, result, userTarget) {
    // Visual effects
    if (result.correct) {
      celebrate();
    } else {
      shake(refs.qCard);
      flashRed();
    }

    // Lock the answer UI + highlight
    if (mode === 'choice') {
      refs.answerArea.querySelectorAll('.choice').forEach((b) => {
        b.disabled = true;
        const idx = parseInt(b.dataset.idx, 10);
        const c = question.choices[idx];
        if (Engine.checkAnswer(c, question.answer)) b.classList.add('correct');
        else if (b === userTarget) b.classList.add('wrong');
      });
    } else {
      const display = refs.answerArea.querySelector('#kp-display');
      if (display) {
        display.classList.remove('empty');
        display.classList.add(result.correct ? 'correct' : 'wrong');
      }
      refs.answerArea.querySelectorAll('.kp-btn').forEach(b => b.disabled = true);
    }

    // Feedback text
    const expectedStr = result.displayAnswer || formatChoice(result.expected);
    refs.feedbackArea.innerHTML = `
      <div class="feedback ${result.correct ? 'correct' : 'wrong'}">
        <strong>${result.correct ? '✓ נכון!' : '✗ לא נכון'}</strong>
        ${!result.correct ? `<span class="correct-answer">תשובה נכונה: <span class="m">${expectedStr}</span></span>` : ''}
      </div>
    `;
  }

  // ============================================================
  // Timer + stats
  // ============================================================
  function updateTimer(refs, timeLeft, total) {
    if (!total) { refs.timerBar.hidden = true; return; }
    refs.timerBar.hidden = false;
    const pct = Math.max(0, (timeLeft / total) * 100);
    refs.timerFill.style.width = pct + '%';
    refs.timerFill.classList.remove('warn', 'danger');
    if (pct < 25) refs.timerFill.classList.add('danger');
    else if (pct < 50) refs.timerFill.classList.add('warn');
  }

  function updateStats(refs, session) {
    refs.scoreStat.textContent = session.score;
    const q = session.questionsAnswered + (session.answered ? 0 : 1);
    if (session.config.questionCount > 0) {
      refs.progressStat.textContent = `${q} / ${session.config.questionCount}`;
    } else {
      refs.progressStat.textContent = `שאלה ${q}`;
    }
  }

  // ============================================================
  // Summary screen
  // ============================================================
  function renderSummary(container, session, onAgain, onHome) {
    const pct = session.questionsAnswered > 0
      ? Math.round((session.correct / session.questionsAnswered) * 100)
      : 0;
    const emoji = pct >= 80 ? '🏆' : pct >= 60 ? '💪' : pct >= 40 ? '📚' : '✨';
    container.innerHTML = `
      <div class="summary-card">
        <div style="font-size:48px">${emoji}</div>
        <div class="summary-big">${session.score}</div>
        <div class="summary-pct">${session.correct} / ${session.questionsAnswered} נכונות (${pct}%)</div>
        <div class="summary-stats">
          <div class="summary-stat">
            <div class="summary-stat-val">${session.correct}</div>
            <div class="summary-stat-label">נכונות</div>
          </div>
          <div class="summary-stat">
            <div class="summary-stat-val">${session.wrong}</div>
            <div class="summary-stat-label">שגויות</div>
          </div>
          <div class="summary-stat">
            <div class="summary-stat-val">${session.bestStreak}</div>
            <div class="summary-stat-label">רצף שיא</div>
          </div>
        </div>
      </div>
      ${Object.keys(session.byTopic).length > 1 ? `
        <div class="topic-breakdown">
          ${Object.entries(session.byTopic).map(([id, s]) => {
            const p = s.total > 0 ? Math.round(s.correct / s.total * 100) : 0;
            return `<div class="topic-breakdown-row">
              <span>${s.label}</span>
              <span class="pct">${s.correct}/${s.total} · ${p}%</span>
            </div>`;
          }).join('')}
        </div>
      ` : ''}
      <button class="btn" id="again-btn">סשן חדש</button>
      <button class="btn btn-secondary" id="home-btn">חזרה לדף הבית</button>
    `;
    container.querySelector('#again-btn').addEventListener('click', onAgain);
    container.querySelector('#home-btn').addEventListener('click', onHome);
  }

  return {
    buildSettings, buildSession,
    renderQuestion, showFeedback,
    updateTimer, updateStats,
    renderSummary, formatChoice,
    celebrate, shake, flashRed,
  };
})();
