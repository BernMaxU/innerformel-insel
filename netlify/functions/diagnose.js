import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PROVIDER = process.env.KI_PROVIDER || 'anthropic';
const MODEL = process.env.KI_MODEL || 'claude-sonnet-4-5';

function loadSystemPrompt() {
  const promptPath = path.join(__dirname, '../../prompts/innerformel-system.md');
  return fs.readFileSync(promptPath, 'utf-8');
}

function buildUserMessage(antworten) {
  const lines = antworten.map((a, i) =>
    `**Frage ${i + 1}:** ${a.frage}\n**Antwort:** ${a.antwort}`
  ).join('\n\n---\n\n');

  return `Hier sind die Antworten des Klienten:\n\n${lines}\n\nBitte analysiere diese Antworten nach dem Innerformel-Regelwerk und gib das Ergebnis als valides JSON zurück. Nur JSON, kein Prosatext davor oder danach.`;
}

function parseKIResponse(text) {
  // JSON aus der Antwort extrahieren (robust gegen Markdown-Code-Blöcke)
  const clean = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  return JSON.parse(clean);
}

async function callAnthropic(systemPrompt, userMessage) {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }]
  });

  return response.content[0].text;
}

async function callOpenAI(systemPrompt, userMessage) {
  const { default: OpenAI } = await import('openai');
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await client.chat.completions.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ],
    response_format: { type: 'json_object' }
  });

  return response.choices[0].message.content;
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const { antworten } = body;

  if (!Array.isArray(antworten) || antworten.length === 0) {
    return { statusCode: 400, body: 'Keine Antworten übermittelt' };
  }

  const systemPrompt = loadSystemPrompt();
  const userMessage = buildUserMessage(antworten);
  // debug=true wenn Bernhard ?mode=check nutzt oder lokal entwickelt
  const isDebug = body.debug === true || process.env.NODE_ENV === 'development';

  let rawText;
  try {
    rawText = PROVIDER === 'openai'
      ? await callOpenAI(systemPrompt, userMessage)
      : await callAnthropic(systemPrompt, userMessage);
  } catch (err) {
    console.error('KI-Call fehlgeschlagen:', err);
    return {
      statusCode: 502,
      body: JSON.stringify({ error: 'KI nicht erreichbar', detail: err.message })
    };
  }

  let parsed;
  try {
    parsed = parseKIResponse(rawText);
  } catch (err) {
    console.error('JSON-Parse fehlgeschlagen:', rawText);
    return {
      statusCode: 502,
      body: JSON.stringify({ error: 'KI-Antwort nicht parsebar', raw: rawText })
    };
  }

  // Validierung der Pflichtfelder
  if (!parsed.hypothese_klient || !Array.isArray(parsed.vertiefungsfragen)) {
    return {
      statusCode: 502,
      body: JSON.stringify({ error: 'Unvollständige KI-Antwort', data: parsed })
    };
  }

  const result = {
    hypothese_klient: parsed.hypothese_klient,
    hypothese_intern: parsed.hypothese_intern || '',
    muster_erkannt: parsed.muster_erkannt || '',
    vertiefungsfragen: parsed.vertiefungsfragen.slice(0, 3)
  };

  // Debug-Daten nur im Check-Modus mitsenden
  if (isDebug) {
    result._debug_prompt = systemPrompt;
    result._debug_raw = rawText;
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(result)
  };
};
