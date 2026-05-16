# Innerformel Diagnose-Insel

Interaktives Live-Diagnose-Tool, das Bernhard Ukas Innerformel-Methodik im Klientenmoment sichtbar macht.

## Setup

```bash
cp .env.example .env
# .env mit echten Keys füllen

npm install
netlify dev
# läuft auf http://localhost:8888
```

## Deploy

1. Repo auf GitHub pushen
2. Netlify → New site from Git
3. Publish directory: `public` | Functions: `netlify/functions`
4. Env-Vars im Dashboard setzen
5. Bei jedem Push auf `main` automatisch deployt

## Env-Vars

| Variable | Beschreibung |
|---|---|
| `KI_PROVIDER` | `openai` oder `anthropic` |
| `KI_MODEL` | z. B. `claude-sonnet-4-5` oder `gpt-4o` |
| `ANTHROPIC_API_KEY` | Anthropic API Key |
| `OPENAI_API_KEY` | OpenAI API Key |
| `RESEND_API_KEY` | Resend für E-Mail-Versand |
| `BERNHARD_EMAIL` | Ziel-Adresse für Transkript-Mails |
| `BOOKING_URL` | Link zum Termin-Buchungssystem |

## Debug-Modus

`?mode=check` in der URL aktiviert vollständige Prompt- und Response-Anzeige für Bernhard.

## Benni-Profil

`?profil=mehrere-standbeine` lädt den spezifischen Fragenkatalog für Mehr-Standbein-Selbstständige.
