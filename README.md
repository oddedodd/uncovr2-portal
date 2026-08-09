# Uncovr admin portal

React- og TypeScript-portalen for plattformteam, labels og artister. Laravel på
`api.uncovr.no` er eneste backend og autorisasjonsgrense.

## Lokal utvikling

Krav: Node.js 24 og npm.

```bash
cp .env.example .env.local
npm ci
npm run dev
```

Portalen kjører på `http://localhost:5173` og forventer Laravel på
`http://localhost:8000`. Bruk `localhost` for begge; ikke bland inn
`127.0.0.1`, fordi det bryter den cookie-baserte Sanctum-flyten.

## Kvalitetskontroll

```bash
npm run check
```

Kommandoen kontrollerer formatering, lint, TypeScript og enhetstester uten å
lage et produksjonsbygg. Den samme kontrollen kjører i GitHub Actions.

## Miljø

`VITE_API_URL` valideres ved oppstart. Standard er `http://localhost:8000` i
utvikling og `https://api.uncovr.no` i produksjon. Bare offentlige Vite-verdier
kan ligge i `VITE_*`; hemmeligheter skal aldri legges i portalens miljøfiler.

## API og autentisering

API-klienten sender cookies på alle kall, legger til en UUID i `X-Request-ID`
og gjør Laravels feilkonvolutt om til `ApiError`. Før innlogging skal klienten
kalle `initializeCsrf()`, og deretter sende innloggingen til
`/api/v1/auth/login`. Session-cookien lagres og sendes av nettleseren, ikke av
React-koden.

## Statisk hosting

Produksjonsbygget genereres med `npm run build` og publiseres fra `dist/` på
`https://admin.uncovr.no`. `public/_redirects` sørger for at statiske verter som
støtter dette formatet sender ukjente klientruter til `index.html`. På andre
verter må den tilsvarende fallback-regelen konfigureres i infrastrukturen.
