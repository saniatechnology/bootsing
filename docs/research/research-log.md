# Research log — Bootsing event research

Persistent, cross-round notes so future research passes don't repeat work.
Keep it concise but human-readable. Update after every research round.

- **Last round:** 2026-09-21 (by Copilot / Opus 4.8, via `fetch_webpage`)
- **Round 2:** 2026-09-21 — deep-dive on Sep 28–Oct 18 to populate the later weeks (added 27 events; TECH gap closed, Santa Mònica now fetchable).
- **Round 3:** 2026-09-24 — user-supplied URL batch (La Mercè + club/party links). Added 11 events (ids 187–197). New fetchable sources: dice.fm (JSON-LD), luma.com. RA + Instagram still unreadable.
- **Round 4:** 2026-10-02 (Claude Fable 5.1, via WebFetch/WebSearch) — Friday pass for the rest of the current week (Fri 02 → Sun 04 Oct). 37 events assembled + validated in **append** mode (replace would have wiped the Mon–Thu rows). **DB insert was blocked by the sandbox** — run `scratchpad/insert-weekend.mjs` (see TODO 0). New fetchable sources: laut.es, heliogabal.com, beteve.cat festa-major pages, eventosfrikis.com, retroplayingbcn.es, lapedrera.com, nitbcn.com. barcelona.cat now answers 418 on WCA/Virreina pages.
- **Window researched:** 2026-09-21 → 2026-10-18 (weeks of 09-21, 09-28, 10-05, 10-12)
- **Output file:** `research/researched-events.json`

---

## Source status

Legend: ✅ useful & fetchable · ⚠️ partial (pagination/limited) · 🟨 JS-only (extraction failed) · ⛔ blocked · 404 wrong URL

