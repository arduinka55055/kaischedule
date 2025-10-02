// Навайбкодив пошук за іменами. Хіба це не кайф?

function normalize2(s) {
    if (!s) return "";
    // lowercase, decompose accents, remove combining marks
    return s
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/ё/g, "е")
        .replace(/й/g, "й") // keep ukrainian letters
        .trim();
}

/* --- Jaro (and Jaro-Winkler) implementation --- */
function jaro(s1, s2) {
    if (!s1.length && !s2.length) return 1;
    if (!s1.length || !s2.length) return 0;
    if (s1 === s2) return 1;

    const len1 = s1.length, len2 = s2.length;
    const matchDist = Math.floor(Math.max(len1, len2) / 2) - 1;
    const s1Matches = new Array(len1).fill(false);
    const s2Matches = new Array(len2).fill(false);

    let matches = 0;
    for (let i = 0; i < len1; i++) {
        const start = Math.max(0, i - matchDist);
        const end = Math.min(len2 - 1, i + matchDist);
        for (let j = start; j <= end; j++) {
            if (s2Matches[j]) continue;
            if (s1[i] !== s2[j]) continue;
            s1Matches[i] = s2Matches[j] = true;
            matches++;
            break;
        }
    }
    if (!matches) return 0;

    let t = 0, k = 0;
    for (let i = 0; i < len1; i++) {
        if (!s1Matches[i]) continue;
        while (!s2Matches[k]) k++;
        if (s1[i] !== s2[k]) t++;
        k++;
    }
    t = t / 2;

    return ((matches / len1) + (matches / len2) + ((matches - t) / matches)) / 3;
}

function jaroWinkler(a, b) {
    const j = jaro(a, b);
    // common prefix length up to 4
    let prefix = 0;
    const maxPrefix = 4;
    for (let i = 0; i < Math.min(maxPrefix, a.length, b.length); i++) {
        if (a[i] === b[i]) prefix++; else break;
    }
    const p = 0.1; // scaling factor
    return j + prefix * p * (1 - j);
}

/* --- Parse a raw name string into typed tokens (+detect initials, vacancy-like non-names) --- */
const patronymicRe = /(ович|евич|ич|овна|івна|ївна|івич|ович)$/i;
const nonNameRe = /\b(ваканс|вакансія|vacanc|посада|position|resume)\b/i;
const initialReGlobal = /([A-Za-zА-Яа-яЇїІіЄєҐґЁё])\./g;

