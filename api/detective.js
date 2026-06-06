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
  const excludeNote = shown && shown.length ? '\nNON mostrare: ' + shown.join(', ') : '';
  const histText = history.join('\n');
  const prompt = `Sei il più grande esperto cinematografico del mondo. Conosci TUTTI i film mai prodotti dal 1888 ad oggi in qualsiasi lingua e paese.
COMPITO: Identificare con certezza il film che l utente non ricorda.
INDIZI:
${histText}
${excludeNote}
REGOLE:
1. Usa tutta la tua conoscenza cinematografica mondiale.
2. Una CITAZIONE tra virgolette e l indizio piu importante.
3. Esempi: "due amici bianco e nero musica classica carcere America anni 90" = Le ali della liberta (1994). "moro geloso moglie" = Otello. "serial killer sette peccati" = Seven (1995).
4. Dai 5 risultati reali ordinati per probabilita.
5. Sii preciso e spiega quale indizio ha portato a quel film.
Rispondi SOLO con JSON:
{"verdict":"Ho identificato: [TITOLO]. [Spiegazione max 20 parole]","identified_title":"Titolo","results":[{"title":"Titolo","year":"Anno","country":"Paese","genre":"Genere","director":"Regista","cast":"Attori","reason":"Motivo","confidence":95}]}`;
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{temperature:0.1,maxOutputTokens:1500}})});
    if (!r.ok) { const e = await r.json(); throw new Error(e.error?.message || 'Errore Gemini'); }
    const data = await r.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const clean = raw.replace(/```json|```/g,'').trim();
    return res.status(200).json(JSON.parse(clean));
  } catch(err) {
    console.error('Detective error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
