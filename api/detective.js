export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo non consentito' });

  const { history, shown } = req.body;
  if (!history || !Array.isArray(history) || history.length === 0)
    return res.status(400).json({ error: 'Descrizione mancante' });

  const GROQ_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_KEY) return res.status(500).json({ error: 'API key non configurata' });

  const excludeNote = shown && shown.length
    ? '\nNON mostrare questi film già mostrati: ' + shown.join(', ')
    : '';

  const histText = history.join('\n');

  const systemPrompt = `Sei il più grande esperto cinematografico del mondo. Conosci TUTTI i film mai prodotti in qualsiasi lingua dal 1888 ad oggi.

COMPITO: Identificare il film che l'utente non ricorda dagli indizi forniti.

REGOLE FONDAMENTALI:
1. Analizza gli indizi con estrema attenzione. Usa la tua intera conoscenza cinematografica.
2. Una CITAZIONE tra virgolette è l'indizio più importante — identificala con certezza assoluta.
3. Ragiona come un detective: ogni dettaglio conta.
4. Dai SEMPRE 5 risultati diversi e plausibili, ordinati per probabilità.
5. Il primo risultato deve essere il film più probabile.
6. Sii specifico nella motivazione — spiega ESATTAMENTE quale indizio ti ha portato a quel film.
7. NON inventare film — usa solo film reali che conosci con certezza.
8. Se l'utente descrive personaggi, scene o trame specifiche, identificale con precisione.

ESEMPI DI RAGIONAMENTO CORRETTO:
- "due amici uno bianco uno nero + musica classica vinile + America anni 90 + carcere" = Le ali della libertà (1994) - scena iconica del Mozart trasmesso agli altoparlanti del carcere
- "il moro geloso della moglie" = Otello (Shakespeare) - il Moro di Venezia che per gelosia uccide Desdemona
- "serial killer sette peccati capitali" = Seven (1995) - Brad Pitt e Morgan Freeman
- "la realtà è una simulazione" = Matrix (1999)
- "bambina hawaii alieno cane" = Lilo & Stitch (2002)`;

  const userPrompt = `INDIZI DELL'UTENTE:
${histText}
${excludeNote}

Rispondi SOLO con JSON valido, zero testo fuori:
{
  "verdict": "Ho identificato il film: [TITOLO]. [Spiegazione precisa in prima persona max 25 parole]",
  "identified_title": "Titolo esatto del film più probabile",
  "results": [
    {
      "title": "Titolo esatto del film",
      "year": "Anno di uscita",
      "country": "Paese di produzione",
      "genre": "Genere principale",
      "director": "Nome regista",
      "cast": "Attori principali",
      "reason": "Quale indizio specifico ha portato a questo film",
      "confidence": 95
    }
  ]
}
Includi esattamente 5 risultati reali ordinati per pertinenza decrescente.`;

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + GROQ_KEY
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 1500,
        temperature: 0.1
      })
    });

    if (!groqRes.ok) {
      const err = await groqRes.json();
      throw new Error(err.error?.message || 'Errore Groq API: ' + groqRes.status);
    }

    const data = await groqRes.json();
    const raw = data.choices?.[0]?.message?.content || '';
    const clean = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    return res.status(200).json(parsed);

  } catch (err) {
    console.error('Detective error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
