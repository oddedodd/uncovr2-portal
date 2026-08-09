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

## Roller og arbeidsområder

Portalen bruker arbeidsområdene og rollene Laravel returnerer fra `/api/v1/me`:

- `superadmin` administrerer plattformen og oppretter labels.
- `label_admin` administrerer labelprofil, labelteam og artist-onboarding.
- `label_user` har skrivebeskyttet eller avgrenset labeltilgang.
- `artist_admin` administrerer artist og tilhørende innhold.
- `artist_user` har avgrenset artisttilgang.

Menyer og knapper tilpasses rollen for å gjøre portalen enklere å bruke. Laravel
Policies kontrollerer likevel autorisasjonen på hvert API-kall.

## Onboarding av label og artist

Superadmin oppretter label og inviterer den første Label Admin i ett atomisk
kall til `POST /api/v1/platform/organization-onboardings`. Label Admin oppretter
tilsvarende artist, labeltilknytning og første Artist Admin-invitasjon gjennom
`POST /api/v1/organizations/{organization}/artist-onboardings`.

Laravel utfører hvert onboardingkall i én databasetransaksjon. Hvis opprettelse
eller invitasjon feiler, skal ingen av delene bli liggende igjen. Personen som
utfører handlingen får ikke automatisk medlemskap i det nye arbeidsområdet.

## Invitasjoner og brukerkonto

En invitasjon oppretter en rolleinvitasjon, ikke en ferdig brukerkonto eller et
passord. Mottakeren åpner invitasjonslenken og velger mellom:

1. `Opprett konto og fortsett` for en ny bruker. Kontoen må registreres med
   nøyaktig samme e-postadresse som invitasjonen ble sendt til.
2. `Logg inn med eksisterende konto` når mottakeren allerede har en Uncovr-konto
   med den inviterte e-postadressen.

Portalen beholder hele den interne invitasjonsadressen i den URL-kodede
`return_to`-parameteren gjennom registrering, e-postbekreftelse og innlogging.
Bare kjente interne akseptruter med token godtas som returadresse. Tokenet lagres
ikke i `localStorage` eller `sessionStorage`.

Etter autentisering godtar portalen invitasjonen gjennom Laravel:

- Labelinvitasjon: `POST /api/v1/organization-invitations/accept`
- Artistinvitasjon: `POST /api/v1/artist-invitations/accept`

Bekreftelsesmailen for en ny konto peker foreløpig direkte til Laravel og viser
API-bekreftelsen i nettleseren. Åpne derfor bekreftelseslenken i en ny fane,
lukk fanen etter bekreftelsen og fortsett i den opprinnelige portalfanen.
Invitasjonen og tokenet beholdes der. Backend bør senere videresende vanlige
nettleserbesøk til en brukervennlig portalside, samtidig som API-klienter fortsatt
kan få JSON.

Invitasjons- og bekreftelsesmailer sendes via Laravel-køen. En køarbeider må
derfor kjøre lokalt for at mottakeren skal få e-post.

## Profilbilder og utgivelsesomslag

Label Admin og superadmin kan legge til eller bytte labellogo. Label Admin,
Artist Admin og superadmin kan administrere artistlogo og artistbilde. Portalen
viser også albumomslag i utgivelsesoversikten og lar autoriserte brukere endre
omslaget mens utgivelsen har en redigerbar status.

Alle bildene bruker Laravels medieflyt:

1. Portalen oppretter en mediepost med riktig label eller artist som eier.
2. Laravel returnerer en kortlivet, signert opplastingsadresse.
3. Nettleseren laster filen direkte til bildelageret og ber Laravel verifisere
   resultatet.
4. Først etter verifisering kobles medie-ID-en til profilen eller utgivelsen.

Signerte adresser og tokens lagres aldri i nettleserlagring eller miljøvariabler.
Listevisninger bruker batch-endepunktet `POST /api/v1/media/downloads` for å
hente midlertidige bilde-URL-er uten ett API-kall per bilde. Tillatte formater er
JPEG, PNG, WebP og AVIF; Laravel håndhever filstørrelse, dimensjoner, eierskap og
autorisasjon.

## Statisk hosting

Produksjonsbygget genereres med `npm run build` og publiseres fra `dist/` på
`https://admin.uncovr.no`. `public/_redirects` sørger for at statiske verter som
støtter dette formatet sender ukjente klientruter til `index.html`. På andre
verter må den tilsvarende fallback-regelen konfigureres i infrastrukturen.
