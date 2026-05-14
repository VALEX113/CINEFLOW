# CineFlow v5.0

App cinema con Modalità Detective AI.

## Deploy su Vercel

### 1. Carica su GitHub
- Crea un nuovo repository su github.com
- Carica tutti i file di questa cartella

### 2. Collega a Vercel
- Vai su vercel.com → "Add New Project"
- Seleziona il repository GitHub appena creato
- Clicca "Deploy"

### 3. Aggiungi la variabile d'ambiente
Dopo il primo deploy:
- Vai su Vercel → il tuo progetto → "Settings" → "Environment Variables"
- Aggiungi:
  - **Nome:** `GROQ_API_KEY`
  - **Valore:** la tua chiave Groq (gsk_...)
- Clicca "Save"
- Vai su "Deployments" → "Redeploy"

### 4. Fatto!
L'app è online su `https://[nome-progetto].vercel.app`
La Modalità Detective funziona con AI reale.

## Struttura
```
cineflow/
├── api/
│   └── detective.js    ← Backend serverless (chiama Groq)
├── public/
│   └── index.html      ← Frontend completo CineFlow
├── vercel.json         ← Configurazione routing
└── package.json
```