| Source | URL | Status | Notes |
| --- | --- | --- | --- |
| La Mercè 2026 | barcelona.cat/lamerce/en | ✅ | Festival 23–27 Sep. Rich dated+timed program (BAM music, MAC street arts, exhibitions). |
| Sala Apolo (fav) | sala-apolo.com/en/schedule | ⚠️ | Week view w/ times. Only shows current week — **need pagination for October dates**. Clubs: Bresh, Nalgas(queer), Milkshake(queer), Oxido, El Dúplex, Nitsa(electronic), Diablada, Churros con chocolate. |
| Razzmatazz (fav) | salarazzmatazz.com/en/agenda/ | ✅ | Full agenda w/ door times + prices, ~2 weeks out (to ~04 Oct). Re-fetch for later Oct. Weekly clubs: RazzClub, Fuego, Human, Torax, El Dirty, Mandanga, Common People, Iconiqa. |
| CCCB (fav) | cccb.org/en/calendar | ✅ | Full multi-month dated calendar. Best single source. Note: homepage is /en, calendar is /en/calendar (NOT /en/whats-on → 404). |
| MACBA | macba.cat/en/exhibitions | ✅ | Long-running exhibitions w/ date ranges. Good spanning GAL filler. |
| WCA2026 Architecture | barcelona.cat/capitalmundialarquitectura/en/programme | ⚠️ | 1310 activities, lazy-loaded/paginated. First page ≈ 20–24 Sep only. **October routes need pagination/browser automation** (known issue, see docs/architecture.md). |
| Arts Santa Mònica (fav) | santamonica.cat/en/exposicions-i-activitats | ✅ | WORKS (the .cat site, not gencat.cat). Full dated Oct–Dec program: Social Fest, Tuesdays of Video, Wed sound-and-body, Thu voice-and-word. Great for the thin weeks. |
| Tech Barcelona | techbarcelona.com/en/events | ✅ | Dated ecosystem events. Filter OUT online/webinars/giveaways/grants/abroad/deadlines. In-person BCN talks/meetups fill the TECH gap (Tech Up Nights, Shift AI, FAIR, afterworks). |
| graf.cat (mandatory) | graf.cat/es/agenda | ✅ | Galleries/independent art agenda. “Próximos 30 días” + “en curso” spanning shows (e.g. Museu Tàpies Dora García). Only ~30 days visible; re-fetch later for deeper Oct. |
| WCA2026 CityMakers | barcelona.cat/capitalmundialarquitectura/es/programa?tipus_format=Rutas | ⚠️ | Rutas filter shows 325 results but still lazy-loaded. Got Oct 1–9 routes (CityMakers Summit, Llars Mundet, Can Batlló, Barcelona Valenta). Oct 10–18 routes still need date-filter/browser. |
| Fundació Joan Miró | fmirobcn.org/en/exhibitions/ | 🟨 | Extraction failed. Try browser automation next round. |
| Arts Santa Mònica (fav) | artssantamonica.gencat.cat | 🟨 | Extraction failed on /en and /en/activitats. Try browser automation. |
| Moog | moogbarcelona.com/en | 🟨 | Only club-hours boilerplate; agenda is JS. |
| Resident Advisor | ra.co/events/es/barcelona | ⛔ | HTTP 403 on every path incl. individual `/events/<id>` (re-confirmed 2026-09-24). Best club/electronic/queer source — **needs another route** (browser, or xceed/clubbingspain). |
| DICE | dice.fm/event/<slug> | ✅ | Individual event pages carry schema.org `MusicEvent` JSON-LD (exact startDate/endDate, venue address, price). Reliable for club nights (e.g. La Terrrazza). |
| Luma | luma.com/<code> | ✅ | Event pages are fetchable (date, time, venue, price, description). Good for social/party/meetup events (e.g. Sky Sinner). |
| Instagram post | instagram.com/p/<id> | ⛔ | Cookie/login wall — `fetch_webpage` returns only the cookie consent page, no post text. User must paste caption/date/venue. |
| Time Out BCN | timeout.com/barcelona | ⚠️ | Generic listicles, no reliable per-date events. |
| barcelona.cat/en/whats-on | — | 404 | Wrong path. |
| LAUT (small electronic club, Poble-sec) | laut.es | ✅ | Homepage lists weekend lineups by date; no times/prices (those sit on RA, 403). `/agenda` is 404. |
| Heliogàbal (small-room shows, Gràcia) | heliogabal.com | ✅ | Dated concerts with times + advance/door prices. |
| beteve.cat festa-major pages | beteve.cat/agenda/festa-major-<barri>-programa/ | ✅ | Best NEIGH source: exact dates + per-day programme (pregó, correfoc, concerts, DJ nights). Also /agenda/festes-majors-barcelona-barris/ for the city map. |
| eventosfrikis.com | eventosfrikis.com/barcelona/ | ✅ | GAME: conventions by date with detail pages (venue, hours, price). |
| retroplayingbcn.es | retroplayingbcn.es | ✅ | Retro-gaming news/events (Retromaniacs). |
| La Pedrera | lapedrera.com/en/exhibitions/<slug>/ | ✅ | Exhibition pages give dates, hours, price. Listing page is less reliable. |
| nitbcn.com | nitbcn.com/en/<venue-slug> | ⚠️ | Aggregator; venue pages fetchable but incomplete (missed La Paloma's Fri/Sat club nights). |
| Barcelona Ajuntament press | ajuntament.barcelona.cat/premsa/... | ✅ | Fallback for WCA2026 programme items (e.g. Aparadors d'Arquitectura) while barcelona.cat/capitalmundialarquitectura is 418. |
| WCA2026 programme (en + es Rutas) | barcelona.cat/capitalmundialarquitectura/... | ⛔ | **HTTP 418** on every path on 2026-10-02 (was ⚠️ lazy-loaded before). Also 418: barcelona.cat/lavirreina. 403: barcelona.cat/fabraicoats. Likely bot-blocking; retry later or browser. |
| Hangar | hangar.org/en|ca/agenda/ | ⛔ | HTTP 403 (2026-10-02). |
| DICE venue pages | dice.fm/venue/<slug> | ⛔ | 403. Individual `dice.fm/event/<slug>` pages still ✅ (see Round 3). |
| Entradium (Fluid's Weird Glam) | entradium.com/en/organizers/weid-glam | ⛔ | HTTP 418 (2026-10-02). |
| Meetup (Jam!! Analog Jam Sessions) | meetup.com/es-es/jam-analog-jam-sessions-barcelona/events/ | ⚠️ | Fetchable but 0 upcoming events listed. |
| Luma city page | luma.com/barcelona | ⚠️ | Lists titles without dates — useless for a date window; individual event pages still ✅. |
| xceed.me | xceed.me/es/barcelona/events | 🟨 | JS-only; only surfaces via search snippets (e.g. ULTRAVIOLETA @ La Nau 02 Oct) — not verifiable. |
| La Bonne (fav) | labonne.org/activitats/ | ✅ | Official activities page with dated cultural programming and an archive. Include all available week events. |
| Qlist Barcelona | qlist.app/cities/Spain/Barcelona/88 | ✅ | Dated Barcelona queer-event feed plus LGBTQ+ venue listings; use “Load more” and verify event details against primary sources. |
| Halo LGBT Barcelona | halolgbt.com/es/barcelona | ✅ | City-specific queer events listing; dated listings include venue, times, and prices. |

### Favorite venues still UN-sourced (from brief)
- **Fluid** — IG `@fluidbcn`; site `fluidbcn.com` (no /agenda — 404) + linktr.ee/fluidbcn. Queer natural-wine bar, C/ Salvà 21, Poble Sec. Open Wed–Thu 20:00–01:00, Fri–Sat 20:00–03:00, Sun 18:30–00:00. Special parties (e.g. "Weird Glam") ticket via Entradium organizer `weid-glam` — but checked 2026-09-21: "Ahora mismo no hay eventos abiertos" (none open). Announce on IG only.
- **Candy Darling** — IG `@candydarlingbar`; queer bar, Gran Via 586 (nr. Universitat), open daily. Nightly drag/burlesque/live music/poetry/talks. Email candydarlingbcn@gmail.com. No dedicated events site found.
- **Ssuave** — IG `@ssuave3000` (confirmed by user); reggaeton/hip-hop/dembow/baile-funk party (roving venues).
- ~~Arts Santa Mònica~~ — SOLVED: use santamonica.cat/en (the gencat.cat mirror is the JS-only one).
> Handles now known, but NONE expose a machine-readable agenda: Fluid's Entradium has no open events; Candy Darling & Ssuave are IG-only. `fetch_webpage` can't read Instagram. To add their events, user must paste dates/flyers, or re-check Fluid's Entradium (`weid-glam`) later for open ticketed parties.
> Round 4 (2026-10-02): still nothing fetchable for Fluid (Entradium 418), Candy Darling or Ssuave (web search finds only venue reviews). Note the Round 3 JSON records an event *at* Ssuave (Tidur Lambak, 09 Oct) — it may be a fixed space, not only a roving party; confirm with user.

---

## Category coverage (this window)

| Cat | Coverage | Notes / gaps |
| --- | --- | --- |
| IND | thin | Ateneu Llibertari (SUTRAS), La Cinètika cinema, Apolo emerging showcases. Mine convoca.la + Hangar/La Escocesa/Fabra i Coats next. |
| GAL | good | MACBA (5), CCCB (Cult of Beauty). Add Tàpies/Miró/Virreina next round. |
| QUEER | ok | Lizz Chismoteka, Milkshake, CCCB "Queer mythologies" tour. Nalgas Club (Apolo) needs a date. |
| MUS | strong | Razzmatazz + Apolo + La Mercè + CCCB Tresor. Well covered. |
| MUSPROD | **none** | No modular-synth/gear/production meetups found. Needs targeted sources (synth shops, Meetup, ESMUC). |
| GAME | thin | OH! Comics Fest (02–04 Oct, user-supplied). Still need anime/gaming/nerd sources: Norma Còmics, conventions, gaming bars. |
| ARCH | good | WCA2026 program (routes, talks, Sant Pau/Mies open days) + Barcelona 2035 exhibition. October routes still to paginate. |
| FASH | very thin | Only CCCB "Dressing the Body" DHub guided tour (Amics-only). Add 080 Barcelona Fashion / DHub exhibitions. |
| TECH | ok | Round 2 (techbarcelona.com): Petit Comitech, FAIR, Tech Barcelona afterworks, Tech Up Nights Vol.21, Shift AI Europe, Growing Without Losing Your Roots. Gap closed. |
| NEIGH | good | La Mercè 2026 (city festa major, 23–27 Sep). |
| CHIC | ok | CCCB Biennial of Thought (13–18 Oct), Cult of Beauty, Sant Pau open day. |

### Round 4 coverage — Fri 02 → Sun 04 Oct (37 new; favourite venues 14 of them)
MUS 15 (Apolo 6, Razz 6, LAUT 2, Heliogàbal 1) · QUEER 3 (Churros con Chocolate/Drag Factor, Paris Is Burning @ La Cinètika, Bananas @ Safari) · IND 4 (E:\ART open studios, Homesession workshop, Konvent @ Antic Teatre, GUIXOFRÉNIA @ Ateneu Gràcia) · GAL 4 (Kiefer @ La Pedrera opens 02 Oct, MACBA Kitchen School, BETA Contemporary talk, Brossa visit + Vampir-Cuadecuc) · GAME 4 (Retromaniacs, NECROCON, VilaFrik, NIT8BIT chiptune) · NEIGH 4 (Les Corts, Sarrià, Barceloneta, Congrés) · ARCH 2 (CCCB Sert seminar, Aparadors d'Arquitectura) · MUSPROD 1 (free live-sound workshop — first ever MUSPROD hit, marginal) · TECH 0 (Tech Barcelona has nothing Fri–Sun) · FASH 0 (080 is 20–23 Oct) · CHIC 0.

---

## Events already retrieved (dedupe list — don't re-add)
See `research/researched-events.json` for full records. Titles+dates:
- La Mercè 2026 (09-23→27); Kiw & Mourad Belouadi (09-23); María Terremoto (09-24)
- Apolo: Bresh XL (09-23); Milkshake Karamelo Club (09-24); Citric Collective (09-25); Shrek Rave (09-26); Apologia x Polyglot (09-26); María Escarmiento (10-09)
- Razzmatazz: El Dirty Verano Sin Fin (09-23); Mandanga Adiós Verano (09-24); Lizz Chismoteka (09-25); BMT Mala (09-26); Nørbak+Sandrien+Sylvia (09-26); Thunder Valley Rebels (09-26); Mandanga Pika Pika (10-01); Mount Kimbie DJ (10-02); 2Spicy Club (10-02); Oney1 (10-02); Prestige Pak (10-03); Function 30 (10-03); Blood Red Shoes (10-03); Vampirina Club (10-09); Rivvaa (10-10)
- CCCB: Cult of Beauty (to 11-08); Édouard Louis & Zadie Smith (09-21); Adania Shibli (09-26); Queer mythologies tour (09-30); Sert dialogues (10-01); Dressing the Body tour (10-01); Eric Mumford Sert (10-02); Tresor club culture (10-02); Remedios Zafra (10-05); Biennial of Thought (10-13→18); European Prize Urban Public Space (to 10-15)
- MACBA: Like a Dance of Starlings; Anna Moreno; Basel Abbas & Abou-Rahme; Counter-Information; A Museum Outside the Museum
- WCA2026: Barcelona 2035 exhibition; Modern Architectures 20th-c Spain; Architecture of MACBA tour (09-22, 10-06); Sant Pau open day (09-24); Tous & Fargas lecture (09-22); Archikubik (09-22); Mies Pavilion open day (10-04)
- convoca.la: SUTRAS exhibition (to 09-24); Cinema dilluns @ La Cinètika (09-21)
- OH! Comics Fest Barcelona 2026 @ Fabra i Coats (10-02→04) [GAME, user-supplied]

**Round 2 (Sep 28–Oct 18 fill):**
- Arts Santa Mònica: Marc Vilajuana concert (09-29); FLUX SUMMA (09-29); Devour Me (09-30); Solaria (10-06); Mesurem la vida (10-06); Embodied Physis (10-07); Poesia de mars i oceans (10-08); Reinventing Care Technologies (10-13); estómago que digiere (10-13); Tea Ceremony (10-14); /ˈrej.nə/ (10-15)
- Razzmatazz: El Dirty Troglodita (09-30); The Riven (10-04)
- Tech Barcelona: Petit Comitech (09-30); FAIR Conference (10-01); Pier 01 Afterwork (10-01); Tech Up Nights Vol.21 (10-08); Shift AI Europe (10-13); Growing Without Losing Your Roots (10-14)
- WCA CityMakers routes: Gaudí (10-01); Eixample de Cerdà (10-01); Vila de Gràcia (10-02); 22@ Poblenou (10-02); Llars Mundet (10-03); Can Batlló spanning (10-02→09); Barcelona Valenta Verde (10-09)
- Museu Tàpies: Proyecto Extramuros Dora García (07-04→12-13, spanning) [via graf.cat]

**Round 3 (2026-09-24, user URL batch — ids 187–197):**
- La Mercè / BAM: Queer Falafel & MadMonKey (09-25, La Rambla del Raval); Uzi Freyja (09-25, La Rambla del Raval); Cristina Len (09-26, Antiga Fàbrica Estrella Damm); La Valentina (09-26, Moll de la Fusta); Sandra Monfort (09-26, Plaça de Catalunya)
- La Mercè / other: Open-air Cinema 'La amiga de mi amiga' (09-24, Filmoteca) [QUEER]; Guided tour MACBA from the sky (09-24) [ARCH]; La Mercè Procession + Rolling Lantern Show (09-24, Pl. Catalunya) [NEIGH]; Drone display 'El fil vermell' BCN–Shanghai (09-24, Barceloneta) [CHIC]
- Clubs/parties: NEO Open Air Takeover @ La Terrrazza (09-24, via dice.fm); Tall People Night @ Sky Sinner (10-02, via luma.com)
- **Could NOT fetch (blocked):** ra.co/events/2513739, ra.co/events/2499616 (403); instagram.com/p/DdmKy7HDgNe, instagram.com/p/DdmAFmiM2yX (login wall). Awaiting user-pasted details.

**Round 3b (2026-09-24, user-pasted details for blocked URLs — ids 198–200):**
- La Paloma pres. Moltes Mercès: Me Siento Extraña x Planet Venus (09-25, La Paloma, Calle Tigre 27 Raval) [MUS/electronic] — was ra.co/events/2499616 (RA 403, user pasted).
- La Mercè Festa a la Platja del Fòrum pres. Hassler aka Coyu [FREE] (09-24, Sunseabar Beach Club, Platja del Fòrum) [MUS/electronic] — was ra.co/events/2513739 (RA 403, user pasted).
- Latineo end-of-summer @ La Caseta de Garraf (09-26, 16:00–22:00) [MUS/latin] — was instagram.com/p/DdmAFmiM2yX (login wall, user pasted). Lineup: Verushka Sirit, Acid Nena, Albert Santana, Lil Fe Miranda + closing salsa set.
- **Still pending:** instagram.com/p/DdmKy7HDgNe (login wall). New venues to remember: La Paloma (Calle Tigre 27, Raval — RA club/207515), Sunseabar Beach Club (Platja del Fòrum — RA club/289040), La Caseta de Garraf (beach chiringuito, Garraf).

**Round 4 (2026-10-02, Fri 02 → Sun 04 Oct; ids assigned on insert — see `insert-weekend.mjs` output):**
- Apolo: Sara Hebe (10-02, La [2]); Nitsa: Pegassi + Pau Grima (10-02); Astin: Ignez + Shed live + DJ Fra (10-02); Apologia x Celosia (10-03, La Cinc, free); Astin: SOUNDIT Club — Kyle Hall + Steven Julien + Pau Roca (10-03); Nitsa: Anetha + Drazzit (10-03); Churros con Chocolate: Drag Factor with Arrietty (10-04) [QUEER]
- Razzmatazz: La Cangri (10-02); AUX1 3rd Anniversary (10-02); Hxllywxxd666 + Downites + DJ2D2 (10-02); Selectors x Disturbia: Decka + Mystral (10-03); Ramsexxx + Buffalo Negra (10-03); Naguiyami + D'Riddim (10-03)
- CCCB: Seminar Josep Lluís Sert (10-02 10:00) [ARCH]
- MACBA: The Kitchen School with IDRA & Francesc Ruiz (10-02)
- La Pedrera: The Secret Life of Plants — Anselm Kiefer (10-02 → 2027-01-24, €16)
- graf.cat: Tallers Oberts @ E:\ART (10-02); Homesession × Albert Gironès @ Biblioteca Montserrat Abelló (10-02); Zac Craig artist talk @ BETA Contemporary (10-03); Brossa guided visit + Vampir-Cuadecuc screening (10-03, €5); Konvent 11th ed. @ Antic Teatre — Erik Forsberg Subterrània (10-01 → 10-04)
- convoca.la: GUIXOFRÉNIA exhibition @ Ateneu Llibertari de Gràcia (10-01 → 10-23); Cinema divendres: Paris Is Burning @ La Cinètika (10-02) [QUEER]; NIT8BIT chiptune @ Roots Audiophile Cafe (10-02) [GAME]; Taller bàsic de sonorització @ Casal el Noi Baliarda (10-02, free) [MUSPROD]
- Heliogàbal: Azulceleste + M Train (10-02). LAUT: BOOTLEG Delta Funktionen + Radial (10-02); Samira + Spacer (10-03)
- Bananas @ Safari Disco Club (10-02) [QUEER]
- GAME: Retromaniacs Arcandreu 2026 @ Espai Josep Bota, Fabra i Coats (10-03 → 10-04, free); NECROCON 2026 @ CC Sant Josep, L'Hospitalet (10-02 → 10-04, free); Festival VilaFrik @ Cúbic, Viladecans (10-02 → 10-04)
- NEIGH: Festa Major de les Corts (10-02 → 10-12); Festa Major de Sarrià (10-02 → 10-12); Festa Major de la Barceloneta (09-25 → 10-05, real start kept); Festa Major del Congrés (10-03 → 10-11)
- ARCH: Aparadors d'Arquitectura (10-03 → 10-10, ~100 shop windows)
- **Already in DB, not re-added:** Eric Mumford, Tresor (CCCB); Mount Kimbie, 2Spicy, Oney1, Prestige Pak, Function 30, Blood Red Shoes, The Riven (Razz); OH! Comics Fest; Mies Pavilion open day; CityMakers routes; Llars Mundet tour.

## Checked but SKIPPED as uninteresting (ignore in future rounds)
Reason in brackets. Mostly big-room/mainstream per user's "skip" bias.
- Razzmatazz: Haken/Ihlo (prog metal); Xandria (symph metal); Transvision Vamp (mainstream); Only The Poets (pop-rock); Fat Freddy's Drop (sold-out, big); The Damned (legacy punk, big); Luke Winslow-King (roots); Enzocerobulto; Valeria Lynch (mainstream); La K'onga (cuarteto); Shé (mainstream); Íñigo Quintero (mainstream pop); La Kermesse Redonda; Hillbilly Moon Explosion (rockabilly); The Riven; Sr Blanco (canceled); Avern+Ósserp (canceled)
- Apolo: Luis R Conriquez (regional Mexican, mainstream); Luca Bizzarri (Italian comedy)
- Apolo (R4): Please U2 (tribute act); Los Yakis (viral mainstream, €35–90); Tabanka Djaz (cancelled)
- Razzmatazz (R4): Sr Blanco (cancelled); Kermesse Redonda / Shé / Íñigo Quintero already on this list
- Input High Fidelity Dance Club (R4): SHDW (10-02), Joyhauser (10-03) — big-room techno
- CCCB (R4): Family workshop Macarena Recuerda; Xcèntric "Everything that Dances" (kids)
- graf.cat (R4): art.santcugat, M|A|C Mataró, Bòlit Girona, La Panera Lleida items — outside Barcelona
- convoca.la (R4): vegan lunches/dinners, bike self-repair workshop (not cultural)
- **Found but NOT verifiable, left out (R4):** La Paloma "meets Toy Tonics" (Stump Valley, ALOT, Sam Ruffillo, Gee Lane — 10-02, only via search snippet/RA 403; Hot Chip DJ set "03 Oct" turned out to be 2025); Glove Party w/ Zonzo (10-03); ULTRAVIOLETA @ La Nau (10-02 21:00, xceed JS-only). Re-check via dice.fm/event/<slug> if a slug turns up.
- convoca.la: housing assemblies, vegan lunches, language classes, circus classes, data-center protest (not cultural events)
- CCCB: Institut d'Humanitats lecture series (El segle XVIII, Emily Dickinson, Foucault, etc. — recurring academic courses); family/kids Xcèntric cinema; Amics-only members events (except noted)

## Out-of-window but noted for later
- CCCB: Serielizados Fest (TV series, 21–25 Oct); Bivac 2026 (29 Oct); World Press Photo (6 Nov–13 Dec); The Atomic Age (from 26 Nov); Josep Lluís Sert season
- MACBA: Aurèlia Muñoz. Beings (opens 5 Nov)
- Swab Barcelona 2026 art fair: 8–10 Oct, Palau Victòria Eugènia (swab.barcelona) [GAL/CHIC — week of 10-05]
- PopAir Barcelona (queer party) 9 Oct; Barcelona Queer Market, Eixample 10 Oct [QUEER — week of 10-05]
- 080 Barcelona Fashion, 38th ed.: 20–23 Oct, Marina Vela–Port Vell; PLEC festival 21–22 Oct; free Open Area [FASH — week of 10-19]
- 48h Open House Barcelona: 24–25 Oct [ARCH]
- Befaco DIY eurorack workshop @ Hangar: 15 Nov (befaco.org/barcelona-workshop) [MUSPROD]
- Festes majors still running into next week: Les Corts & Sarrià (to 12 Oct), Congrés (to 11 Oct) — already inserted as spanning events

## TODO next round
0. **Run the pending insert**: `cd /Users/sania/Dev/bootsing && node --env-file=.env.local <scratchpad>/insert-weekend.mjs` (reads `new-events.json` next to it; appends with name+start dedupe). Then paste the printed ids into the Round 4 block above.
1. Paginate Apolo October + Razzmatazz mid-Oct (both only expose ~current+2 weeks); re-run for 10-05..10-18.
2. Paginate WCA2026 program for Oct 10–18 routes (date filter / browser automation likely needed).
3. Browser-automate Miró and RA (403) for GAL/electronic/queer. (Santa Mònica now solved via santamonica.cat.)
4. Remaining gaps: MUSPROD (0) and GAME (1). Need synth shops / Meetup / comics shops / conventions.
5. Find Fluid / Candy Darling / Ssuave (Instagram) — ask user for handles/links.
6. Later Oct weeks (10-05..10-18) lean on Santa Mònica + spanning exhibitions + Biennial of Thought; re-mine Apolo/Razz when their agendas extend.
7. Next week (10-05..10-11): Swab (8–10 Oct), PopAir (9 Oct), Queer Market (10 Oct), Tech Up Nights (8 Oct, in DB), Santa Mònica Tue/Wed/Thu series (in DB). LAUT + Heliogàbal + beteve festa pages are now cheap weekly checks.
8. barcelona.cat is bot-blocking (418/403) as of 2026-10-02 — WCA2026 routes, La Virreina, Fabra i Coats need a retry or browser automation.
9. Settle the La Paloma question: find a fetchable source (dice.fm/event slugs or lapaloma-bcn site) — it had 2 unverified weekend nights this round.
