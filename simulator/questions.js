// ============================================================
// Simulator — procedural psychometric-style word questions
// ============================================================

const Simulator = (() => {
  const { randInt, choice, gcd } = Engine;

  // ============================================================
  // 1. Powers — base equalizing
  //    e.g. 2^x · 4^y = 32 → find x + 2y
  // ============================================================
  function genPowerBase(d, adv) {
    const big = adv.largeNumbers;
    const base = choice([2, 3]);
    const modes = base === 2
      ? [{ exp: 2, name: 4 }, { exp: 3, name: 8 }, { exp: 4, name: 16 }]
      : [{ exp: 2, name: 9 }, { exp: 3, name: 27 }];
    const mode = choice(modes);
    const T = randInt(
      d === 'easy' ? 3 : d === 'medium' ? 4 : 5,
      (d === 'easy' ? 6 : d === 'medium' ? 8 : 12) + (big ? 4 : 0)
    );
    const result = Math.pow(base, T);
    return {
      question: `נתון: <span class="m">${base}<sup>x</sup> · ${mode.name}<sup>y</sup> = ${result}</span>.<br>מהו ערך הביטוי <span class="m">x + ${mode.exp}y</span>?`,
      answer: T,
      distractorHint: 'positive_int', topic: 'pow_base', topicLabel: 'חזקות — בסיסים',
    };
  }

  // ============================================================
  // 2. Powers — common factor
  //    e.g. (3^12 - 3^10) / 3^10 = ?  →  3^2 - 1 = 8
  // ============================================================
  function genPowerFactor(d, adv) {
    const big = adv.largeNumbers;
    const base = choice(d === 'easy' ? [2, 3] : [2, 3, 5]);
    const lowExp = randInt(
      d === 'easy' ? 3 : 5,
      (d === 'easy' ? 7 : d === 'medium' ? 12 : 15) + (big ? 5 : 0)
    );
    const gap = randInt(
      d === 'easy' ? 1 : 2,
      d === 'easy' ? 2 : d === 'medium' ? 3 : 4
    );
    const highExp = lowExp + gap;
    const answer = Math.pow(base, gap) - 1;
    return {
      question: `מהו ערך הביטוי:<br><span class="m">(${base}<sup>${highExp}</sup> − ${base}<sup>${lowExp}</sup>) / ${base}<sup>${lowExp}</sup></span>`,
      answer,
      distractorHint: 'positive_int', topic: 'pow_factor', topicLabel: 'חזקות — גורם משותף',
    };
  }

  // ============================================================
  // 3. Algebra (x+y)² style — given x²+y² and xy
  // ============================================================
  function genAlgebraXY(d) {
    let x, y;
    if (d === 'easy') { x = randInt(1, 5); y = randInt(1, 5); }
    else if (d === 'medium') { x = randInt(2, 8); y = randInt(2, 8); }
    else { x = randInt(2, 10); y = randInt(2, 10); }
    const A = x*x + y*y;
    const B = x*y;
    const v = randInt(1, 3);
    let question, answer;
    if (v === 1) {
      question = `נתון: <span class="m">x² + y² = ${A}</span> וכן <span class="m">x · y = ${B}</span>.<br>מהו ערך הביטוי <span class="m">(x + y)²</span>?`;
      answer = A + 2 * B;
    } else if (v === 2) {
      question = `נתון: <span class="m">x² + y² = ${A}</span> וכן <span class="m">x · y = ${B}</span>.<br>מהו ערך הביטוי <span class="m">(x − y)²</span>?`;
      answer = A - 2 * B;
    } else {
      question = `נתון: <span class="m">x² + y² = ${A}</span> וכן <span class="m">x · y = ${B}</span>.<br>מהו ערך הביטוי <span class="m">2x² + 2y² + 2xy</span>?`;
      answer = 2 * A + 2 * B;
    }
    return { question, answer, distractorHint: 'positive_int', topic: 'alg_xy', topicLabel: 'כפל מקוצר' };
  }

  // ============================================================
  // 4. Difference of squares — a² - b² = A, a - b = B → a + b = A/B
  // ============================================================
  function genDiffSquares(d) {
    let a, b;
    if (d === 'easy') { a = randInt(5, 12); b = randInt(1, a - 1); }
    else if (d === 'medium') { a = randInt(7, 20); b = randInt(2, a - 2); }
    else { a = randInt(10, 30); b = randInt(3, a - 3); }
    const A = a*a - b*b;
    const B = a - b;
    const v = randInt(1, 3);
    let question, answer;
    if (v === 1) {
      question = `נתון: <span class="m">a² − b² = ${A}</span> וכן <span class="m">a − b = ${B}</span>.<br>מהו ערך הביטוי <span class="m">a + b</span>?`;
      answer = a + b;
    } else if (v === 2) {
      question = `נתון: <span class="m">a² − b² = ${A}</span> וכן <span class="m">a − b = ${B}</span>.<br>מהו ערך <span class="m">a</span>?`;
      answer = a;
    } else {
      question = `נתון: <span class="m">a² − b² = ${A}</span> וכן <span class="m">a − b = ${B}</span>.<br>מהו ערך <span class="m">b</span>?`;
      answer = b;
    }
    return { question, answer, distractorHint: 'positive_int', topic: 'diff_sq', topicLabel: 'הפרש ריבועים' };
  }

  // ============================================================
  // 5. System of equations — two equations, ask for linear combo
  // ============================================================
  // Drop "1" coefficient: 1y → y, 3x → 3x
  const term = (n, v) => (n === 1 ? v : n + v);

  function genEqCombo(d) {
    let x, y, coefMax;
    if (d === 'easy') { x = randInt(1, 6); y = randInt(1, 6); coefMax = 4; }
    else if (d === 'medium') { x = randInt(1, 10); y = randInt(1, 10); coefMax = 5; }
    else { x = randInt(2, 15); y = randInt(2, 15); coefMax = 7; }

    let a, b, c, d2, tries = 0;
    do {
      a = randInt(1, coefMax); b = randInt(1, coefMax);
      c = randInt(1, coefMax); d2 = randInt(1, coefMax);
      tries++;
    } while (a * d2 === b * c && tries < 30);

    const e1Val = a * x + b * y;
    const e2Val = c * x + d2 * y;
    const p = randInt(1, 5), q = randInt(1, 5);
    const target = p * x + q * y;

    return {
      question: `נתון:<span class="eq">${term(a,'x')} + ${term(b,'y')} = ${e1Val}</span><span class="eq">${term(c,'x')} + ${term(d2,'y')} = ${e2Val}</span>מהו ערך הביטוי <span class="m">${term(p,'x')} + ${term(q,'y')}</span>?`,
      answer: target,
      distractorHint: 'positive_int', topic: 'eq_combo', topicLabel: 'מערכת משוואות',
    };
  }

  // ============================================================
  // 6. Absolute value equations
  // ============================================================
  function genAbsolute(d) {
    const a = randInt(2, d === 'easy' ? 8 : 15);
    const b = randInt(2, d === 'easy' ? 8 : 15);
    const v = randInt(1, 2);
    if (v === 1) {
      return {
        question: `נתון <span class="m">|x − ${a}| = ${b}</span>.<br>מהו הערך הגדול ביותר של <span class="m">x</span>?`,
        answer: a + b,
        distractorHint: 'positive_int', topic: 'abs', topicLabel: 'ערך מוחלט',
      };
    } else {
      return {
        question: `נתון <span class="m">|x − ${a}| = ${b}</span>.<br>מהו סכום כל הפתרונות של <span class="m">x</span>?`,
        answer: 2 * a,
        distractorHint: 'positive_int', topic: 'abs', topicLabel: 'ערך מוחלט',
      };
    }
  }

  // ============================================================
  // 7. Invented operations — define new operator, evaluate
  // ============================================================
  function genInventedOp(d, adv) {
    const symbol = choice(['◊', '⊕', '⊗', '★', '∇', '∆']);
    const defs = [
      { str: `a ${symbol} b = a² − b`,            fn: (a, b) => a*a - b },
      { str: `a ${symbol} b = 2a − 3b`,           fn: (a, b) => 2*a - 3*b },
      { str: `a ${symbol} b = ab + a − b`,        fn: (a, b) => a*b + a - b },
      { str: `a ${symbol} b = (a + b)² − ab`,     fn: (a, b) => (a+b)*(a+b) - a*b },
      { str: `a ${symbol} b = a² + b² − 2ab`,     fn: (a, b) => a*a + b*b - 2*a*b },
      { str: `a ${symbol} b = a(a − b)`,          fn: (a, b) => a*(a - b) },
    ];
    const def = choice(defs);
    const cap = adv.opMax || (d === 'easy' ? 6 : d === 'medium' ? 9 : 12);
    const x1 = randInt(2, cap);
    const y1 = randInt(2, cap);
    return {
      question: `הפעולה <span class="m">${def.str}</span> מוגדרת לכל זוג מספרים.<br>מהו ערך <span class="m">${x1} ${symbol} ${y1}</span>?`,
      answer: def.fn(x1, y1),
      topic: 'inv_op', topicLabel: 'פעולות מומצאות',
    };
  }

  // ============================================================
  // 8. Combined ratio — A:B and B:C, find C given A
  // ============================================================
  // Reduced ratio pairs (gcd=1, p ≠ q)
  const RATIO_PAIRS = [[1,2],[1,3],[2,3],[1,4],[3,4],[1,5],[2,5],[3,5],[4,5],[1,6],[5,6],[2,7],[3,7]];

  function genRatioCombined(d) {
    let [p, q] = choice(RATIO_PAIRS);
    if (Math.random() < 0.5) [p, q] = [q, p];
    let [r, s] = choice(RATIO_PAIRS);
    if (Math.random() < 0.5) [r, s] = [s, r];
    // Combined: A:B:C = pr : qr : qs
    const Ar = p * r, Cr = q * s;
    const mult = randInt(2, d === 'easy' ? 5 : d === 'medium' ? 10 : 15);
    const A_val = Ar * mult;
    const C_val = Cr * mult;
    const ratioFrac = (top, bot) => `<span class="frac"><span class="num">${top}</span><span class="den">${bot}</span></span>`;
    return {
      question: `היחס בין <span class="m">A</span> ל-<span class="m">B</span> הוא ${ratioFrac(p, q)}.<br>היחס בין <span class="m">B</span> ל-<span class="m">C</span> הוא ${ratioFrac(r, s)}.<br>נתון כי <span class="m">A = ${A_val}</span>. מהו ערך <span class="m">C</span>?`,
      answer: C_val,
      distractorHint: 'positive_int', topic: 'ratio', topicLabel: 'יחס משולב',
    };
  }

  // ============================================================
  // 9. Sequential percent change — up then down (or vice versa)
  // ============================================================
  function genPercentSequential(d, adv) {
    const opts = [10, 20, 25, 50];
    const v = randInt(1, 3);
    let p, q, dir1, dir2;
    if (v === 1) { p = choice(opts); q = choice(opts); dir1 = 'up'; dir2 = 'down'; }
    else if (v === 2) { p = choice(opts); q = choice(opts); dir1 = 'down'; dir2 = 'up'; }
    else { p = choice(opts); q = choice(opts); dir1 = 'up'; dir2 = 'up'; }

    const f1 = dir1 === 'up' ? (1 + p/100) : (1 - p/100);
    const f2 = dir2 === 'up' ? (1 + q/100) : (1 - q/100);
    const mult = f1 * f2;

    const bases = adv.largeNumbers
      ? [2000, 4000, 5000, 8000, 10000]
      : [100, 200, 400, 500, 800, 1000];
    let base = bases[bases.length - 1];
    for (const b of bases) {
      const val = b * mult;
      if (Math.abs(val - Math.round(val)) < 0.0001) { base = b; break; }
    }
    const result = Math.round(base * mult);

    let txt;
    if (v === 1) txt = `מחירו של מוצר עלה ב-${p}%, ולאחר מכן ירד ב-${q}%.`;
    else if (v === 2) txt = `מחירו של מוצר ירד ב-${p}%, ולאחר מכן עלה ב-${q}%.`;
    else txt = `מחירו של מוצר עלה ב-${p}%, ולאחר מכן עלה שוב ב-${q}%.`;

    return {
      question: `${txt}<br>אם מחירו המקורי היה <span class="m">${base}</span> ש"ח, מהו מחירו כעת (בש"ח)?`,
      answer: result,
      distractorHint: 'positive_int', topic: 'pct_seq', topicLabel: 'אחוזים עוקבים',
    };
  }

  // ============================================================
  // 10. Average — adding a term
  // ============================================================
  function genAvgAdd(d, adv) {
    const big = adv.largeNumbers;
    const n = randInt(
      d === 'easy' ? 3 : 4,
      (d === 'easy' ? 6 : d === 'medium' ? 10 : 15) + (big ? 10 : 0)
    );
    const a = randInt(5, (d === 'easy' ? 20 : 50) + (big ? 50 : 0));
    const b = a + randInt(1, 5);
    const k = 1;
    const addedTerm = (n + k) * b - n * a;

    return {
      question: `הממוצע של <span class="m">${n}</span> מספרים הוא <span class="m">${a}</span>.<br>הוספנו אליהם מספר נוסף וכעת הממוצע הוא <span class="m">${b}</span>.<br>מהו המספר שהתווסף?`,
      answer: addedTerm,
      distractorHint: 'positive_int', topic: 'avg', topicLabel: 'ממוצע',
    };
  }

  // ============================================================
  // 11. Arithmetic sequence
  // ============================================================
  function genArithSeq(d, adv) {
    const negFloor = adv.allowNegAnswers ? -20 : -5;
    const a1 = randInt(negFloor, d === 'easy' ? 10 : 20);
    const diff = randInt(2, d === 'easy' ? 5 : d === 'medium' ? 10 : 15);
    let n1, n2;
    do {
      n1 = randInt(2, 10);
      n2 = randInt(3, 12);
    } while (n1 === n2);
    if (n1 > n2) [n1, n2] = [n2, n1];
    const t1 = a1 + (n1 - 1) * diff;
    const t2 = a1 + (n2 - 1) * diff;
    const v = randInt(1, 3);
    if (v === 1) {
      return {
        question: `בסדרה חשבונית, האיבר ה-<span class="m">${n1}</span> הוא <span class="m">${t1}</span> והאיבר ה-<span class="m">${n2}</span> הוא <span class="m">${t2}</span>.<br>מהו האיבר הראשון?`,
        answer: a1,
        topic: 'arith_seq', topicLabel: 'סדרה חשבונית',
      };
    } else if (v === 2) {
      return {
        question: `בסדרה חשבונית, האיבר ה-<span class="m">${n1}</span> הוא <span class="m">${t1}</span> והאיבר ה-<span class="m">${n2}</span> הוא <span class="m">${t2}</span>.<br>מהו ההפרש (d) של הסדרה?`,
        answer: diff,
        topic: 'arith_seq', topicLabel: 'סדרה חשבונית',
      };
    } else {
      const seqMax = adv.seqMaxPos || 25;
      const k = randInt(15, Math.max(16, seqMax));
      const tk = a1 + (k - 1) * diff;
      return {
        question: `בסדרה חשבונית, האיבר ה-<span class="m">${n1}</span> הוא <span class="m">${t1}</span> והאיבר ה-<span class="m">${n2}</span> הוא <span class="m">${t2}</span>.<br>מהו האיבר ה-<span class="m">${k}</span>?`,
        answer: tk,
        topic: 'arith_seq', topicLabel: 'סדרה חשבונית',
      };
    }
  }

  // ============================================================
  // 12. Geometric sequence
  // ============================================================
  function genGeomSeq(d, adv) {
    const a1 = choice([1, 2, 3, 4, 5]);
    const q = choice([2, 3]);
    const n = randInt(3, d === 'easy' ? 4 : d === 'medium' ? 5 : 6);
    const tn = a1 * Math.pow(q, n - 1);
    if (tn > 100000) return genGeomSeq(d, adv);

    const v = randInt(1, 2);
    if (v === 1) {
      return {
        question: `בסדרה הנדסית עם מנה חיובית, האיבר הראשון הוא <span class="m">${a1}</span> והאיבר ה-<span class="m">${n}</span> הוא <span class="m">${tn}</span>.<br>מהי המנה (q) של הסדרה?`,
        answer: q,
        distractorHint: 'positive_int', topic: 'geom_seq', topicLabel: 'סדרה הנדסית',
      };
    } else {
      const k = randInt(2, n - 1);
      const tk = a1 * Math.pow(q, k - 1);
      return {
        question: `בסדרה הנדסית עם מנה חיובית, האיבר הראשון הוא <span class="m">${a1}</span> והאיבר ה-<span class="m">${n}</span> הוא <span class="m">${tn}</span>.<br>מהו האיבר ה-<span class="m">${k}</span>?`,
        answer: tk,
        distractorHint: 'positive_int', topic: 'geom_seq', topicLabel: 'סדרה הנדסית',
      };
    }
  }

  // ============================================================
  // 13. Remainders — given X mod n = r, find (f(X)) mod n
  // ============================================================
  function genRemainders(d) {
    const divisor = choice(d === 'easy' ? [5, 7] : [5, 7, 9, 11]);
    const r = randInt(1, divisor - 1);
    const v = randInt(1, d === 'easy' ? 2 : 3);
    let question, answer;
    if (v === 1) {
      answer = (2 * r) % divisor;
      question = `נתון כי כאשר מחלקים את <span class="m">X</span> ב-<span class="m">${divisor}</span>, השארית היא <span class="m">${r}</span>.<br>מהי השארית כאשר מחלקים את <span class="m">2X</span> ב-<span class="m">${divisor}</span>?`;
    } else if (v === 2) {
      const c = randInt(2, divisor);
      answer = (r + c) % divisor;
      question = `נתון כי כאשר מחלקים את <span class="m">X</span> ב-<span class="m">${divisor}</span>, השארית היא <span class="m">${r}</span>.<br>מהי השארית כאשר מחלקים את <span class="m">X + ${c}</span> ב-<span class="m">${divisor}</span>?`;
    } else {
      answer = (r * r) % divisor;
      question = `נתון כי כאשר מחלקים את <span class="m">X</span> ב-<span class="m">${divisor}</span>, השארית היא <span class="m">${r}</span>.<br>מהי השארית כאשר מחלקים את <span class="m">X²</span> ב-<span class="m">${divisor}</span>?`;
    }
    return { question, answer, distractorHint: 'digit', topic: 'remainder', topicLabel: 'שאריות' };
  }

  // ============================================================
  // 14. Number properties — evens, primes, multiples, gcd
  // ============================================================
  function genNumProps(d, adv) {
    const v = randInt(1, 4);
    if (v === 1) {
      const lo = randInt(5, 30);
      const hi = lo + randInt(15, d === 'easy' ? 25 : 50);
      const evens = Math.floor(hi / 2) - Math.floor((lo - 1) / 2);
      return {
        question: `כמה מספרים זוגיים יש בין <span class="m">${lo}</span> ל-<span class="m">${hi}</span> (כולל)?`,
        answer: evens,
        distractorHint: 'count',
        topic: 'num_props', topicLabel: 'תכונות מספרים',
      };
    } else if (v === 2) {
      const k = choice([3, 4, 5, 6, 7]);
      const limit = randInt(20, d === 'easy' ? 40 : 80);
      let sum = 0;
      for (let i = k; i <= limit; i += k) sum += i;
      return {
        question: `מהו סכום כל הכפולות של <span class="m">${k}</span> שאינן עולות על <span class="m">${limit}</span>?`,
        answer: sum,
        topic: 'num_props', topicLabel: 'תכונות מספרים',
      };
    } else if (v === 3) {
      const N = choice([15, 20, 25, 30, 40, 50]);
      const isPrime = (n) => { if (n < 2) return false; for (let i = 2; i * i <= n; i++) if (n % i === 0) return false; return true; };
      let count = 0;
      for (let i = 2; i <= N; i++) if (isPrime(i)) count++;
      return {
        question: `כמה מספרים ראשוניים יש מ-<span class="m">1</span> עד <span class="m">${N}</span> (כולל)?`,
        answer: count,
        distractorHint: 'count',
        topic: 'num_props', topicLabel: 'תכונות מספרים',
      };
    } else {
      const a = randInt(8, 40);
      const b = randInt(8, 40);
      return {
        question: `מהו המחלק המשותף הגדול ביותר של <span class="m">${a}</span> ו-<span class="m">${b}</span>?`,
        answer: gcd(a, b),
        distractorHint: 'gcd',
        topic: 'num_props', topicLabel: 'תכונות מספרים',
      };
    }
  }

  // ============================================================
  // 15. Digit cycle — units digit of large power
  // ============================================================
  function genDigitCycle(d, adv) {
    const cycles = {
      2: [2, 4, 8, 6],
      3: [3, 9, 7, 1],
      4: [4, 6],
      7: [7, 9, 3, 1],
      8: [8, 4, 2, 6],
      9: [9, 1],
    };
    const bases = Object.keys(cycles).map(Number);
    const base = choice(bases);
    const cycle = cycles[base];
    const minExp = d === 'easy' ? 5 : d === 'medium' ? 10 : 20;
    const maxExp = d === 'easy' ? 25 : d === 'medium' ? 60 : 150;
    const exp = randInt(minExp, maxExp);
    const idx = (exp - 1) % cycle.length;
    return {
      question: `מהי ספרת האחדות של <span class="m">${base}<sup>${exp}</sup></span>?`,
      answer: cycle[idx],
      distractorHint: 'digit',
      topic: 'digit_cycle', topicLabel: 'ספרת האחדות',
    };
  }

  // ============================================================
  // 16. Inequalities
  // ============================================================
  function genInequality(d, adv) {
    const v = randInt(1, 3);
    if (v === 1) {
      // Largest integer x: ax + b < c
      const a = randInt(2, d === 'easy' ? 4 : 7);
      const xMax = randInt(5, d === 'easy' ? 10 : 20);
      const b = randInt(-8, 8);
      const offset = randInt(1, a - 1);
      const c = a * xMax + b + offset;
      const answer = Math.floor((c - b - 0.0001) / a);
      const bStr = b === 0 ? '' : (b > 0 ? ` + ${b}` : ` − ${-b}`);
      return {
        question: `מהו המספר השלם הגדול ביותר <span class="m">x</span> המקיים:<br><span class="m">${a}x${bStr} &lt; ${c}</span>?`,
        answer,
        distractorHint: 'count', topic: 'ineq', topicLabel: 'אי-שוויונות',
      };
    } else if (v === 2) {
      // Count integers in open interval
      const lo = randInt(-5, 8);
      const hi = lo + randInt(6, d === 'easy' ? 12 : 20);
      const count = hi - lo - 1;
      return {
        question: `כמה מספרים שלמים <span class="m">x</span> מקיימים <span class="m">${lo} &lt; x &lt; ${hi}</span>?`,
        answer: count,
        distractorHint: 'count', topic: 'ineq', topicLabel: 'אי-שוויונות',
      };
    } else {
      // Conjunction: x > a AND 2x < b
      const a = randInt(1, 8);
      const minX = a + 1;
      const xMax = minX + randInt(3, 10);
      const b = 2 * xMax + randInt(0, 1);
      const upper = Math.ceil(b / 2) - 1;
      const count = upper - a;
      if (count < 1) return genInequality(d, adv);
      return {
        question: `כמה מספרים שלמים מקיימים גם <span class="m">x &gt; ${a}</span> וגם <span class="m">2x &lt; ${b}</span>?`,
        answer: count,
        distractorHint: 'count', topic: 'ineq', topicLabel: 'אי-שוויונות',
      };
    }
  }

  // ============================================================
  // 17. Mixtures — solution concentration
  // ============================================================
  function genMixture(d, adv) {
    for (let attempt = 0; attempt < 30; attempt++) {
      const p1 = choice([10, 15, 20, 25, 30]);
      const gap = choice([20, 30, 40, 50, 60]);
      const p2 = p1 + gap;
      if (p2 > 90) continue;
      const target = p1 + 5 * randInt(1, Math.floor(gap / 5) - 1);
      if (target >= p2 || target <= p1) continue;
      const total = choice([40, 50, 60, 80, 100, 120, 200]);
      const numerator = total * (p2 - target);
      const denominator = p2 - p1;
      if (numerator % denominator !== 0) continue;
      const x = numerator / denominator;
      if (x <= 0 || x >= total) continue;
      return {
        question: `ערבבו תמיסה בריכוז <span class="m">${p1}%</span> עם תמיסה בריכוז <span class="m">${p2}%</span> וקיבלו <span class="m">${total}</span> מ"ל של תמיסה בריכוז <span class="m">${target}%</span>.<br>כמה מ"ל של התמיסה בריכוז <span class="m">${p1}%</span> השתמשו?`,
        answer: x,
        distractorHint: 'positive_int', topic: 'mixture', topicLabel: 'תערובות',
      };
    }
    return {
      question: `ערבבו תמיסה בריכוז <span class="m">20%</span> עם תמיסה בריכוז <span class="m">60%</span> וקיבלו <span class="m">100</span> מ"ל של תמיסה בריכוז <span class="m">40%</span>.<br>כמה מ"ל של התמיסה בריכוז <span class="m">20%</span> השתמשו?`,
      answer: 50,
      distractorHint: 'positive_int', topic: 'mixture', topicLabel: 'תערובות',
    };
  }

  // ============================================================
  // 18. Weighted average
  // ============================================================
  function genWeightedAvg(d, adv) {
    const big = adv.largeNumbers;
    for (let attempt = 0; attempt < 40; attempt++) {
      const n1 = randInt(big ? 20 : 10, big ? 60 : 40);
      const n2 = randInt(big ? 20 : 10, big ? 60 : 40);
      const a1 = randInt(60, 95);
      const a2 = randInt(60, 95);
      if (a1 === a2) continue;
      const total = n1 * a1 + n2 * a2;
      if (total % (n1 + n2) !== 0) continue;
      const avg = total / (n1 + n2);
      return {
        question: `בכיתה א' יש <span class="m">${n1}</span> תלמידים והממוצע שלהם הוא <span class="m">${a1}</span>.<br>בכיתה ב' יש <span class="m">${n2}</span> תלמידים והממוצע שלהם הוא <span class="m">${a2}</span>.<br>מהו הממוצע של כל התלמידים יחד?`,
        answer: avg,
        distractorHint: 'positive_int', topic: 'weighted_avg', topicLabel: 'ממוצע משוקלל',
      };
    }
    return {
      question: `בכיתה א' יש <span class="m">20</span> תלמידים והממוצע שלהם הוא <span class="m">80</span>.<br>בכיתה ב' יש <span class="m">30</span> תלמידים והממוצע שלהם הוא <span class="m">70</span>.<br>מהו הממוצע של כל התלמידים יחד?`,
      answer: 74,
      distractorHint: 'positive_int', topic: 'weighted_avg', topicLabel: 'ממוצע משוקלל',
    };
  }

  // ============================================================
  // 19. Motion — speed/time/distance
  // ============================================================
  function genMotion(d, adv) {
    const v = randInt(1, 3);
    if (v === 1) {
      // Toward each other
      const v1 = choice([40, 50, 60, 70, 80]);
      const v2 = choice([40, 50, 60, 70, 80]);
      const t = randInt(2, d === 'easy' ? 4 : 6);
      const distance = (v1 + v2) * t;
      return {
        question: `שתי מכוניות יוצאות בו זמנית זו לקראת זו ממקומות שמרחקם <span class="m">${distance}</span> ק"מ.<br>מהירות הראשונה <span class="m">${v1}</span> קמ"ש, מהירות השנייה <span class="m">${v2}</span> קמ"ש.<br>אחרי כמה שעות הן ייפגשו?`,
        answer: t,
        distractorHint: 'positive_int', topic: 'motion', topicLabel: 'בעיות תנועה',
      };
    } else if (v === 2) {
      // Catch-up
      for (let i = 0; i < 30; i++) {
        const v1 = choice([30, 40, 50, 60]);
        const gap = choice([10, 15, 20, 30]);
        const v2 = v1 + gap;
        const leadTime = randInt(2, 4);
        const headStart = v1 * leadTime;
        if (headStart % gap !== 0) continue;
        const catchTime = headStart / gap;
        if (catchTime < 1 || catchTime > 20) continue;
        return {
          question: `רוכב יוצא במהירות <span class="m">${v1}</span> קמ"ש.<br><span class="m">${leadTime}</span> שעות אחריו יוצא רוכב שני מאותה נקודה במהירות <span class="m">${v2}</span> קמ"ש.<br>בעוד כמה שעות (מיציאת השני) ישיג השני את הראשון?`,
          answer: catchTime,
          distractorHint: 'positive_int', topic: 'motion', topicLabel: 'בעיות תנועה',
        };
      }
    }
    // Average speed (round trip)
    for (let i = 0; i < 30; i++) {
      const v1 = choice([30, 40, 50, 60]);
      const v2 = choice([60, 80, 100, 120]);
      if (v1 === v2) continue;
      const num = 2 * v1 * v2;
      const den = v1 + v2;
      if (num % den !== 0) continue;
      return {
        question: `מכונית נסעה ממקום א' למקום ב' במהירות <span class="m">${v1}</span> קמ"ש, וחזרה מ-ב' לא' במהירות <span class="m">${v2}</span> קמ"ש.<br>מהי המהירות הממוצעת של כל הנסיעה (בקמ"ש)?`,
        answer: num / den,
        distractorHint: 'positive_int', topic: 'motion', topicLabel: 'בעיות תנועה',
      };
    }
    return {
      question: `מכונית נסעה ממקום א' למקום ב' במהירות <span class="m">40</span> קמ"ש, וחזרה במהירות <span class="m">60</span> קמ"ש.<br>מהי המהירות הממוצעת של כל הנסיעה (בקמ"ש)?`,
      answer: 48,
      distractorHint: 'positive_int', topic: 'motion', topicLabel: 'בעיות תנועה',
    };
  }

  // ============================================================
  // 20. Work — combined work rates
  // ============================================================
  function genWork(d, adv) {
    const validPairs = [];
    for (let a = 2; a <= 15; a++) {
      for (let b = a; b <= 20; b++) {
        const num = a * b;
        const den = a + b;
        if (num % den === 0) {
          const t = num / den;
          if (t >= 1 && t < a) validPairs.push([a, b, t]);
        }
      }
    }
    const [a, b, t] = choice(validPairs);
    return {
      question: `פועל א' מסיים עבודה ב-<span class="m">${a}</span> שעות.<br>פועל ב' מסיים את אותה עבודה ב-<span class="m">${b}</span> שעות.<br>בכמה שעות יסיימו את העבודה אם יעבדו יחד?`,
      answer: t,
      distractorHint: 'small_positive', topic: 'work', topicLabel: 'הספק ועבודה',
    };
  }

  // ============================================================
  // 21. Combinatorics — permutations & combinations
  // ============================================================
  function genCombi(d, adv) {
    const v = randInt(1, 3);
    if (v === 1) {
      // n! arrangements in a row
      const minN = d === 'easy' ? 3 : 4;
      const maxN = d === 'easy' ? 5 : d === 'medium' ? 6 : 7;
      const n = randInt(minN, maxN);
      let fact = 1;
      for (let i = 2; i <= n; i++) fact *= i;
      return {
        question: `בכמה דרכים שונות אפשר לסדר <span class="m">${n}</span> ספרים שונים בשורה על מדף?`,
        answer: fact,
        distractorHint: 'factorial', topic: 'combi', topicLabel: 'קומבינטוריקה',
      };
    } else if (v === 2) {
      // Combinations C(n,k)
      const n = randInt(5, d === 'easy' ? 7 : 10);
      const k = randInt(2, Math.min(4, n - 1));
      let num = 1, denom = 1;
      for (let i = 0; i < k; i++) { num *= (n - i); denom *= (i + 1); }
      return {
        question: `מקבוצה של <span class="m">${n}</span> אנשים יש לבחור ועדה של <span class="m">${k}</span> אנשים (סדר אינו חשוב).<br>בכמה דרכים אפשר לעשות זאת?`,
        answer: num / denom,
        distractorHint: 'factorial', topic: 'combi', topicLabel: 'קומבינטוריקה',
      };
    } else {
      // Permutations P(n,k)
      const n = randInt(5, d === 'easy' ? 7 : 10);
      const k = randInt(2, 3);
      let answer = 1;
      for (let i = 0; i < k; i++) answer *= (n - i);
      const positions = k === 2 ? 'יו"ר וסגן' : 'יו"ר, סגן וגזבר';
      return {
        question: `מתוך <span class="m">${n}</span> מועמדים יש לבחור <span class="m">${k}</span> בעלי תפקידים שונים (${positions}).<br>בכמה דרכים אפשר לעשות זאת?`,
        answer,
        distractorHint: 'factorial', topic: 'combi', topicLabel: 'קומבינטוריקה',
      };
    }
  }

  // ============================================================
  // 22. Probability
  // ============================================================
  function genProbability(d, adv) {
    const v = randInt(1, 3);
    if (v === 1) {
      // Single draw from a bag
      const red = randInt(2, 8);
      const blue = randInt(2, 8);
      const total = red + blue;
      const g = gcd(red, total);
      const fn = red / g;
      const fd = total / g;
      return {
        question: `בשק יש <span class="m">${red}</span> כדורים אדומים ו-<span class="m">${blue}</span> כדורים כחולים.<br>שולפים כדור אחד באקראי. מהי ההסתברות שיצא כדור אדום?`,
        answer: red / total,
        displayAnswer: fd === 1 ? String(fn) : `${fn}/${fd}`,
        distractorHint: 'probability', topic: 'prob', topicLabel: 'הסתברות',
      };
    } else if (v === 2) {
      // Independent events: both occur
      const denoms = [2, 3, 4, 5, 6];
      const d1 = choice(denoms);
      const d2 = choice(denoms);
      const n1 = randInt(1, d1 - 1);
      const n2 = randInt(1, d2 - 1);
      const num = n1 * n2;
      const den = d1 * d2;
      const g = gcd(num, den);
      const fn = num / g;
      const fd = den / g;
      const frac = (top, bot) => `<span class="frac"><span class="num">${top}</span><span class="den">${bot}</span></span>`;
      return {
        question: `ההסתברות שיורד גשם היום היא ${frac(n1, d1)}.<br>ההסתברות שיורד גשם מחר היא ${frac(n2, d2)}.<br>בהנחה שהמאורעות בלתי תלויים, מהי ההסתברות שירד גשם גם היום וגם מחר?`,
        answer: num / den,
        displayAnswer: fd === 1 ? String(fn) : `${fn}/${fd}`,
        distractorHint: 'probability', topic: 'prob', topicLabel: 'הסתברות',
      };
    } else {
      // Complement: at least one head in n flips
      const n = randInt(2, d === 'easy' ? 3 : 4);
      const denom = Math.pow(2, n);
      const num = denom - 1;
      return {
        question: `מטילים מטבע הוגן <span class="m">${n}</span> פעמים.<br>מהי ההסתברות שיתקבל "עץ" לפחות פעם אחת?`,
        answer: num / denom,
        displayAnswer: `${num}/${denom}`,
        distractorHint: 'probability', topic: 'prob', topicLabel: 'הסתברות',
      };
    }
  }

  // ============================================================
  // 23. Venn diagrams (text-only)
  // ============================================================
  function genVenn(d, adv) {
    for (let i = 0; i < 30; i++) {
      const total = randInt(30, d === 'easy' ? 60 : 100);
      const both = randInt(5, 15);
      const onlyA = randInt(8, 25);
      const onlyB = randInt(5, 20);
      const studyingAny = onlyA + onlyB + both;
      if (studyingAny > total) continue;
      const neither = total - studyingAny;
      const A = onlyA + both;
      const B = onlyB + both;
      const v = randInt(1, 3);
      if (v === 1) {
        return {
          question: `בקבוצה של <span class="m">${total}</span> אנשים, <span class="m">${A}</span> דוברים אנגלית, <span class="m">${B}</span> דוברים צרפתית, ו-<span class="m">${both}</span> דוברים את שתי השפות.<br>כמה אנשים אינם דוברים אף אחת מהשפות?`,
          answer: neither,
          distractorHint: 'count', topic: 'venn', topicLabel: 'דיאגרמת ון',
        };
      } else if (v === 2) {
        return {
          question: `בקבוצה של <span class="m">${total}</span> אנשים, <span class="m">${A}</span> דוברים אנגלית ו-<span class="m">${B}</span> דוברים צרפתית. <span class="m">${neither}</span> אינם דוברים אף שפה.<br>כמה אנשים דוברים את שתי השפות?`,
          answer: both,
          distractorHint: 'count', topic: 'venn', topicLabel: 'דיאגרמת ון',
        };
      } else {
        return {
          question: `בקבוצה של <span class="m">${total}</span> אנשים, <span class="m">${A}</span> דוברים אנגלית, <span class="m">${B}</span> דוברים צרפתית, ו-<span class="m">${both}</span> דוברים את שתי השפות.<br>כמה דוברים בדיוק שפה אחת (לא שתיהן)?`,
          answer: onlyA + onlyB,
          distractorHint: 'count', topic: 'venn', topicLabel: 'דיאגרמת ון',
        };
      }
    }
    return {
      question: `בקבוצה של <span class="m">50</span> אנשים, <span class="m">25</span> דוברים אנגלית, <span class="m">20</span> דוברים צרפתית, ו-<span class="m">10</span> דוברים את שתי השפות.<br>כמה אינם דוברים אף שפה?`,
      answer: 15,
      distractorHint: 'count', topic: 'venn', topicLabel: 'דיאגרמת ון',
    };
  }

  // ============================================================
  // Dispatcher
  // ============================================================
  const generators = {
    pow_base: genPowerBase,
    pow_factor: genPowerFactor,
    alg_xy: genAlgebraXY,
    diff_sq: genDiffSquares,
    eq_combo: genEqCombo,
    abs: genAbsolute,
    inv_op: genInventedOp,
    ratio: genRatioCombined,
    pct_seq: genPercentSequential,
    avg: genAvgAdd,
    arith_seq: genArithSeq,
    geom_seq: genGeomSeq,
    remainder: genRemainders,
    num_props: genNumProps,
    digit_cycle: genDigitCycle,
    ineq: genInequality,
    mixture: genMixture,
    weighted_avg: genWeightedAvg,
    motion: genMotion,
    work: genWork,
    combi: genCombi,
    prob: genProbability,
    venn: genVenn,
  };

  function generate(config) {
    const topic = choice(config.topics);
    const gen = generators[topic] || genAlgebraXY;
    const q = gen(config.difficulty, config.advanced || {});
    if (config.answerMode === 'choice' && !q.choices) {
      q.choices = Engine.makeChoices(q.answer, q.distractorHint);
    }
    return q;
  }

  return { generate };
})();
