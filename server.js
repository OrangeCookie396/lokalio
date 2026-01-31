import express from "express";
import cors from "cors";
import { getLLMResponse } from "./output_LLM.js";

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files (your frontend)
app.use(express.static("public"));

// API endpoint
app.get("/evaluate", async (req, res) => {
	const lat = parseFloat(req.query.lat);
	const lon = parseFloat(req.query.lon);

	console.log(lat, lon);

	if (isNaN(lat) || isNaN(lon)) {
		return res.status(400).json({ error: "Invalid coordinates" });
	}

	try {
		const result = await getLLMResponse(lat, lon);
		res.json(result);
	} catch (err) {
		console.error("Error in /evaluate:", err);
		res.status(500).json({ error: err.message });
	}
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));