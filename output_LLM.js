import { AzureOpenAI } from "openai";
import "dotenv/config";
import { getFilteredDataSets } from "./output_OpenData.js";

const endpoint = process.env.AZURE_ENDPOINT;
const modelName = process.env.AZURE_MODEL_NAME || "gpt-4o-mini";
const deployment = process.env.AZURE_DEPLOYMENT_NAME || modelName;
const apiKey = process.env.AZURE_OPENAI_KEY;
const apiVersion = "2024-12-01-preview";

// Global system prompt that defines how the model should behave
const SYSTEM_PROMPT = `
Hodnocení lokality bydlení

Máš následující vstupní data ve formátu JSON, která obsahují souřadnice a detailní informace o lokalitě a jejím okolí (doprava, zdravotnictví, vzdělání, hluk, bezpečnost atd.).

Tvým úkolem je:

		Pro každou kategorii (například transport, healthcare, education, noise, safety a další) spočítat skóre vhodnosti lokality (hodnota 0–100, kde 100 je nejlepší).

		Nezasahuj do původní struktury dat (ponech všechny seznamy a podrobnosti beze změny).

		K úrovni každé hlavní kategorie v objektu data přidej nový klíč score s vypočítaným hodnocením.

		Vypočítej a přidej do nejvyšší úrovně objektu klíč total_score jako průměr všech kategorií.

		Výstup vrať ve formátu JSON se zachováním originální struktury, plus nová pole score a total_score.

		KRITICKY DŮLEŽITÉ: Výstup MUSÍ být validní JSON bez jakýchkoliv komentářů, zkratek nebo vynechaných částí. NIKDY nepoužívej komentáře typu "/* ... */" nebo zkratky. Vrať KOMPLETNÍ JSON se VŠEMI původními daty.

		Výsledky napiš v češtině, komentáře nejsou potřeba, stačí pouze skóre.

Speciální logiky:

Kategorii transport:

		Hodnoť bus_stops a train_stations podle počtu i vzdálenosti plynule a kombinovaně.

		Kvantita: Optimální počet bus_stops je 3+, train_stations je 1+. Za každou chybějící zastávku oproti optimu sniž skóre.

		Vzdálenost: Čím blíže jsou zastávky, tím lepší. Ideální vzdálenost pro bus_stop je do 300m, pro train_station do 1000m. Za každých dalších 100m nad ideál u bus_stop a dalších 250m u train_station postupně snižuj skóre.

		Kombinuj oba faktory: Pokud jsou zastávky daleko (např. 600m+), sniž skóre více. Pokud je počet zastávek optimální, ale jsou blíže než 300m, přidej body navíc.

Kategorii healthcare:

		Hodnoť převážně vzdálenost míst plynule. Ideální vzdálenost lékařů je do 10000m, nemocnice do 20000m.

		Za každých 1000m nad ideál postupně snižuj skóre.

		Pokud nějaká podkategorie chybí úplně (např. žádný dětský lékař), sniž celkové skóre healthcare významně.

Kategorie education:

		Hodnoť převážně vzdálenost míst plynule. Ideální vzdálenost škol je do 3500m, univerzit do 15000m.

		Za každých 500m u škol nad ideál a za každých 2000m nad ideál postupně snižuj skóre.

		Pokud nějaký typ školy zcela chybí, sniž skóre.

Kategorie work:

		Hodnoť převážně vzdálenost míst plynule. Optimální počet industrial_zones je 1+, ideální vzdálenost je do 2000m.

		Za každých 500m nad ideál postupně lehce snižuj skóre.

		Pokud industrial_zones chybí, sniž skóre významně.

Kategorii safety:

		Všechny podkategorie, které končí na _water (např. 5_water, 20_water, atd.) posuzuj takto:

				Jde o záplavové území x leté vody, kde x je počáteční číslo.

				Pokud je seznam prázdný, znamená to absenci záplavového území v dané kategorii, což považuj za pozitivní faktor a přiřaď vyšší skóre.

				Pokud seznam obsahuje objekty, hodnot riziko plynule podle jejich vzdálenosti a velikosti. Čím blíže a větší záplavové území, tím více sniž skóre bezpečnosti.

Kategorii noise:

		Hodnocení hluku dělej plynule tak, že čím je zdroj hluku blíže (menší vzdálenost v metrech), tím více snižuje skóre kvality (0–100, kde 0 znamená žádný hluk a 100 extrémně rušné místo).

		Zohledni rozdílnou intenzitu hluku zdrojů:

				Letiště: hlučné do 15000m, kritické do 5000m

				Vlakové tratě: hlučné do 5000m, kritické do 1000m

				Autobusové trasy: hlučné do 800m, kritické do 100m

		Pro každý typ zdroje použij jinou váhu a vzdálenostní křivku tak, aby hodnocení bylo plynulé a realistické.
`;