function parseName(raw) {
    const r = { original: raw, tokens: [], initials: [], isNonName: false };

    if (!raw || nonNameRe.test(raw)) {
        r.isNonName = true;
        return r;
    }

    // Capture initials (like "І.О." or "A.B.")
    let m;
    while ((m = initialReGlobal.exec(raw)) !== null) {
        r.initials.push(normalize2(m[1]));
    }

    // Remove initials from a copy and punctuation; keep words
    let cleaned = raw.replace(initialReGlobal, " ")
        .replace(/[.,()"]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    if (!cleaned) {
        // only initials present
        r.tokens.push({ text: "", type: "unknown" });
        return r;
    }

    const parts = cleaned.split(/\s+/).map(normalize2).filter(Boolean);

    // Heuristics:
    // - If we saw initials and there is exactly 1 other token, treat it as "Surname A.B."
    if (r.initials.length && parts.length === 1) {
        r.tokens.push({ text: parts[0], type: "surname" });
        r.initials.forEach((it, i) => r.tokens.push({ text: it, type: "initial" }));
        return r;
    }

    // Mark anything that looks like a patronymic
    parts.forEach(p => {
        if (patronymicRe.test(p)) r.tokens.push({ text: p, type: "patronymic" });
        else r.tokens.push({ text: p, type: "unknown" });
    });

    // If we have exactly 2 tokens and initials exist, assume "Surname Given"
    if (parts.length === 2 && r.initials.length) {
        r.tokens = [{ text: parts[0], type: "surname" }, { text: parts[1], type: "given" }];
        r.initials.forEach(it => r.tokens.push({ text: it, type: "initial" }));
        return r;
    }

    // If 3 tokens: try to map to (given, patronymic, surname) using patronymic detection
    if (parts.length === 3) {
        const idxPat = parts.findIndex(p => patronymicRe.test(p));
        if (idxPat >= 0) {
            const pat = parts[idxPat];
            const rest = parts.filter((_, i) => i !== idxPat);
            // assume remaining order is given + surname
            r.tokens = [
                { text: rest[0], type: "given" },
                { text: pat, type: "patronymic" },
                { text: rest[1], type: "surname" }
            ];
            return r;
        } else {
            // fallback: given, patronymic, surname (common in many lists)
            r.tokens = [
                { text: parts[0], type: "given" },
                { text: parts[1], type: "patronymic" },
                { text: parts[2], type: "surname" }
            ];
            return r;
        }
    }

    // If >=4 tokens: assume last token is surname, first is given, middle others unknown
    if (parts.length >= 4) {
        r.tokens = [{ text: parts[0], type: "given" }];
        for (let i = 1; i < parts.length - 1; i++) r.tokens.push({ text: parts[i], type: "other" });
        r.tokens.push({ text: parts[parts.length - 1], type: "surname" });
        return r;
    }

    // Default for 1 token
    if (parts.length === 1) {
        r.tokens = [{ text: parts[0], type: "surname" }];
        return r;
    }

    // Default for 2 tokens when no initials: guess given+surname
    r.tokens = [{ text: parts[0], type: "given" }, { text: parts[1], type: "surname" }];
    return r;
}

/* --- Scoring --- */
function scoreSingleTokenQuery(q, parsed) {
    // q: normalized single token
    if (parsed.isNonName) return 0;
    if (!q) return 0;

    let best = 0;

    // If candidate has initials: check if any initial letter equals query's first letter
    // (useful for matching "І.О." where .О could be Oleg)
    if (parsed.initials && parsed.initials.length) {
        const qFirst = q[0];
        for (const init of parsed.initials) {
            if (init[0] === qFirst) {
                best = Math.max(best, 0.75); // initials match gives decent score but below full-name match
            }
        }
    }

    for (const token of parsed.tokens) {
        if (!token.text) continue;
        const t = token.text;
        // similarity
        const sim = jaroWinkler(q, t); // 0..1
        // weights by detected token type
        let weight = 1.0;
        if (token.type === "surname") weight = 0.9;
        else if (token.type === "patronymic") weight = 0.75;
        else if (token.type === "initial") weight = 0.85;
        else if (token.type === "other") weight = 0.7;
        else if (token.type === "unknown") weight = 0.85;

        let score = sim * weight;

        // strong prefix/substring heuristics (user typed first few letters)
        if (t.startsWith(q) || t.indexOf(q) === 0) score += 0.05;
        if (t === q) score = Math.max(score, 0.98); // exact token match -> near perfect

        best = Math.max(best, score);
    }

    // small filter to avoid junk matches (tuneable)
    if (best < 0.45) return 0;
    return Math.min(1, best);
}

function scoreMultiTokenQuery(qTokens, parsed) {
    if (parsed.isNonName) return 0;
    const recTokens = parsed.tokens.map(t => t.text || "");
    if (recTokens.length === 0) return 0;

    // pad shorter side
    const L = Math.max(qTokens.length, recTokens.length);
    const q = qTokens.slice();
    while (q.length < L) q.push("");
    const r = recTokens.slice();
    while (r.length < L) r.push("");

    // generate permutations of r up to reasonable size
    // for names typically r.length <= 4; if much larger, fallback to greedy matching
    function permutations(arr) {
        if (arr.length <= 1) return [arr.slice()];
        const out = [];
        for (let i = 0; i < arr.length; i++) {
            const el = arr[i];
            const rest = arr.slice(0, i).concat(arr.slice(i + 1));
            for (const p of permutations(rest)) out.push([el].concat(p));
        }
        return out;
    }

    let bestAvg = 0;
    const perms = (r.length <= 6) ? permutations(r) : [r]; // avoid explosion

    for (const perm of perms) {
        let sum = 0;
        for (let i = 0; i < L; i++) {
            const qi = q[i];
            const ri = perm[i] || "";
            if (!qi && !ri) continue;
            const sim = jaroWinkler(qi, ri);
            // heuristic weight by token type if we can find it in parsed tokens
            const recObj = parsed.tokens.find(t => t.text === ri) || { type: "unknown" };
            let weight = 1.0;
            if (recObj.type === "surname") weight = 0.9;
            if (recObj.type === "patronymic") weight = 0.75;
            if (recObj.type === "other") weight = 0.7;
            sum += sim * weight;
        }
        const avg = sum / Math.max(1, L);
        if (avg > bestAvg) bestAvg = avg;
    }

    if (bestAvg < 0.42) return 0;
    return Math.min(1, bestAvg);
}

/* --- Main search function --- */
function searchNames(obj, query, options = {}) {
    const minScore = options.minScore ?? 0.45;
    const parsedCache = new Map();

    function getParsed(name) {
        if (!parsedCache.has(name)) parsedCache.set(name, parseName(name));
        return parsedCache.get(name);
    }

    const qNorm = normalize2(query);
    const qTokens = qNorm.split(/\s+/).filter(Boolean);

    const results = [];

    for (const [key, value] of Object.entries(obj)) {
        const parsed = getParsed(key);
        let score = 0;
        if (qTokens.length === 1) {
            score = scoreSingleTokenQuery(qTokens[0], parsed);
        } else {
            score = scoreMultiTokenQuery(qTokens, parsed);
        }

        if (score >= minScore) {
            results.push([key, value, score]);
        }
    }

    // sort descending by score
    results.sort((a, b) => b[2] - a[2]);

    // return [key, value] pairs (optionally include score)
    return results.map(([k, v, s]) => [k, v]).slice(0, 10);
}
