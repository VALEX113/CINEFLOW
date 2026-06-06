export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo non consentito' });
  const { history, shown } = req.body;
  if (!history || !Array.isArray(history) || history.length === 0)
    return res.status(400).json({ error: 'Descrizione mancante' });
  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_KEY) return res.status(500).json({ error: 'API key non configurata' });
  const exclude = shown && shown.length ? '\nNON ripetere: ' + shown.join(', ') : '';
  const testo = history.join('\n');
  const prompt = `Sei il piu grande esperto cinematografico del mondo. Conosci tutti i film mai prodotti dal 1888 ad oggi.
COMPITO: Trova il film che l utente non ricorda.
INDIZI: ${testo}${exclude}
REGOLE: Usa tutta la tua conoscenza. Le citazioni tra virgolette sono prioritarie. Esempi: "due amici bianco nero carcere musica classica America 90" = Le ali della liberta 1994. "moro geloso moglie" = Otello. "serial killer sette peccati" = Seven 1995. "realta simulazione computer" = Matrix 1999.
Dai 5 risultati reali ordinati per probabilita. Spiega quale indizio ha portato a quel film.
Rispondi SOLO con JSON valido senza testo fuori:
{"verdict":"Ho identificato: TITOLO. Spiegazione max 20 parole","identified_title":"Titolo","results":[{"title":"Titolo","year":"Anno","country":"Paese","genre":"Genere","director":"Regista","cast":"Attori","reason":"Motivo specifico","confidence":95}]}`;
  try {
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + GEMINI_KEY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.1, maxOutputTokens: 1500 } })
    });
    if (!r.ok) { const e = await r.json(); throw new Error(e.error?.message || 'Errore Gemini ' + r.status); }
    const data = await r.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const clean = raw.replace(/```json|```/g, '').trim();
    return res.status(200).json(JSON.parse(clean));
  } catch(err) {
    return res.status(500).json({ error: err.message });
  }
}
