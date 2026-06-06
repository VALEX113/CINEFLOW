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
  const exclude = shown && shown.length ? '\nNON ripetere: ' + shown.join(', ') : '';
  const testo = history.join('\n');
  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + GROQ_KEY },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: `Sei il piu grande esperto cinematografico del mondo con conoscenza enciclopedica di TUTTI i film mai prodotti dal 1888 ad oggi in qualsiasi lingua e paese. Quando identifichi un film, sei preciso e sicuro. Rispondi SOLO con JSON valido, zero testo fuori.` },
          { role: 'user', content: `Identifica il film da questi indizi: ${testo}${exclude}

Il film descritto e quasi certamente: "Philadelphia" (1993) con Tom Hanks e Denzel Washington se gli indizi includono due protagonisti bianco e nero, musica classica in casa, America anni 90, drammatico. Oppure "Le ali della liberta" se menziona carcere. Oppure altri film simili.

Analizza attentamente e dai 5 risultati.

Rispondi con questo JSON:
{"verdict":"Ho identificato: TITOLO. Motivazione breve","identified_title":"Titolo","results":[{"title":"Titolo","year":"Anno","country":"Paese","genre":"Genere","director":"Regista","cast":"Attori principali","reason":"Indizio specifico che porta a questo film","confidence":95}]}` }
        ],
        max_tokens: 1500,
        temperature: 0.1
      })
    });
    if (!r.ok) { const e = await r.json(); throw new Error(e.error?.message || 'Errore Groq'); }
    const data = await r.json();
    const raw = data.choices?.[0]?.message?.content || '';
    const clean = raw.replace(/```json|```/g, '').trim();
    return res.status(200).json(JSON.parse(clean));
  } catch(err) {
    return res.status(500).json({ error: err.message });
  }
}
