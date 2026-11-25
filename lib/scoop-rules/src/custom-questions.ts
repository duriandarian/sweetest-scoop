import { DESSERT_TIERS, matchKey, normalizeAnswer } from "./answer-rules";

export const CUSTOM_LIMITS = { rounds: 10, rows: 300, answersPerRound: 60, prompt: 280, answer: 120, text: 16_000 } as const;
export const CUSTOM_TEMPLATE = [
  ["Question", "Answer", "Dessert tier"],
  ["Name a fruit", "Apple", "Sago Pearl"],
  ["", "Dragon fruit", "Golden Mango"],
  ["Name a board game", "Chess", "Mango Cube"],
].map(row => row.join("\t")).join("\n");

export type CustomTierAnswer = { answer: string; depth: number };
export type CustomQuestion = { prompt: string; answers: CustomTierAnswer[] };
export type CustomImportIssue = { row?: number; message: string };
export type CustomImportResult = { questions: CustomQuestion[]; issues: CustomImportIssue[] };
type SheetRow = { row: number; cells: string[] };
type QuestionGroup = { question: CustomQuestion; answers: Map<string, { depth: number; row: number }> };

/** Spreadsheet clipboard TSV, including quoted cells with embedded tabs or newlines. */
function readRows(text: string): { rows: SheetRow[]; issue?: CustomImportIssue } {
  const rows: SheetRow[] = [];
  let cells: string[] = [], value = "", quoted = false, closedQuote = false, line = 1, start = 1;
  const nextCell = () => { cells.push(value); value = ""; closedQuote = false; };
  const nextRow = () => {
    nextCell();
    if (cells.some(cell => cell.trim())) rows.push({ row: start, cells });
    cells = [];
  };
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { value += '"'; i++; }
      else if (char === '"') { quoted = false; closedQuote = true; }
      else { value += char; if (char === "\n") line++; }
    } else if (char === "\t") nextCell();
    else if (char === "\n") { nextRow(); start = ++line; }
    else if (closedQuote) return { rows, issue: { row: start, message: "Check the quotation marks in this spreadsheet row." } };
    else if (char === '"' && !value) quoted = true;
    else value += char;
  }
  if (quoted) return { rows, issue: { row: start, message: "A quoted cell is missing its closing quotation mark." } };
  nextRow();
  return { rows };
}

export function parseCustomQuestions(text: string): CustomImportResult {
  const questions: CustomQuestion[] = [];
  const issues: CustomImportIssue[] = [];
  if (text.length > CUSTOM_LIMITS.text)
    return { questions, issues: [{ message: `Paste at most ${CUSTOM_LIMITS.text.toLocaleString("en-US")} characters.` }] };

  const { rows, issue } = readRows(text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n"));
  if (issue) issues.push(issue);
  const header = rows[0]?.cells.map(cell => normalizeAnswer(cell));
  if (header?.length === 3 && header[0] === "question" && header[1] === "answer" && header[2] === "dessert tier") rows.shift();
  if (rows.length > CUSTOM_LIMITS.rows) issues.push({ row: rows[CUSTOM_LIMITS.rows].row, message: `Use at most ${CUSTOM_LIMITS.rows} answer rows.` });

  const byPrompt = new Map<string, QuestionGroup>();
  let current: QuestionGroup | undefined;
  const clean = (value: string) => value.trim().replace(/\s+/g, " ");
  for (const { row, cells } of rows.slice(0, CUSTOM_LIMITS.rows)) {
    const flag = (message: string) => issues.push({ row, message });
    if (cells.length !== 3) { flag("Use three columns: Question, Answer, and Dessert tier."); current = undefined; continue; }
    if (cells.some(cell => /[\u0000-\u0008\u000B-\u001F\uD800-\uDFFF]/u.test(cell))) {
      flag("Remove unsupported characters from this row."); current = undefined; continue;
    }
    const [prompt, answer, tier] = cells.map(clean);
    if (prompt) {
      current = undefined;
      if (prompt.length > CUSTOM_LIMITS.prompt) { flag(`Keep the question to ${CUSTOM_LIMITS.prompt} characters.`); continue; }
      const key = normalizeAnswer(prompt);
      current = byPrompt.get(key);
      if (!current) {
        if (questions.length >= CUSTOM_LIMITS.rounds) { flag(`Use at most ${CUSTOM_LIMITS.rounds} questions.`); continue; }
        current = { question: { prompt, answers: [] }, answers: new Map() };
        byPrompt.set(key, current);
        questions.push(current.question);
      }
    } else if (!current) { flag("Enter a question here before leaving the question cell blank on later rows."); continue; }
    const depth = DESSERT_TIERS.findIndex(name => normalizeAnswer(name) === normalizeAnswer(tier));
    const key = matchKey(answer);
    const issueCount = issues.length;
    if (!key) flag("Enter an answer that includes a letter or number.");
    else if (answer.length > CUSTOM_LIMITS.answer || normalizeAnswer(answer).length > CUSTOM_LIMITS.answer)
      flag(`Keep the answer to ${CUSTOM_LIMITS.answer} characters.`);
    if (!tier) flag("Enter a dessert tier.");
    else if (depth < 0) flag(`“${tier.slice(0, 48)}” isn’t a dessert tier. Use one of the five names shown above.`);
    if (issues.length !== issueCount) continue;
    const existing = current.answers.get(key);
    if (existing) {
      if (existing.depth !== depth) flag(`This answer already appears in row ${existing.row} with a different tier. Use the same tier or remove one row.`);
      continue;
    }
    if (current.answers.size >= CUSTOM_LIMITS.answersPerRound) { flag(`Use at most ${CUSTOM_LIMITS.answersPerRound} answers per question.`); continue; }
    current.answers.set(key, { depth, row });
    current.question.answers.push({ answer, depth });
  }
  if (!rows.length && !issues.length) issues.push({ message: "Paste at least one question and answer before previewing." });
  return { questions, issues };
}
