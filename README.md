![image](banner_readme.png)

***lokalio*** je open-datová aplikace pro nalezení ideálního místa k bydlení. Využívá otevřené datové sady, které následně analyzuje pro zadanou adresu. Vyhodnocuje blízkost lékačské pomoci, zdroje hluku, dostupnost dopravy i reakreační či blízké pracovní příležitosti.

# Deployment
Potřebné kroky pro spuštění programu.

### 1. Datasety
Pro instalaci datasetů stáhněte [tuto složku](https://drive.google.com/drive/folders/1uQUTqtuRndqr4fHX9ZSsXq7o_u6VKztx?usp=drive_link) a uložte datasety do složky `data/` v rootu. Datasetů by mělo být 14.

### 2. npm a .env
Pro instalaci potřebných balíčků spusťte v terminálu příkaz:

```
npm install
```

Pro napojení na AI je potřeba soubor `.env` s vlastními údaji. Šablonu pro `.env` soubor naleznete [zde](.env.example).

### 3. Spuštění aplikace
Pro spuštění aplikace je potřeba zapnout server příkazem:

```
node server.js
```

Po spuštění server stačí otevří `public/index.html` v prohlížeči a aplikace by měla být funkční.