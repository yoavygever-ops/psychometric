// ============================================================
// Session engine — manages timer, score, question flow
// ============================================================

const Engine = (() => {

  // ---------- Random helpers (exposed) ----------
  const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const choice = (arr) => arr[randInt(0, arr.length - 1)];
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = randInt(0, i);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); return b === 0 ? a : gcd(b, a % b); };

  // ---------- Answer parsing & checking ----------
  function parseAnswer(str) {
    if (str === null || str === undefined) return null;
    if (typeof str === 'number') return str;
    let s = String(str).trim().replace(/−/g, '-').replace(/\s+/g, '');
    if (!s) return null;
    if (s.includes('/')) {
      const parts = s.split('/');
      if (parts.length !== 2) return null;
      const n = parseFloat(parts[0]);
      const d = parseFloat(parts[1]);
      if (isNaN(n) || isNaN(d) || d === 0) return null;
      return n / d;
    }
    const num = parseFloat(s);
    return isNaN(num) ? null : num;
  }

  function checkAnswer(userAnswer, correctAnswer) {
    if (typeof correctAnswer === 'number') {
      const num = parseAnswer(userAnswer);
      if (num === null) return false;
      return Math.abs(num - correctAnswer) < 0.001;
    }
    return String(userAnswer).trim() === String(correctAnswer).trim();
  }

  // ---------- Distractor generation for multiple choice ----------
  // Generators can pass a `hint` to get type-appropriate distractors,
  // or return their own `choices` array to fully control the options.
  function makeChoices(correct, hint) {
    if (hint === 'digit') return makeDigitChoices(correct);
    if (hint === 'probability') return makeProbabilityChoices(correct);
    if (hint === 'count') return makeCountChoices(correct);
    if (hint === 'factorial') return makeFactorialChoices(correct);
    if (hint === 'gcd') return makeGcdChoices(correct);
    if (hint === 'small_positive') return makeSmallPositiveChoices(correct);
    if (hint === 'positive_int') return makePositiveIntChoices(correct);
    return makeDefaultChoices(correct);
  }

  // Positive integer answer — varied scale, never zero or negative
  function makePositiveIntChoices(correct) {
    const set = new Set([correct]);
    const scale = Math.max(1, Math.floor(Math.abs(correct) * 0.1));
    const strategies = [
      () => correct + randInt(1, 3),
      () => correct - randInt(1, 3),
      () => correct + randInt(scale * 2, scale * 5),
      () => correct - randInt(scale * 2, scale * 5),
      () => Math.round(correct * 1.5),
      () => Math.round(correct * 0.5),
      () => Math.round(correct * 1.25),
      () => Math.round(correct * 0.75),
      () => correct * 2,
      () => correct + scale * 10,
    ];
    let tries = 0;
    while (set.size < 4 && tries < 80) {
      tries++;
      let w = Math.round(choice(strategies)());
      if (w === correct || w <= 0) continue;
      set.add(w);
    }
    while (set.size < 4) set.add(correct + set.size * scale * 3);
    return shuffle(Array.from(set));
  }

  // Units digit: 0-9 only
  function makeDigitChoices(correct) {
    const pool = [0,1,2,3,4,5,6,7,8,9].filter(d => d !== correct);
    const picks = shuffle(pool).slice(0, 3);
    return shuffle([correct, ...picks]);
  }

  // Probability: simple fractions between 0 and 1
  function makeProbabilityChoices(correct) {
    const cands = [
      1/2, 1/3, 2/3, 1/4, 3/4, 1/5, 2/5, 3/5, 4/5,
      1/6, 5/6, 1/8, 3/8, 5/8, 7/8,
      1/9, 2/9, 4/9, 5/9, 7/9, 8/9,
      1/12, 5/12, 7/12, 11/12,
      1/16, 3/16, 7/16, 9/16, 15/16,
      Math.max(0.01, 1 - correct),
      Math.min(0.99, correct * 2),
      Math.max(0.01, correct / 2),
    ];
    const valid = cands.filter(x => x > 0 && x < 1 && Math.abs(x - correct) > 0.005);
    const picks = [];
    const shuffled = shuffle(valid);
    for (const c of shuffled) {
      if (picks.length >= 3) break;
      if (picks.every(p => Math.abs(p - c) > 0.005)) picks.push(c);
    }
    return shuffle([correct, ...picks]);
  }

  // Count: non-negative integers, varied distance to avoid middle-bias
  function makeCountChoices(correct) {
    const set = new Set([correct]);
    const pool = [];
    // Close (±1-3), medium (±4-8), far (±10-20)
    for (let i = 1; i <= 3; i++) { pool.push(correct + i); if (correct - i >= 0) pool.push(correct - i); }
    for (let i = 4; i <= 8; i += 2) { pool.push(correct + i); if (correct - i >= 0) pool.push(correct - i); }
    for (let i = 10; i <= 20; i += 5) { pool.push(correct + i); if (correct - i >= 0) pool.push(correct - i); }
    // Mix near + far for variety
    const shuffled = shuffle(pool);
    for (const v of shuffled) {
      if (set.size >= 4) break;
      if (v >= 0) set.add(v);
    }
    return shuffle(Array.from(set));
  }

  // Factorial / combinatoric: positive ints, often near factorial-like values
  function makeFactorialChoices(correct) {
    const set = new Set([correct]);
    const factorials = [6, 24, 120, 720, 5040, 40320];
    const combos = [10, 15, 20, 21, 28, 35, 36, 45, 56, 70, 84, 120, 126, 210, 252, 330];
    const pool = [
      ...factorials.filter(f => f !== correct && Math.abs(f - correct) < correct * 3),
      ...combos.filter(c => c !== correct && Math.abs(c - correct) < correct * 3),
      Math.round(correct / 2),
      correct * 2,
      correct + correct / 4,
      correct - Math.max(1, Math.round(correct * 0.1)),
    ].filter(v => v > 0 && v !== correct && Number.isInteger(v));
    const shuffled = shuffle(pool);
    for (const v of shuffled) {
      if (set.size >= 4) break;
      set.add(v);
    }
    while (set.size < 4) set.add(correct + set.size * 7);
    return shuffle(Array.from(set));
  }

  // GCD: small positive integers
  function makeGcdChoices(correct) {
    const set = new Set([correct]);
    const pool = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 15, 16, 18, 20, 24].filter(v => v !== correct);
    const shuffled = shuffle(pool);
    for (const v of shuffled) {
      if (set.size >= 4) break;
      set.add(v);
    }
    return shuffle(Array.from(set));
  }

  // Small positive integer (e.g., work hours, ratio q)
  function makeSmallPositiveChoices(correct) {
    const set = new Set([correct]);
    const pool = [];
    for (let i = 1; i <= 15; i++) if (i !== correct) pool.push(i);
    const shuffled = shuffle(pool);
    for (const v of shuffled) {
      if (set.size >= 4) break;
      set.add(v);
    }
    return shuffle(Array.from(set));
  }

  // Default: varied-distance distractors for arbitrary integer answers
  function makeDefaultChoices(correct) {
    const set = new Set([correct]);
    const isInt = Number.isInteger(correct);
    const absC = Math.abs(correct);
    // Distractor strategies — spread to avoid middle-bias
    const strategies = [
      () => correct + randInt(1, 3),
      () => correct - randInt(1, 3),
      () => correct + randInt(5, 12),
      () => correct - randInt(5, 12),
      () => -correct,
      () => correct * 2,
      () => Math.round(correct / 2),
      () => correct + randInt(15, 30),
      () => correct - randInt(15, 30),
      () => correct + Math.max(1, Math.round(absC * 0.3)),
      () => correct - Math.max(1, Math.round(absC * 0.3)),
    ];
    let tries = 0;
    while (set.size < 4 && tries < 80) {
      tries++;
      const fn = choice(strategies);
      let w = fn();
      if (isInt) w = Math.round(w);
      else w = Math.round(w * 100) / 100;
      if (w === correct) continue;
      if (set.has(w)) continue;
      set.add(w);
    }
    while (set.size < 4) set.add(correct + (set.size * 11));
    return shuffle(Array.from(set));
  }

  // ---------- Session class ----------
  class Session {
    constructor(config, generator) {
      this.config = config; // { topics, difficulty, advanced, answerMode, timeLimit, questionCount }
      this.generator = generator; // function (config) => question
      this.score = 0;
      this.correct = 0;
      this.wrong = 0;
      this.streak = 0;
      this.bestStreak = 0;
      this.questionsAnswered = 0;
      this.byTopic = {};
      this.current = null;
      this.timerId = null;
      this.timeLeft = 0;
      this.onTick = null;
      this.onTimeout = null;
      this.answered = false;
    }

    nextQuestion() {
      this.answered = false;
      this.current = this.generator(this.config);
      this._startTimer();
      return this.current;
    }

    _startTimer() {
      this._stopTimer();
      if (!this.config.timeLimit) return;
      this.timeLeft = this.config.timeLimit;
      if (this.onTick) this.onTick(this.timeLeft, this.config.timeLimit);
      this.timerId = setInterval(() => {
        this.timeLeft--;
        if (this.onTick) this.onTick(this.timeLeft, this.config.timeLimit);
        if (this.timeLeft <= 0) {
          this._stopTimer();
          if (!this.answered && this.onTimeout) this.onTimeout();
        }
      }, 1000);
    }

    _stopTimer() {
      if (this.timerId) { clearInterval(this.timerId); this.timerId = null; }
    }

    submitAnswer(answer) {
      if (this.answered) return null;
      this.answered = true;
      this._stopTimer();
      const isCorrect = checkAnswer(answer, this.current.answer);
      this.questionsAnswered++;
      const topic = this.current.topic || 'unknown';
      if (!this.byTopic[topic]) this.byTopic[topic] = { correct: 0, total: 0, label: this.current.topicLabel || topic };
      this.byTopic[topic].total++;
      if (isCorrect) {
        this.correct++;
        this.streak++;
        this.bestStreak = Math.max(this.bestStreak, this.streak);
        this.score += 10 + Math.min(this.streak * 2, 20);
        this.byTopic[topic].correct++;
      } else {
        this.wrong++;
        this.streak = 0;
      }
      return { correct: isCorrect, expected: this.current.answer, displayAnswer: this.current.displayAnswer };
    }

    isFinished() {
      return this.config.questionCount > 0 && this.questionsAnswered >= this.config.questionCount;
    }

    stop() {
      this._stopTimer();
    }
  }

  return { Session, randInt, choice, shuffle, gcd, parseAnswer, checkAnswer, makeChoices };
})();
