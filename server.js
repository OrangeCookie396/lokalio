import express from "express";
import cors from "cors";
import { exec } from "child_process"; // Přidáno pro webhook
import { getLLMResponse } from "./output_LLM.js";

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files (your frontend)
app.use(express.static("public"));

// --- 1. Váš hlavní API endpoint ---
app.get("/evaluate", async (req, res) => {
    const lat = parseFloat(req.query.lat);
    const lon = parseFloat(req.query.lon);

    console.log(`🌍 Požadavek na souřadnice: ${lat}, ${lon}`);

    if (isNaN(lat) || isNaN(lon)) {
        return res.status(400).json({ error: "Invalid coordinates" });
    }

    try {
        const result = await getLLMResponse(lat, lon);
        res.json(result);
    } catch (err) {
        console.error("❌ Error in /evaluate:", err);
        res.status(500).json({ error: err.message });
    }
});

// --- 2. Tajný Webhook endpoint pro automatický Git Pull ---
app.post('/api/github-webhook', (req, res) => {
    console.log('🚀 Přišel signál z GitHubu! Jdu stahovat novinky...');
    
    // Okamžitě odpovíme stavovým kódem 200, ať GitHub nečeká
    res.status(200).send('Webhook přijat');

    // Spustíme git pull v terminálu
    exec('git pull', (error, stdout, stderr) => {
        if (error) {
            console.error(`❌ Chyba při git pull: ${error.message}`);
            return;
        }
        if (stderr) console.error(`⚠️ Git upozornění: ${stderr}`);
        
        console.log(`✅ Git pull úspěšný:\n${stdout}`);
        // Nodemon si teď sám všimne stažených souborů a restartuje server
    });
});

// --- 3. Dynamický port pro Dev vs Server složku ---
// Pokud najde .env s PORT=3001, použije ho. Jinak pojede na 3000.
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🔥 Server jede na http://localhost:${PORT}`);
});