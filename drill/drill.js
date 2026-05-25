// ============================================================
// Drill — pure arithmetic generators with advanced tuning
// ============================================================

const Drill = (() => {
  const { randInt, choice, gcd } = Engine;

  const maybeNegate = (n, allow) => (allow && Math.random() < 0.25) ? -n : n;
  const fmt = (n) => n < 0 ? `(${n})` : String(n);

  // Resolve number range. If advanced custom range is set, use it.
  // Otherwise use difficulty defaults.
  function getRange(d, adv, defaults) {
    if (adv.customRange) {
      return [Math.max(0, adv.minNum), Math.max(adv.minNum + 1, adv.maxNum)];
    }
    return defaults[d];
  }

  // ---------- Addition ----------
  function genAdd(d, adv) {
    if (adv.allowFractions && Math.random() < 0.4) return genAddFrac(d, adv);
    const [lo, hi] = getRange(d, adv, { easy: [5, 50], medium: [10, 200], hard: [50, 1000] });
    let a = randInt(lo, hi);
    let b = randInt(lo, hi);
    a = maybeNegate(a, adv.allowNegatives);
    b = maybeNegate(b, adv.allowNegatives);
    return {
      question: `<span class="m">${fmt(a)} + ${fmt(b)} = ?</span>`,
      answer: a + b,
      topic: 'add', topicLabel: 'חיבור',
    };
  }

  // ---------- Subtraction ----------
  function genSub(d, adv) {
    if (adv.allowFractions && Math.random() < 0.4) return genSubFrac(d, adv);
    const [lo, hi] = getRange(d, adv, { easy: [10, 50], medium: [20, 300], hard: [50, 1000] });
    let a = randInt(lo, hi);
    let b = randInt(Math.max(1, Math.floor(lo / 2)), Math.max(2, a - 1));
    if (adv.allowNegatives) { a = maybeNegate(a, true); b = maybeNegate(b, true); }
    return {
      question: `<span class="m">${fmt(a)} − ${fmt(b)} = ?</span>`,
      answer: a - b,
      topic: 'sub', topicLabel: 'חיסור',
    };
  }

  // ---------- Multiplication ----------
  function genMul(d, adv) {
    let a, b;
    if (adv.customRange) {
      const [lo, hi] = [Math.max(2, adv.minNum), Math.max(3, adv.maxNum)];
      a = randInt(lo, hi); b = randInt(lo, hi);
    } else if (d === 'easy') { a = randInt(2, 9); b = randInt(2, 12); }
    else if (d === 'medium') { a = randInt(3, 15); b = randInt(3, 20); }
    else { a = randInt(5, 25); b = randInt(5, 30); }
    a = maybeNegate(a, adv.allowNegatives);
    b = maybeNegate(b, adv.allowNegatives);
    return {
      question: `<span class="m">${fmt(a)} × ${fmt(b)} = ?</span>`,
      answer: a * b,
      topic: 'mul', topicLabel: 'כפל',
    };
  }

  // ---------- Division (always integer result) ----------
  function genDiv(d, adv) {
    let divisor, answer;
    if (d === 'easy') { divisor = randInt(2, 9); answer = randInt(2, 10); }
    else if (d === 'medium') { divisor = randInt(2, 15); answer = randInt(3, 15); }
    else { divisor = randInt(3, 20); answer = randInt(5, 25); }
    let dividend = divisor * answer;
    if (adv.allowNegatives && Math.random() < 0.35) {
      if (Math.random() < 0.5) { dividend = -dividend; answer = -answer; }
      else { divisor = -divisor; answer = -answer; }
    }
    return {
      question: `<span class="m">${fmt(dividend)} ÷ ${fmt(divisor)} = ?</span>`,
      answer,
      topic: 'div', topicLabel: 'חילוק',
    };
  }

  // ---------- Powers ----------
  function genPow(d, adv) {
    const maxExp = adv.maxExp || (d === 'easy' ? 3 : d === 'medium' ? 4 : 5);
    let base, exp;
    if (d === 'easy') { base = randInt(2, 6); exp = randInt(2, Math.min(3, maxExp)); }
    else if (d === 'medium') {
      base = randInt(2, 10); exp = randInt(2, maxExp);
      let guard = 0;
      while (Math.pow(Math.abs(base), exp) > 10000 && guard < 20) {
        base = randInt(2, 8); exp = randInt(2, Math.min(maxExp, 4)); guard++;
      }
    } else {
      base = randInt(2, 15); exp = randInt(2, maxExp);
      let guard = 0;
      while (Math.pow(Math.abs(base), exp) > 100000 && guard < 20) {
        base = randInt(2, 10); exp = randInt(2, Math.min(maxExp, 4)); guard++;
      }
    }
    if (adv.allowNegatives && Math.random() < 0.3) base = -base;
    const supMap = { 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸' };
    const expDisplay = supMap[exp] || `^${exp}`;
    return {
      question: `<span class="m">${fmt(base)}${expDisplay} = ?</span>`,
      answer: Math.pow(base, exp),
      topic: 'pow', topicLabel: 'חזקות',
    };
  }

  // ---------- Roots ----------
  function genRoot(d, adv) {
    const allowCube = adv.includeCubeRoot || d === 'hard';
    if (allowCube && Math.random() < 0.4) {
      const answer = randInt(2, d === 'easy' ? 5 : d === 'medium' ? 7 : 10);
      return {
        question: `<span class="m">∛${answer ** 3} = ?</span>`,
        answer,
        topic: 'root', topicLabel: 'שורשים',
      };
    }
    let answer;
    if (d === 'easy') answer = randInt(2, 8);
    else if (d === 'medium') answer = randInt(3, 12);
    else answer = randInt(5, 25);
    return {
      question: `<span class="m">√${answer * answer} = ?</span>`,
      answer,
      topic: 'root', topicLabel: 'שורשים',
    };
  }

  // ---------- Mixed expressions ----------
  function genMixed(d, adv) {
    const maxBase = d === 'easy' ? 10 : d === 'medium' ? 20 : 30;
    const useThree = adv.mixedThreeOps;
    if (useThree) return genMixedThree(d, maxBase);

    const variant = randInt(1, 5);
    let q, ans;
    if (variant === 1) {
      const a = randInt(2, maxBase), b = randInt(2, maxBase), c = randInt(2, 9);
      q = `(${a} + ${b}) × ${c}`; ans = (a + b) * c;
    } else if (variant === 2) {
      const a = randInt(2, 12), b = randInt(2, 12), c = randInt(1, maxBase);
      q = `${a} × ${b} + ${c}`; ans = a * b + c;
    } else if (variant === 3) {
      const a = randInt(3, 12), b = randInt(3, 12), c = randInt(1, maxBase);
      q = `${a} × ${b} − ${c}`; ans = a * b - c;
    } else if (variant === 4) {
      const a = randInt(maxBase, maxBase * 2), b = randInt(2, a - 1), c = randInt(2, 8);
      q = `(${a} − ${b}) × ${c}`; ans = (a - b) * c;
    } else {
      const a = randInt(2, d === 'easy' ? 5 : 9);
      const b = randInt(2, maxBase);
      q = `${a}² + ${b}`; ans = a * a + b;
    }
    return {
      question: `<span class="m">${q} = ?</span>`,
      answer: ans,
      topic: 'mixed', topicLabel: 'מעורב',
    };
  }

  function genMixedThree(d, maxBase) {
    const variant = randInt(1, 4);
    let q, ans;
    if (variant === 1) {
      // a × b + c × d
      const a = randInt(2, 12), b = randInt(2, 12), c = randInt(2, 10), e = randInt(2, 10);
      q = `${a} × ${b} + ${c} × ${e}`; ans = a*b + c*e;
    } else if (variant === 2) {
      // (a + b) × c − d
      const a = randInt(2, maxBase), b = randInt(2, maxBase), c = randInt(2, 6), e = randInt(1, maxBase);
      q = `(${a} + ${b}) × ${c} − ${e}`; ans = (a + b) * c - e;
    } else if (variant === 3) {
      // a² + b × c
      const a = randInt(2, 9), b = randInt(2, 12), c = randInt(2, 9);
      q = `${a}² + ${b} × ${c}`; ans = a*a + b*c;
    } else {
      // (a − b)² + c
      const a = randInt(5, 15), b = randInt(2, a - 1), c = randInt(2, maxBase);
      q = `(${a} − ${b})² + ${c}`; ans = (a - b) * (a - b) + c;
    }
    return {
      question: `<span class="m">${q} = ?</span>`,
      answer: ans,
      topic: 'mixed', topicLabel: 'מעורב',
    };
  }

  // ---------- Fraction addition ----------
  function genAddFrac(d, adv) {
    const denomPool = d === 'easy' ? [2, 3, 4] : d === 'medium' ? [2, 3, 4, 5, 6] : [2, 3, 4, 5, 6, 8, 10];
    const d1 = choice(denomPool);
    const d2 = choice(denomPool);
    const n1 = randInt(1, d1 - 1);
    const n2 = randInt(1, d2 - 1);
    const num = n1 * d2 + n2 * d1;
    const den = d1 * d2;
    const g = gcd(num, den);
    const fn = num / g;
    const fd = den / g;
    const displayAnswer = fd === 1 ? String(fn) : `${fn}/${fd}`;
    const frac = (t, b) => `<span class="frac"><span class="num">${t}</span><span class="den">${b}</span></span>`;
    return {
      question: `${frac(n1, d1)} + ${frac(n2, d2)} = ?`,
      answer: num / den,
      displayAnswer,
      topic: 'add', topicLabel: 'חיבור (שברים)',
    };
  }

  // ---------- Fraction subtraction ----------
  function genSubFrac(d, adv) {
    const denomPool = d === 'easy' ? [2, 3, 4] : d === 'medium' ? [2, 3, 4, 5, 6] : [2, 3, 4, 5, 6, 8, 10];
    const d1 = choice(denomPool);
    const d2 = choice(denomPool);
    const n1 = randInt(1, d1 - 1);
    const n2 = randInt(1, d2 - 1);
    let num = n1 * d2 - n2 * d1;
    const frac = (t, b) => `<span class="frac"><span class="num">${t}</span><span class="den">${b}</span></span>`;
    let q;
    if (num >= 0) {
      q = `${frac(n1, d1)} − ${frac(n2, d2)}`;
    } else {
      q = `${frac(n2, d2)} − ${frac(n1, d1)}`;
      num = -num;
    }
    const den = d1 * d2;
    const g = num === 0 ? den : gcd(num, den);
    const fn = num / g;
    const fd = den / g;
    const displayAnswer = fd === 1 ? String(fn) : `${fn}/${fd}`;
    return {
      question: `${q} = ?`,
      answer: num / den,
      displayAnswer,
      topic: 'sub', topicLabel: 'חיסור (שברים)',
    };
  }

  // ---------- Dispatcher ----------
  const generators = {
    add: genAdd, sub: genSub, mul: genMul, div: genDiv,
    pow: genPow, root: genRoot, mixed: genMixed,
  };

  function generate(config) {
    const topic = choice(config.topics);
    const gen = generators[topic] || genAdd;
    const q = gen(config.difficulty, config.advanced || {});
    if (config.answerMode === 'choice' && !q.choices) {
      q.choices = Engine.makeChoices(q.answer, q.distractorHint);
    }
    return q;
  }

  return { generate };
})();
