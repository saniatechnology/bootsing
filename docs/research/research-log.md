# Research log — Bootsing event research

Persistent, cross-round notes so future research passes don't repeat work.
Keep it concise but human-readable. Update after every research round.

- **Last round:** 2026-09-21 (by Copilot / Opus 4.8, via `fetch_webpage`)
- **Round 2:** 2026-09-21 — deep-dive on Sep 28–Oct 18 to populate the later weeks (added 27 events; TECH gap closed, Santa Mònica now fetchable).
- **Round 3:** 2026-09-24 — user-supplied URL batch (La Mercè + club/party links). Added 11 events (ids 187–197). New fetchable sources: dice.fm (JSON-LD), luma.com. RA + Instagram still unreadable.
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

### Favorite venues still UN-sourced (from brief)
- **Fluid** — IG `@fluidbcn`; site `fluidbcn.com` (no /agenda — 404) + linktr.ee/fluidbcn. Queer natural-wine bar, C/ Salvà 21, Poble Sec. Open Wed–Thu 20:00–01:00, Fri–Sat 20:00–03:00, Sun 18:30–00:00. Special parties (e.g. "Weird Glam") ticket via Entradium organizer `weid-glam` — but checked 2026-09-21: "Ahora mismo no hay eventos abiertos" (none open). Announce on IG only.
- **Candy Darling** — IG `@candydarlingbar`; queer bar, Gran Via 586 (nr. Universitat), open daily. Nightly drag/burlesque/live music/poetry/talks. Email candydarlingbcn@gmail.com. No dedicated events site found.
- **Ssuave** — IG `@ssuave3000` (confirmed by user); reggaeton/hip-hop/dembow/baile-funk party (roving venues).
- ~~Arts Santa Mònica~~ — SOLVED: use santamonica.cat/en (the gencat.cat mirror is the JS-only one).
> Handles now known, but NONE expose a machine-readable agenda: Fluid's Entradium has no open events; Candy Darling & Ssuave are IG-only. `fetch_webpage` can't read Instagram. To add their events, user must paste dates/flyers, or re-check Fluid's Entradium (`weid-glam`) later for open ticketed parties.

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

## Checked but SKIPPED as uninteresting (ignore in future rounds)
Reason in brackets. Mostly big-room/mainstream per user's "skip" bias.
- Razzmatazz: Haken/Ihlo (prog metal); Xandria (symph metal); Transvision Vamp (mainstream); Only The Poets (pop-rock); Fat Freddy's Drop (sold-out, big); The Damned (legacy punk, big); Luke Winslow-King (roots); Enzocerobulto; Valeria Lynch (mainstream); La K'onga (cuarteto); Shé (mainstream); Íñigo Quintero (mainstream pop); La Kermesse Redonda; Hillbilly Moon Explosion (rockabilly); The Riven; Sr Blanco (canceled); Avern+Ósserp (canceled)
- Apolo: Luis R Conriquez (regional Mexican, mainstream); Luca Bizzarri (Italian comedy)
- convoca.la: housing assemblies, vegan lunches, language classes, circus classes, data-center protest (not cultural events)
- CCCB: Institut d'Humanitats lecture series (El segle XVIII, Emily Dickinson, Foucault, etc. — recurring academic courses); family/kids Xcèntric cinema; Amics-only members events (except noted)

## Out-of-window but noted for later
- CCCB: Serielizados Fest (TV series, 21–25 Oct); Bivac 2026 (29 Oct); World Press Photo (6 Nov–13 Dec); The Atomic Age (from 26 Nov); Josep Lluís Sert season
- MACBA: Aurèlia Muñoz. Beings (opens 5 Nov)

## TODO next round
1. Paginate Apolo October + Razzmatazz mid-Oct (both only expose ~current+2 weeks); re-run for 10-05..10-18.
2. Paginate WCA2026 program for Oct 10–18 routes (date filter / browser automation likely needed).
3. Browser-automate Miró and RA (403) for GAL/electronic/queer. (Santa Mònica now solved via santamonica.cat.)
4. Remaining gaps: MUSPROD (0) and GAME (1). Need synth shops / Meetup / comics shops / conventions.
5. Find Fluid / Candy Darling / Ssuave (Instagram) — ask user for handles/links.
6. Later Oct weeks (10-05..10-18) lean on Santa Mònica + spanning exhibitions + Biennial of Thought; re-mine Apolo/Razz when their agendas extend.
