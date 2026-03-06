import { AzureOpenAI } from "openai";
import "dotenv/config";

const client = new AzureOpenAI({
	endpoint: process.env.AZURE_ENDPOINT,
	apiKey: process.env.AZURE_OPENAI_KEY,
	deployment:
		process.env.AZURE_DEPLOYMENT_NAME || process.env.AZURE_MODEL_NAME,
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
					role: "system",
					content:
						"Jsi místní znalec a poradce pro bydlení v Královéhradeckém kraji. Dostaneš interní hodnocení lokality a tvým úkolem je napsat krátké shrnutí pro běžného člověka, který zvažuje bydlení v dané lokalitě. Pravidla: - Piš přirozeně, jako by ses bavil s kamarádem – žádný formální nebo robotický tón - NIKDY nezmiňuj čísla, skóre, body ani hodnocení – pracuj jen s jejich významem - Vyzdvihni 1-2 silné stránky a upozorni na případné slabiny - Maximálně 3-4 věty - Bez úvodu, rovnou k věci - Pouze česky",
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