const client = new AzureOpenAI({
	endpoint,
	apiKey,
	deployment,
	apiVersion,
});

async function evaluateAddress(coordinates, openData) {
	try {
		console.log("=== API Request Debug ===");
		console.log("Model:", modelName);
		console.log("Input data size:", JSON.stringify({ coordinates, openData }).length, "characters");

		const response = await client.chat.completions.create({
			messages: [
				{ role: "user", content: SYSTEM_PROMPT + "\n\nInput data:\n" + JSON.stringify({ coordinates, openData }) },
			],
			model: modelName,
			max_completion_tokens: 32000,
			temperature: 1,
		});

		console.log("=== API Response Debug ===");
		console.log("Full response:", JSON.stringify(response, null, 2));

		if (!response.choices || response.choices.length === 0) {
			throw new Error("No response from API");
		}

		const content = response.choices[0].message.content;
		if (!content) {
			console.error("Empty content! Response object:", JSON.stringify(response, null, 2));
			throw new Error("Empty response content");
		}

		console.log("Response content:", content);

		// Remove any JSON comments that the model might have added
		let cleanedContent = content.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');

		// Extract just the JSON object/array (in case model adds text before/after)
		// Look for the first { or [ and find its matching closing bracket
		const firstBrace = cleanedContent.indexOf('{');
		const firstBracket = cleanedContent.indexOf('[');

		let startPos = -1;
		if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
			startPos = firstBrace;
		} else if (firstBracket !== -1) {
			startPos = firstBracket;
		}

		if (startPos !== -1) {
			// Find the matching closing bracket
			let depth = 0;
			let inString = false;
			let escapeNext = false;

			for (let i = startPos; i < cleanedContent.length; i++) {
				const char = cleanedContent[i];

				if (escapeNext) {
					escapeNext = false;
					continue;
				}

				if (char === '\\') {
					escapeNext = true;
					continue;
				}

				if (char === '"') {
					inString = !inString;
					continue;
				}

				if (!inString) {
					if (char === '{' || char === '[') {
						depth++;
					} else if (char === '}' || char === ']') {
						depth--;
						if (depth === 0) {
							cleanedContent = cleanedContent.substring(startPos, i + 1);
							break;
						}
					}
				}
			}
		}

		try {
			return JSON.parse(cleanedContent);
		} catch (parseError) {
			console.error("JSON parse error. Original content:", content);
			console.error("Cleaned content:", cleanedContent);
			throw parseError;
		}
	} catch (err) {
		console.error("Error evaluating address:", err);
		throw err;
	}
}

export async function getLLMResponse(lat, lon) {
	console.log("getLLMResponse");
	console.log(lat, lon);

	const sampleOpenData = await getFilteredDataSets(lat, lon);
	console.log(JSON.stringify(sampleOpenData, null, 2));

	// ✅ Pass the coordinates as an object
	const result = await evaluateAddress({ lat, lon }, sampleOpenData);

	// Transform the response to match frontend expectations
	// Frontend expects: { "transport": { "score": 85, "array": [...] }, "total_score": 87 }
	// LLM returns: { "coordinates": {...}, "openData": { "data": { "transport": { ...data..., "score": 85 }, ... } }, "total_score": 87 }

	if (result.openData && result.openData.data) {
		const transformed = {};

		// Extract each category with its score and convert to array format
		for (const [category, categoryData] of Object.entries(result.openData.data)) {
			// Extract the score
			const score = categoryData.score || 0;

			// Build summary array for the frontend
			const summaryArray = buildCategorySummary(category, categoryData);

			transformed[category] = {
				score: score,
				array: summaryArray
			};
		}

		// Add total_score - calculate it from category scores if not provided
		if (result.total_score) {
			transformed.total_score = result.total_score;
		} else {
			// Calculate average score from all categories
			const scores = Object.values(result.openData.data).map(cat => cat.score || 0);
			transformed.total_score = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
		}

		// Include the raw openData so the frontend can access POI coordinates for markers
		transformed.openData = result.openData;

		return transformed;
	}

	return result;
}

