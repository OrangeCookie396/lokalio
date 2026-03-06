import { AzureOpenAI } from "openai";
import "dotenv/config";

const client = new AzureOpenAI({
	endpoint: process.env.AZURE_ENDPOINT,
	apiKey: process.env.AZURE_OPENAI_KEY,
	deployment: process.env.AZURE_DEPLOYMENT_NAME || process.env.AZURE_MODEL_NAME,
	apiVersion: "2024-12-01-preview",
});

const CATEGORY_NAMES = {
	transport: "Doprava",
	healthcare: "Zdravotnictví",
	recreation: "Rekreace",
	education: "Vzdělání",
	work: "Práce",
	qol: "Kvalita života",
};

function buildPromptData(result) {
	const lines = [];
	for (const [key, cat] of Object.entries(result)) {
		if (key === "coordinates" || key === "summary") continue;
		const name = CATEGORY_NAMES[key] || key;
		lines.push(`${name}: ${cat.value}/5`);

		for (const [subKey, sub] of Object.entries(cat)) {
			if (subKey === "value" || subKey === "entities") continue;
			if (sub && typeof sub === "object" && "value" in sub) {
				lines.push(`  - ${subKey}: ${sub.value}/5`);
			}
		}
	}
	return lines.join("\n");
}

export async function generateSummary(result) {
	const scoreData = buildPromptData(result);

	try {
		const response = await client.chat.completions.create({
			messages: [
				{
					role: "developer",
					content:
						"Jsi analytik kvality bydlení v Královéhradeckém kraji. Na základě hodnocení lokality (1-5, kde 5 je nejlepší) napiš stručné shrnutí v češtině. Vyzdvihni silné a slabé stránky. Maximálně 3-4 věty. Piš přímo, bez úvodu. Nepoužívej emoji.",
				},
				{
					role: "user",
					content: `Hodnocení lokality na souřadnicích ${result.coordinates.lat}, ${result.coordinates.lon}:\n\n${scoreData}`,
				},
			],
			model: process.env.AZURE_MODEL_NAME || "o4-mini",
			max_completion_tokens: 4000,
		});

		return response.choices?.[0]?.message?.content || null;
	} catch (err) {
		console.error("AI summary error:", err.message);
		return null;
	}
}
