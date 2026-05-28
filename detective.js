// api/detective.js — Vercel Serverless Function
// La chiave Groq è protetta sul server, mai esposta al browser

export default async function handler(req, res) {
  // CORS — permette chiamate dal frontend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo non consentito' });
  }

  const { history, shown } = req.body;

  if (!history || !Array.isArray(history) || history.length === 0) {
    return res.status(400).json({ error: 'Descrizione mancante' });
  }

  const GROQ_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_KEY) {
    return res.status(500).json({ error: 'API key non configurata' });
  }

  const excludeNote = shown && shown.length
    ? '\nNON ripetere questi film già mostrati: ' + shown.join(', ')
    : '';

  const histText = history.join('\n');

  const systemPrompt = `Sei il più grande esperto cinematografico del mondo con conoscenza enciclopedica di TUTTI i film mai prodotti in qualsiasi lingua e paese dal 1888 ad oggi — Hollywood, Bollywood, cinema italiano, francese, coreano, giapponese, horror, western, fantascienza, classici, film d'autore, blockbuster.

Il tuo unico compito è identificare il film che l'utente non ricorda.

REGOLE FONDAMENTALI:
1. Usa TUTTA la tua conoscenza cinematografica mondiale.
2. Una CITAZIONE tra virgolette è un indizio prioritario assoluto — identificala con certezza.
3. Ragiona per associazioni cinematografiche precise:
   - "il moro geloso della moglie" = Otello (Shakespeare, film 1995 con Laurence Fishburne)
   - "due amici Mozart/musica classica prigione" = Le ali della libertà (Shawshank Redemption, 1994)
   - "serial killer sette peccati capitali" = Seven (1995, Brad Pitt, Morgan Freeman)
   - "bambina alieno travestito da cane" = Lilo & Stitch
   - "la realtà è una simulazione computer" = Matrix (1999)
4. Dai SEMPRE 5 risultati con titoli diversi, ordinati per probabilità.
5. Sii DIRETTO. Se riconosci il film, confidence alta (85-99%).
6. Rispondi SOLO con JSON valido, zero testo fuori.`;

  const userPrompt = `INDIZI FORNITI DALL'UTENTE:
${histText}
${excludeNote}

Rispondi SOLO con questo JSON:
{
  "verdict": "Ho identificato il film: [TITOLO]. [Motivazione breve prima persona max 20 parole]",
  "identified_title": "Titolo esatto del film più probabile",
  "results": [
    {
      "title": "Titolo esatto",
      "year": "Anno",
      "country": "Paese di produzione",
      "genre": "Genere",
      "director": "Regista",
      "reason": "Indizio specifico che ha portato a questo film",
      "confidence": 95
    }
  ]
}
Includi esattamente 5 risultati ordinati per pertinenza decrescente.`;

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
          { role: 'user',   content: userPrompt }
        ],
        max_tokens: 1200,
        temperature: 0.2
      })
    });

    if (!groqRes.ok) {
      const err = await groqRes.json();
      throw new Error(err.error?.message || 'Errore Groq API');
    }

    const data  = await groqRes.json();
    const raw   = data.choices?.[0]?.message?.content || '';
    const clean = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    return res.status(200).json(parsed);

  } catch (err) {
    console.error('Detective error:', err);
    return res.status(500).json({ error: err.message });
  }
}