// Helper function to build summary arrays for each category
function buildCategorySummary(category, data) {
	const summary = [];

	switch (category) {
		case 'transport':
			if (data.bus_stops && data.bus_stops.length > 0) {
				summary.push({
					name: 'Nejbližší autobusová zastávka',
					value: `${data.bus_stops[0].name} (${data.bus_stops[0].distance_m}m)`
				});
				summary.push({
					name: 'Počet zastávek v okolí',
					value: `${data.bus_stops.length}`
				});
			}
			if (data.train_stations && data.train_stations.length > 0) {
				summary.push({
					name: 'Nejbližší vlakové nádraží',
					value: `${data.train_stations[0].name} (${data.train_stations[0].distance_m}m)`
				});
			}
			break;

		case 'healthcare':
			if (data.doctor_adult && data.doctor_adult.length > 0) {
				summary.push({
					name: 'Nejbližší lékař pro dospělé',
					value: `${data.doctor_adult[0].distance_m}m`
				});
			}
			if (data.doctor_child && data.doctor_child.length > 0) {
				summary.push({
					name: 'Nejbližší dětský lékař',
					value: `${data.doctor_child[0].distance_m}m`
				});
			}
			if (data.hospitals && data.hospitals.length > 0) {
				summary.push({
					name: 'Nejbližší nemocnice',
					value: `${data.hospitals[0].name} (${data.hospitals[0].distance_m}m)`
				});
			}
			break;

		case 'education':
			if (data.schools && data.schools.length > 0) {
				summary.push({
					name: 'Nejbližší škola',
					value: `${data.schools[0].name} (${data.schools[0].distance_m}m)`
				});
				summary.push({
					name: 'Počet škol v okolí',
					value: `${data.schools.length}`
				});
			}
			if (data.art_schools && data.art_schools.length > 0) {
				summary.push({
					name: 'Umělecké školy',
					value: `${data.art_schools.length}`
				});
			}
			break;

		case 'employment':
			if (data.industrial_zones && data.industrial_zones.length > 0) {
				summary.push({
					name: 'Nejbližší průmyslová zóna',
					value: `${data.industrial_zones[0].name} (${data.industrial_zones[0].distance_m}m)`
				});
			} else {
				summary.push({
					name: 'Průmyslové zóny',
					value: 'Žádné v okolí'
				});
			}
			break;

		case 'noise':
			const noiseSources = [];
			if (data.bus_routes && data.bus_routes.length > 0) {
				noiseSources.push(`Autobusové linky: ${data.bus_routes.length}`);
			}
			if (data.train_routes && data.train_routes.length > 0) {
				noiseSources.push(`Vlakové tratě: ${data.train_routes.length}`);
			}
			if (data.airport && data.airport.length > 0) {
				noiseSources.push(`Letiště v okolí`);
			}

			if (noiseSources.length > 0) {
				summary.push({
					name: 'Zdroje hluku',
					value: noiseSources.join(', ')
				});
			} else {
				summary.push({
					name: 'Zdroje hluku',
					value: 'Klidná lokalita'
				});
			}
			break;

		case 'safety':
			const floodRisks = [];
			if (data.flood_5year && data.flood_5year.length > 0) {
				floodRisks.push('5letá voda');
			}
			if (data.flood_20year && data.flood_20year.length > 0) {
				floodRisks.push('20letá voda');
			}
			if (data.flood_100year && data.flood_100year.length > 0) {
				floodRisks.push('100letá voda');
			}

			summary.push({
				name: 'Záplavové riziko',
				value: floodRisks.length > 0 ? floodRisks.join(', ') : 'Žádné riziko'
			});
			break;

		default:
			// For unknown categories, try to extract some basic info
			Object.keys(data).forEach(key => {
				if (key !== 'score' && Array.isArray(data[key]) && data[key].length > 0) {
					summary.push({
						name: key,
						value: `${data[key].length} položek`
					});
				}
			});
	}

	return summary;
}