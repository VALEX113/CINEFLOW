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
        model: 'mixtral-8x7b-32768',
        messages: [
          { role: 'system', content: 'Sei un esperto cinematografico mondiale. Conosci TUTTI i film dal 1888 ad oggi. Identifica film da descrizioni vaghe con massima precisione. Rispondi SOLO con JSON valido.' },
          { role: 'user', content: `Indizi: ${testo}${exclude}\n\nRispondi con JSON:\n{"verdict":"Ho identificato: TITOLO. Motivo","identified_title":"Titolo","results":[{"title":"Titolo","year":"Anno","country":"Paese","genre":"Genere","director":"Regista","cast":"Attori","reason":"Perche corrisponde","confidence":95}]}\n5 risultati reali ordinati per probabilita.` }
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
