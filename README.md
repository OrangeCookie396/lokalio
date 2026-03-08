![lokalio banner](public/img/banner_readme.png)

# lokalio

**lokalio** je open-datová webová aplikace pro nalezení ideálního místa k bydlení v Královehradeckém kraji. Na základě vybrané lokace komplexně vyhodnotí okolní infrastrukturu ve více kategoriích a poskytne přehledné skóre doplněné o AI shrnutí.

## Kategorie hodnocení

| Kategorie | Co zahrnuje |
|---|---|
| **Doprava** | Autobusové zastávky, vlakové stanice, dostupnost veřejné dopravy |
| **Zdravotnictví** | Nemocnice, praktičtí lékaři, dětské ambulance |
| **Vzdělání** | Základní školy, umělecké školy a vzdělávací instituce |
| **Práce** | Průmyslové zóny, pracovní příležitosti, ekonomická aktivita |
| **Bezpečnost** | Záplavové zóny, rizikové oblasti a bezpečnostní faktory |
| **Kvalita života** | Hluková zátěž a komfort každodenního života |

Výsledky lze přizpůsobit životní situaci uživatele – aplikace nabízí profily pro **studenta**, **rodiče** i **pracujícího**, přičemž každý profil zdůrazňuje jiné kategorie.

## Jak to funguje

1. **Vyberte lokaci** – kliknutím na mapu označte místo, které vás zajímá
2. **Analyzujeme okolí** – systém zpracuje otevřené datové sady a pomocí AI vyhodnotí kvalitu okolí ve všech kategoriích
3. **Získejte přehled** – přehledné skóre s vizualizací na mapě, vše na jednom místě

## Technologie

- **Geoprostorová analýza:** vlastní implementace v JavaScriptu (haversine, IDW interpolace, polygon containment, S-JTSK projekce)
- **AI shrnutí:** OpenAI-kompatibilní API (konfigurovatelný endpoint a model)
- **Data:** otevřené datové sady Královehradeckého kraje – 48 datasetů, 6 kategorií

## Spuštění

### 1. Datasety

Do složky `data/` v rootu projektu umístěte potřebné GeoJSON datasety (celkem 48 souborů). Datasety pocházejí z otevřených dat Královehradeckého kraje a dalších českých veřejných institucí.

### 2. Dependencies

```bash
npm install
```

### 3. Konfigurace prostředí

Vytvořte soubor `.env` podle šablony `.env.example` a doplňte vlastní API klíč a endpoint pro jazykový model.

### 4. Spuštění serveru

```bash
npm start
```

Poté otevřete `public/index.html` v prohlížeči.

## Licence

MIT © 2026 – Matyáš Brett, Richard Hývl, Jan Štefáček, Nicolas Weiser

Volné použití, úpravy i sdílení jsou povoleny pod podmínkou uvedení původních autorů.