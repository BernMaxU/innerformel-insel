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

  const {
    antworten = [],
    hypothese_klient,
    hypothese_intern,
    muster_erkannt,
    vertiefungsfragen = [],
    zeitstempel,
    profil = 'standard'
  } = body;

  const bernhardEmail = process.env.BERNHARD_EMAIL || 'bernhard@bernharduka.com';
  const resendKey = process.env.RESEND_API_KEY;

  if (!resendKey) {
    console.warn('RESEND_API_KEY nicht gesetzt — E-Mail-Versand übersprungen');
    return { statusCode: 200, body: JSON.stringify({ ok: true, skipped: true }) };
  }

  const datum = new Date(zeitstempel || Date.now()).toLocaleString('de-DE', {
    timeZone: 'Europe/Berlin',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  const fragenliste = antworten.map((a, i) =>
    `<tr>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e2dc; vertical-align: top; color: #6b6b6b; font-size: 14px; width: 40%;">${a.frage}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e2dc; vertical-align: top; font-size: 14px;">${a.antwort}</td>
    </tr>`
  ).join('');

  const vertiefungsHtml = vertiefungsfragen.map((f, i) =>
    `<li style="margin-bottom: 8px; padding-left: 4px;">${f}</li>`
  ).join('');

  const emailHtml = `
<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"></head>
<body style="font-family: Georgia, serif; background: #faf8f5; margin: 0; padding: 24px;">
  <div style="max-width: 680px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.06);">

    <div style="background: #1c2536; color: #fff; padding: 24px 32px;">
      <p style="margin: 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #c9a961;">Innerformel Diagnose-Insel</p>
      <h1 style="margin: 8px 0 0; font-size: 22px; font-weight: 400;">Neues Transkript</h1>
      <p style="margin: 8px 0 0; font-size: 13px; color: rgba(255,255,255,0.7);">${datum} · Profil: ${profil}</p>
    </div>

    <div style="padding: 32px;">

      <h2 style="font-size: 16px; text-transform: uppercase; letter-spacing: 0.08em; color: #6b6b6b; margin: 0 0 8px;">Hypothese (Klient-Sprache)</h2>
      <blockquote style="border-left: 3px solid #c9a961; margin: 0 0 24px; padding: 12px 20px; font-style: italic; font-size: 16px; line-height: 1.6; color: #1c2536;">
        ${hypothese_klient || '—'}
      </blockquote>

      <h2 style="font-size: 16px; text-transform: uppercase; letter-spacing: 0.08em; color: #6b6b6b; margin: 0 0 8px;">Hypothese (Innerformel-Sprache)</h2>
      <blockquote style="border-left: 3px solid #1c2536; margin: 0 0 8px; padding: 12px 20px; font-size: 14px; line-height: 1.6; color: #1c2536;">
        ${hypothese_intern || '—'}
      </blockquote>
      <p style="margin: 0 0 24px; font-size: 13px; color: #6b6b6b;">Muster erkannt: <strong>${muster_erkannt || '—'}</strong></p>

      <h2 style="font-size: 16px; text-transform: uppercase; letter-spacing: 0.08em; color: #6b6b6b; margin: 0 0 12px;">3 Vertiefungsfragen</h2>
      <ol style="padding-left: 20px; margin: 0 0 32px; line-height: 1.7; font-size: 15px;">
        ${vertiefungsHtml}
      </ol>

      <h2 style="font-size: 16px; text-transform: uppercase; letter-spacing: 0.08em; color: #6b6b6b; margin: 0 0 12px;">Alle Antworten</h2>
      <table style="width: 100%; border-collapse: collapse; font-family: Arial, sans-serif;">
        <thead>
          <tr style="background: #f5f3f0;">
            <th style="padding: 8px 12px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #6b6b6b; width: 40%;">Frage</th>
            <th style="padding: 8px 12px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #6b6b6b;">Antwort</th>
          </tr>
        </thead>
        <tbody>${fragenliste}</tbody>
      </table>

    </div>

    <div style="background: #f5f3f0; padding: 16px 32px; text-align: center;">
      <p style="margin: 0; font-size: 12px; color: #6b6b6b;">Innerformel Diagnose-Insel · bernharduka.com</p>
    </div>

  </div>
</body>
</html>`;

  try {
    const { Resend } = await import('resend');
    const resend = new Resend(resendKey);

    await resend.emails.send({
      from: 'Innerformel Diagnose <noreply@bernharduka.com>',
      to: bernhardEmail,
      subject: `Neues Diagnose-Transkript · ${datum}`,
      html: emailHtml
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true })
    };
  } catch (err) {
    console.error('Resend-Fehler:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'E-Mail-Versand fehlgeschlagen', detail: err.message })
    };
  }
};
