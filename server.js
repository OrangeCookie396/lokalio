import express from "express";
import cors from "cors";
import { exec } from "child_process";
import { evaluate } from "./src/evaluate.js";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

app.get("/evaluate", async (req, res) => {
	const lat = parseFloat(req.query.lat);
	const lon = parseFloat(req.query.lon);

	if (isNaN(lat) || isNaN(lon)) {
		return res.status(400).json({ error: "Invalid coordinates" });
	}

	try {
		const result = await evaluate(lat, lon);
		res.json(result);
	} catch (err) {
		console.error("Error in /evaluate:", err);
		res.status(500).json({ error: err.message });
	}
});

app.post("/api/github-webhook", (req, res) => {
	res.status(200).send("Webhook received");
	exec("git pull", (error, stdout, stderr) => {
		if (error) {
			console.error(`Git pull error: ${error.message}`);
			return;
		}
		if (stderr) console.error(`Git warning: ${stderr}`);
		console.log(`Git pull OK:\n${stdout}`);
	});
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
	console.log(`Server running on http://localhost:${PORT}`);
});
