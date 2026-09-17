import datetime as dt
import html

D = dt.date

WEEKS = [
    (D(2026,8,28), D(2026,8,30)),   # partial: Fri-Sun
    (D(2026,8,31), D(2026,9,6)),
    (D(2026,9,7),  D(2026,9,13)),
    (D(2026,9,14), D(2026,9,20)),
    (D(2026,9,21), D(2026,9,27)),
]

CATS = {
    "IND":    ("Independent art spaces",        "#6B8F71"),
    "GAL":    ("Contemporary art & galleries",  "#7B5EA7"),
    "QUEER":  ("Queer events",                  "#C64E8C"),
    "MUS":    ("Music",                         "#D9704B"),
    "MUSPROD":("Music production",              "#B98B2E"),
    "GAME":   ("Games / anime / nerd culture",  "#3E8FB0"),
    "ARCH":   ("World Capital of Architecture 2026", "#2A4B7C"),
    "FASH":   ("Fashion",                       "#A8617A"),
    "TECH":   ("Tech & software",               "#48808A"),
    "NEIGH":  ("Neighborhood festivals",        "#5B8C3E"),
    "CHIC":   ("Chic / standout",                "#6E2C3A"),
    "BONUS":  ("Also on (bonus filler)",        "#7A7A7A"),
}

# event: name, venue, cat, start, end, cost, desc, link, flags(list), approx(bool)
E = []
def ev(name, venue, cat, start, end, cost, desc, link, flags=None, approx=False):
    E.append(dict(name=name, venue=venue, cat=cat, start=start, end=end, cost=cost,
                   desc=desc, link=link, flags=flags or [], approx=approx))

# Music genre tags, for the dance-relevant filter. Only MUS-category events get a
# genre; everything else is left untagged and ignores the genre filter entirely.
# Matched by substring against the event name (case-sensitive, first match wins).
GENRE_RULES = [
    ("Nitsa", "electronic"),
    ("Astin:", "electronic"),
    ("Sala Upload", "electronic"),
    ("Última Conga", "latin"),
    ("Balkumbia", "latin"),
    ("GIADDA", "latin"),
    ("Bresh Club", "pop"),
    ("Milkshake", "pop"),
    ("Divas by Churros", "pop"),
    ("BAM —", "mixed"),
    ("MASiMAS", "other"),
]
GENRE_LABELS = {
    "latin": "Latin",
    "hiphop": "Hip-Hop",
    "pop": "Pop",
    "electronic": "Electronic / EDM",
    "mixed": "Mixed lineup",
    "other": "Other (rock, indie, etc.)",
}
def genre_for(e):
    if e["cat"] != "MUS":
        return None
    for needle, g in GENRE_RULES:
        if needle in e["name"]:
            return g
    return "other"

# ---------- WEEK 1 items (also may spill later) ----------
ev("Nitsa: Fatima Hajji + NHYMPH","Sala Apolo","MUS",D(2026,8,28),D(2026,8,28),
   "Paid","Electronic club night at Barcelona's flagship late-night room.",
   "https://www.sala-apolo.com/en/schedule")
ev("Marula Café: Juli Giuliani + Yulie","Marula Café (Gaixample)","MUS",D(2026,8,28),D(2026,8,28),
   "Free/low cover","Funk/soul/jazz club night in the small basement club near Plaça Reial.",
   "https://marulacafe.com/agenda/")
ev("Festa Major de Sants (tail end)","Sants neighborhood","NEIGH",D(2026,8,28),D(2026,8,30),
   "Free","Final days of Sants' patron-saint festival — decorated streets, concerts, correfocs.",
   "https://www.elnacional.cat/es/fem-pais/fiestas-sants-2026-fechas-programa-calles-engalanadas-conciertos-actividades_1681195_102.html")
ev("VCT EMEA Stage 2 Finals + Fan Fest","Pabellón Olímpic de Badalona","GAME",D(2026,8,28),D(2026,8,30),
   "Competition ticketed; Fan Fest free",
   "Europe's top Valorant esports final in Greater Barcelona, with a free fan zone alongside the paid match.",
   "https://valorantesports.com/en-GB/news/vct-emea-barcelona-fan-fest", flags=["rare"])
ev("Nitsa: Six Sex live! + Cannelle live! + Genosidra + KMILA","Sala Apolo","MUS",D(2026,8,29),D(2026,8,29),
   "Paid","Electronic/live-act lineup leaning towards emerging names.",
   "https://www.sala-apolo.com/en/schedule")
ev("YASS! Party","Safari Disco Club","QUEER",D(2026,8,29),D(2026,8,29),
   "€16 adv / €18 door","Weekly Saturday gay circuit party — pop/hits room plus house room, 18+.",
   "https://yassparty.com/barcelona/")
ev("Galeria Senda: “Un paseo acuático”","Galeria Senda","GAL",D(2026,8,28),D(2026,8,31),
   "Free","Water-themed painting show by Marcel R. Juliana — final days.",
   "https://www.berlinwalk.art/barcelona-artwalk/blog/barcelona-events-september-2026-week-36", flags=["closing"])

# ---------- WEEK 2 ----------
ev("CineClub 113: “MaQKina” documentary","La (3), Sala Apolo complex","MUSPROD",D(2026,8,31),D(2026,8,31),
   "Paid","Screening on the Spanish/Catalan electronic subculture “maquina.”",
   "https://www.sala-apolo.com/en/schedule")
ev("Steve McCurry: ICONS","Palau Martorell","GAL",D(2026,8,31),D(2026,9,6),
   "From €16","~150 photojournalism images spanning four decades (India, Afghanistan, Japan).",
   "https://www.berlinwalk.art/barcelona-artwalk/blog/barcelona-events-september-2026-week-36",
   flags=["closing"], approx=True)
ev("CCCB Summer Cinema for the Whole Family","CCCB courtyard","GAL",D(2026,9,2),D(2026,9,2),
   "Free/low cost","Outdoor family film screening as CCCB's summer wind-down.",
   "https://www.cccb.org/en/calendar")
ev("CCCB Summer Cinema for the Whole Family","CCCB courtyard","GAL",D(2026,9,5),D(2026,9,5),
   "Free/low cost","Outdoor family film screening as CCCB's summer wind-down.",
   "https://www.cccb.org/en/calendar")
ev("Korean Film Festival Barcelona","Cinemes Girona","BONUS",D(2026,9,2),D(2026,9,6),
   "€7-8/film","Park Chan-wook retrospective plus recent Korean cinema.",
   "https://www.berlinwalk.art/barcelona-artwalk/blog/barcelona-events-september-2026-week-36")
ev("Bresh Club","Sala Apolo","MUS",D(2026,9,2),D(2026,9,2),
   "Paid","Popular Spanish party-brand club night, pop/reggaeton/indie crossover.",
   "https://www.sala-apolo.com/en/schedule")
ev("Divas by Churros con Chocolate presents Madonna","La Cinc, Sala Apolo complex","QUEER",D(2026,9,3),D(2026,9,3),
   "Paid","Tribute/theme night with a queer-friendly crowd.",
   "https://www.sala-apolo.com/en/schedule")
ev("Milkshake","Sala Apolo","MUS",D(2026,9,3),D(2026,9,3),
   "Paid","Indie/pop club night.","https://www.sala-apolo.com/en/schedule")
ev("“You Don't Look Arab” — Queer Falafel","Antic Teatre","QUEER",D(2026,9,3),D(2026,9,6),
   "Paid (indie theatre pricing)",
   "Multilingual performance from a queer-centered collective on identity and cultural representation.",
   "https://www.anticteatre.com/programacio/?lang=en")
ev("Nitsa: Club Romántico x DESTRUCCIÓN","Sala Apolo","MUS",D(2026,9,4),D(2026,9,4),
   "Paid","Electronic night with a strong alt/queer crowd crossover historically.",
   "https://www.sala-apolo.com/en/schedule")
ev("Astin: Kia + Jhort + Memory Palace","La (2), Sala Apolo complex","MUS",D(2026,9,4),D(2026,9,4),
   "Paid","Smaller-room electronic/discovery lineup.","https://www.sala-apolo.com/en/schedule")
ev("Balkumbia concert + Pablo Sánchez / Yulie","Marula Café","MUS",D(2026,9,4),D(2026,9,4),
   "Free/low cover","Balkan-fusion live set at the small Gaixample club.","https://marulacafe.com/agenda/")
ev("Aria Vega","Razzmatazz 2","MUS",D(2026,9,5),D(2026,9,5),
   "Paid","Mid-size concert.","https://www.salarazzmatazz.com/en/agenda/")
ev("“La Última Conga” + Jim Sharp (UK)","Marula Café","MUS",D(2026,9,5),D(2026,9,5),
   "Free/low cover","Small-club Latin/soul night.","https://marulacafe.com/agenda/")
ev("MASiMAS Festival closing: “Rhythm and Boobs & B4”","Paral·lel 62","MUS",D(2026,9,6),D(2026,9,6),
   "Paid","Closing concert of the six-month, six-venue MASiMAS festival — burlesque/blues/swing.",
   "https://beatburguer.com/festival-masimas-2026-6-meses-6-salas-y-una-programacion-historica/", flags=["finale"])
ev("División Minúscula (concert)","La (2), Sala Apolo complex","MUS",D(2026,9,6),D(2026,9,6),
   "Paid","Early-evening concert slot.","https://www.sala-apolo.com/en/schedule")
ev("CCCB: Mirador CCCB 2026 visit","CCCB rooftop","GAL",D(2026,9,6),D(2026,9,6),
   "Free/low cost","Guided rooftop viewpoint visit (repeats Sep 24).","https://www.cccb.org/en/calendar")
ev("Ouka Leele: Barcelona 1978–1980","RocioSantaCruz Gallery","GAL",D(2026,9,1),D(2026,9,9),
   "Free","Previously undiscovered negatives from the hand-painted-photography pioneer's Movida-era period.",
   "https://www.berlinwalk.art/barcelona-artwalk/blog/barcelona-events-september-2026-week-36",
   flags=["closing"], approx=True)

# ---------- WEEK 3 ----------
ev("The Living Tombstone","Razzmatazz 1","MUS",D(2026,9,7),D(2026,9,7),
   "Paid","Internet-native musician, mid-size room.","https://www.salarazzmatazz.com/en/agenda/")
ev("CCCB: “The city as public space” talk (Daniel Innerarity)","CCCB","GAL",D(2026,9,7),D(2026,9,7),
   "Free/low cost","Philosophy lecture opening CCCB's autumn program.","https://www.cccb.org/en/calendar")
ev("Festa Major del Poblenou","Poblenou","NEIGH",D(2026,9,4),D(2026,9,14),
   "Free","11-day neighborhood festival: giants, correfocs, castellers, Dragon Mile race, Palo Market Fest.",
   "https://www.catacultural.com/festa-major-del-poblenou-del-6-al-15-de-septiembre/")
ev("Festa Major d'Horta","Horta","NEIGH",D(2026,9,4),D(2026,9,13),
   "Free","Opening night, pregó, correfocs, sardanas, indie/jazz/swing/electronic concerts, closing fireworks.",
   "https://beteve.cat/agenda/festa-major-horta-programa/")
ev("Bresh Club","Sala Apolo","MUS",D(2026,9,9),D(2026,9,9),
   "Paid","Recurring pop/reggaeton club night.","https://www.sala-apolo.com/en/schedule")
ev("GIADDA presents “Muñekita” (free concert)","La Cinc, Sala Apolo complex","MUS",D(2026,9,10),D(2026,9,10),
   "Free","Early-evening emerging-artist showcase.","https://www.sala-apolo.com/en/schedule")
ev("Milkshake: La (pre) Diada","Sala Apolo","MUS",D(2026,9,10),D(2026,9,10),
   "Paid","Club night tied to the Catalan National Day lead-up.","https://www.sala-apolo.com/en/schedule")
ev("Media Party Barcelona Hackathon","BIT Habitat, Ca l'Alier, Poblenou","TECH",D(2026,9,9),D(2026,9,9),
   "Separate registration","Developer hackathon alongside the Media Party conference (13:00-20:00).",
   "https://mediaparty.org/2026/08/13/why-join-media-party-barcelona-hackathon/")
ev("CCCB: “Salut” philosophy lecture","CCCB","GAL",D(2026,9,9),D(2026,9,9),
   "Free/low cost","Ongoing autumn lecture series.","https://www.cccb.org/en/calendar")
ev("Nitsa: Sam Paganini + Bak","Sala Apolo","MUS",D(2026,9,11),D(2026,9,11),
   "Paid","Techno-leaning club night.","https://www.sala-apolo.com/en/schedule")
ev("Astin: JakoJako + Barker live! + T.Modet","La (2), Sala Apolo complex","MUS",D(2026,9,11),D(2026,9,11),
   "Paid","Discovery-oriented electronic lineup in the smaller room.","https://www.sala-apolo.com/en/schedule")
ev("Sala Upload: Das Ich + Siva Six","Sala Upload, Poble Espanyol","MUS",D(2026,9,11),D(2026,9,11),
   "Paid","Industrial/EBM double bill.","https://sala-upload.com/en/agenda/")
ev("Sala Wolf: Olivia Wald","Sala Wolf","MUS",D(2026,9,12),D(2026,9,12),
   "Paid","Small-venue concert.","https://wolfbarcelona.com/conciertos/")
ev("Sala Bikini: Plastilina Mosh","Sala Bikini","MUS",D(2026,9,13),D(2026,9,13),
   "Paid","Mexican alt-rock/electronic act, mid-size room.","https://bikinibcn.com/")
ev("“Healthy homes for healthy people” workshop","Centre Cívic Vila Urània","ARCH",D(2026,9,12),D(2026,9,12),
   "Likely free","Workshop under Barcelona World Capital of Architecture 2026's 600-workshop program (exact date approximate).",
   "https://www.barcelona.cat/capitalmundialarquitectura/en/programme", approx=True)

# ---------- WEEK 4 ----------
ev("CCCB: debate “The Science of Aging”","CCCB","GAL",D(2026,9,15),D(2026,9,15),
   "Free/low cost","Debate tied to the “Cult of Beauty” exhibition.","https://www.cccb.org/en/calendar")
ev("FORWARD Summit 2026","Venue TBC","TECH",D(2026,9,15),D(2026,9,15),
   "Paid","Business/tech summit organized by Foment del Treball.","https://www.techbarcelona.com/en/events/")
ev("CCCB: accessible tour of “The Cult of Beauty”","CCCB","GAL",D(2026,9,16),D(2026,9,16),
   "Free/low cost","Tour adapted for blind/partially sighted visitors.","https://www.cccb.org/en/calendar")
ev("Santa Mònica: guided visit (Enric Puig Punyet)","Arts Santa Mònica","GAL",D(2026,9,16),D(2026,9,16),
   "Free/low cost","Guided tour of “The Assault of Illusion” (repeats Sep 26).",
   "https://www.santamonica.cat/en/exposicions-i-activitats")
ev("European Blockchain Convention","Barcelona (venue TBC)","TECH",D(2026,9,16),D(2026,9,17),
   "Paid","~6,000-attendee blockchain/crypto industry conference.","https://eblockchainconvention.com/")
ev("Architecture Studio Sessions: h3o architects open studio","h3o studio, Carrer Verdi, Gràcia","ARCH",D(2026,9,16),D(2026,9,16),
   "Free (registration)","One of 10 Barcelona firms opening its studio this year — guided tour, talk, DJ set.",
   "https://tectonica.archi/articles/barcelona-capital-mundial-de-la-arquitectura-2026-estudios-abiertos/", flags=["rare"])
ev("Barcelona Gallery Weekend 2026","~30-35 galleries city-wide + L'Hospitalet","GAL",D(2026,9,17),D(2026,9,20),
   "Free","Barcelona's biggest coordinated gallery event: simultaneous openings, guided routes, talks, studio visits.",
   "https://www.barcelonagalleryweekend.com/calendar.php?lang=esp", flags=["rare"])
ev("ADN Galeria opening: Polanco, Pallé, Merino","ADN Galeria","GAL",D(2026,9,17),D(2026,9,17),
   "Free","Confirmed group-show vernissage as part of Gallery Weekend.",
   "https://www.coolturemag.com/barcelona-gallery-weekend-2026/")
ev("Santa Mònica: “Interpretations of the Exhibition” w/ Françoise Vergès","Arts Santa Mònica","GAL",D(2026,9,17),D(2026,9,17),
   "Free/low cost","Talk tied to the main exhibition.","https://www.santamonica.cat/en/exposicions-i-activitats")
ev("AI Tinkerers Barcelona — Demo Night","OneCoWork Catedral","TECH",D(2026,9,17),D(2026,9,17),
   "Free/low cost","Community demo night for AI builders.","https://www.techbarcelona.com/en/events/")
ev("Tech Spirit Women 2026","Venue TBC","TECH",D(2026,9,17),D(2026,9,17),
   "Paid","Conference spotlighting women in tech.","https://www.techbarcelona.com/en/events/")
ev("CCCB: reading course, Leviathan (Hobbes)","CCCB","GAL",D(2026,9,17),D(2026,9,17),
   "Free/low cost","Ongoing philosophy reading group.","https://www.cccb.org/en/calendar")
ev("Santa Mònica: “Building Sound” — luthier talks + workshop","Arts Santa Mònica","GAL",D(2026,9,18),D(2026,9,19),
   "Free/low cost","Talks on instrument-making materials plus a hands-on experimental luthier workshop.",
   "https://www.santamonica.cat/en/exposicions-i-activitats")
ev("CCCB: debate “Memory and Emancipation”","CCCB","GAL",D(2026,9,18),D(2026,9,18),
   "Free/low cost","With Edurne Portela & Antonio Monegal.","https://www.cccb.org/en/calendar")
ev("Sala Wolf: Actors","Sala Wolf","MUS",D(2026,9,18),D(2026,9,18),
   "Paid","Small-venue concert.","https://wolfbarcelona.com/conciertos/")
ev("Kitty, Daisy & Lewis","La (2), Sala Apolo complex","MUS",D(2026,9,18),D(2026,9,18),
   "Paid","Rockabilly/swing act, mid-size room.","https://www.sala-apolo.com/en/schedule")
ev("Hangar Obert 2026","Hangar","IND",D(2026,9,19),D(2026,9,20),
   "Likely free","Hangar's flagship annual open-studios weekend: resident-artist talks, screenings, performances, closing DJ set.",
   "https://hangar.org/en/agenda-hangar/hangar-obert-2026/", flags=["rare"], approx=True)
ev("MACBA: MURMURS X — Marc Vives, “SSSSS”","MACBA","GAL",D(2026,9,19),D(2026,9,19),
   "Included with admission","Live performance as part of MACBA's Year Thirty program.","https://www.macba.cat/en/whats-on/", flags=["rare"])
ev("CCCB: Poetry Slam Barcelona","CCCB","GAL",D(2026,9,20),D(2026,9,20),
   "Free/low cost","“Minstrels of the 21st Century” spoken-word event.","https://www.cccb.org/en/calendar")

# ---------- WEEK 5 ----------
ev("CCCB: seminar “The Democratic Paradox” (Susan Stokes)","CCCB","GAL",D(2026,9,21),D(2026,9,21),
   "Free/low cost","Morning academic seminar.","https://www.cccb.org/en/calendar")
ev("CCCB: debate “On the Right to Beauty” (Édouard Louis & Zadie Smith)","CCCB","GAL",D(2026,9,21),D(2026,9,21),
   "Free/low cost","Notable literary pairing — a standout single talk for the month.","https://www.cccb.org/en/calendar", flags=["rare"])
ev("MACBA: “Architecture of MACBA” guided tour","MACBA","GAL",D(2026,9,22),D(2026,9,22),
   "Included with admission","Tour of Richard Meier's building.","https://www.macba.cat/en/whats-on/")
ev("AI Summit Barcelona 2026 + AI Hackathon","World Trade Center Barcelona","TECH",D(2026,9,22),D(2026,9,23),
   "Paid","Tiered-ticket AI conference plus an associated hackathon, part of “AI Week.”",
   "https://aisummitbarcelona.com/")
ev("La Mercè 2026","City-wide","NEIGH",D(2026,9,23),D(2026,9,27),
   "Free (capacity-limited)","Barcelona's biggest annual festival: correfocs, castellers, giants, Piromusical fireworks finale.",
   "https://www.barcelona.cat/lamerce/en", flags=["finale"])
ev("BAM — Barcelona Acció Musical","~10 stages city-wide","MUS",D(2026,9,23),D(2026,9,27),
   "Free","La Mercè's dedicated music program — 39 free concerts incl. Bia Ferreira, Nacho Vegas, La Pegatina, Queer Falafel x Mad Monkey.",
   "https://www.barcelona.cat/lamerce/en/bam-barcelona-accio-musical", flags=["finale"])
ev("CCCB: Mirador CCCB visit (repeat)","CCCB rooftop","GAL",D(2026,9,24),D(2026,9,24),
   "Free/low cost","Second rooftop-viewpoint session.","https://www.cccb.org/en/calendar")
ev("MACBA: “La Mercè at MACBA — Year Thirty”","MACBA","GAL",D(2026,9,24),D(2026,9,24),
   "Free/included","Family open day tied to La Mercè.","https://www.macba.cat/en/whats-on/")
ev("Razzmatazz: Only the Poets / Transvision Vamp","Razzmatazz 2/3","MUS",D(2026,9,25),D(2026,9,25),
   "Paid","Mid-size concerts, both rooms same night.","https://www.salarazzmatazz.com/en/agenda/")
ev("AI Takes the Red Carpet: The AI Awards","IEBS Business School","CHIC",D(2026,9,25),D(2026,9,25),
   "Paid/invite-leaning","Awards-night format for the local AI/startup scene.","https://www.techbarcelona.com/en/events/")
ev("Santa Mònica: guided visit (repeat session)","Arts Santa Mònica","GAL",D(2026,9,26),D(2026,9,26),
   "Free/low cost","Second and final scheduled session of this tour.","https://www.santamonica.cat/en/exposicions-i-activitats")
ev("CCCB: talk by Adania Shibli","CCCB","GAL",D(2026,9,26),D(2026,9,26),
   "Free/low cost","“Literature, intimacy and occupation.”","https://www.cccb.org/en/calendar")
ev("Razzmatazz: Fat Freddy's Drop","Razzmatazz 1","MUS",D(2026,9,26),D(2026,9,27),
   "Paid","Two-night run from the New Zealand dub/soul outfit.","https://www.salarazzmatazz.com/en/agenda/")
ev("Arts Santa Mònica: “The Assault of Illusion”","Arts Santa Mònica","GAL",D(2026,9,21),D(2026,9,27),
   "Free/low cost","Main exhibition ends on the last day of this window.",
   "https://www.santamonica.cat/en/exposicions-i-activitats", flags=["closing"])
ev("MACBA: Basel Abbas & Ruanne Abou-Rahme, “Prisoners of Love”","MACBA","GAL",D(2026,9,21),D(2026,9,27),
   "Included with admission","Closes Sep 28 — effectively last-chance within this period.",
   "https://www.macba.cat/en/whats-on/", flags=["closing"])
ev("MACBA: Anna Moreno, “The Third Twist”","MACBA","GAL",D(2026,9,21),D(2026,9,27),
   "Included with admission","Closes Sep 28 — same last-chance timing.",
   "https://www.macba.cat/en/whats-on/", flags=["closing"])

# ---------- WCA2026 GUIDED TOURS (from /programa?tipus_format=Rutas) ----------
ev("Itinerario: Razón, pasión y negocio en la construcción del Eixample","Jardí de la Torre de les Aigües, Eixample","ARCH",
   D(2026,8,30),D(2026,8,30),
   "Paid","MUHBA-led walking tour on Cerdà's Eixample plan and the tensions between urban planning, architecture, and real-estate interests.",
   "https://www.barcelona.cat/capitalmundialarquitectura/es/node/5559", flags=["closing"])
ev("Visita a la Casa Moratiel + exhibition","Casa Moratiel, Esplugues de Llobregat","ARCH",D(2026,9,4),D(2026,9,4),
   "Free (registration)","Guided visit to Josep Maria Sostres's 1957 rationalist house, with the exhibition on its seven lives.",
   "https://www.barcelona.cat/capitalmundialarquitectura/es/programa/visita-la-casa-moratiel-y-exposicion-les-set-vides-de-la-casa-moratiel")
ev("Visita a la Casa Moratiel + exhibition","Casa Moratiel, Esplugues de Llobregat","ARCH",D(2026,9,17),D(2026,9,17),
   "Free (registration)","Guided visit to Josep Maria Sostres's 1957 rationalist house, with the exhibition on its seven lives.",
   "https://www.barcelona.cat/capitalmundialarquitectura/es/programa/visita-la-casa-moratiel-y-exposicion-les-set-vides-de-la-casa-moratiel")
ev("El Palau Major (guided tour)","Palau Reial Major, Ciutat Vella","ARCH",D(2026,9,4),D(2026,9,4),
   "Paid","MUHBA tour of the medieval counts-kings' palace — Saló del Tinell, Capella de Santa Àgata, and the Roman wall walk.",
   "https://www.barcelona.cat/capitalmundialarquitectura/es/programa/el-palau-major", flags=["closing"])
ev("Revisitando los Premios FAD — ruta urbana por el Poblenou","Poblenou","ARCH",D(2026,9,5),D(2026,9,5),
   "Free (registration)","Urban walk revisiting FAD Award-winning projects in Poblenou (Catalan session; repeats Sep 12 in Spanish, Sep 19 in English).",
   "https://www.barcelona.cat/capitalmundialarquitectura/es/programa/revisitando-los-premios-fad-ruta-urbana-por-el-poblenou")
ev("Revisitando los Premios FAD — ruta urbana por el Poblenou (castellano)","Poblenou","ARCH",D(2026,9,12),D(2026,9,12),
   "Free (registration)","Spanish-language repeat of the FAD-award urban walk through Poblenou.",
   "https://www.barcelona.cat/capitalmundialarquitectura/es/programa/revisitando-los-premios-fad-ruta-urbana-por-el-poblenou")
ev("Revisitando los Premios FAD — ruta urbana por el Poblenou (English)","Poblenou","ARCH",D(2026,9,19),D(2026,9,19),
   "Free (registration)","English-language repeat of the FAD-award urban walk through Poblenou.",
   "https://www.barcelona.cat/capitalmundialarquitectura/es/programa/revisitando-los-premios-fad-ruta-urbana-por-el-poblenou")
ev("EAUH 2026 Barcelona — 15 parallel guided city-history walks","Across Ciutat Vella, Sant Andreu, Sant Martí, Poblenou & more","ARCH",
   D(2026,9,5),D(2026,9,5),
   "Mostly free (registration)",
   "European Association for Urban History congress opens to the public with ~15 simultaneous Saturday-morning walks (9:00-13:45): water history at MUHBA's Cases de l'Aigua, the Hospital de Sant Pau archive, Valldaura's monastery-to-architecture-school story, Fabra i Coats' labor history, the Roman forum, and more.",
   "https://www.barcelona.cat/capitalmundialarquitectura/es/programa?tipus_format=Rutas", flags=["rare"])
ev("Visita guiada: Itinerario arqueológico por La Rambla","Starts at Palau de la Virreina, La Rambla","ARCH",D(2026,9,9),D(2026,9,9),
   "Free (registration)","Archaeological walk down La Rambla from Plaça de Catalunya to Port Vell, tied to the ongoing works uncovering the street's history.",
   "https://www.barcelona.cat/capitalmundialarquitectura/es/node/5490")
ev("Visita guiada: Itinerario arqueológico por La Rambla","Starts at Palau de la Virreina, La Rambla","ARCH",D(2026,9,26),D(2026,9,26),
   "Free (registration)","Archaeological walk down La Rambla from Plaça de Catalunya to Port Vell, tied to the ongoing works uncovering the street's history.",
   "https://www.barcelona.cat/capitalmundialarquitectura/es/node/5490")
ev("Arquitectura.coop: Espai Rosselló","Espai Rosselló, Eixample","ARCH",D(2026,9,10),D(2026,9,10),
   "Free (registration)","Guided look at a public-space transformation project in the Eixample.",
   "https://www.barcelona.cat/capitalmundialarquitectura/es/programa/arquitecturacoop-conoce-el-espai-rossello-una-transformacion-del-espacio-publico")
ev("Barcelona Valenta 4: Verde","Cristóbal de Moura → Plaça de les Glòries → Can Batlló","ARCH",D(2026,9,11),D(2026,9,11),
   "Free (registration)","Walking + transit route on Barcelona's green-infrastructure projects: sustainable urban drainage, Glòries park, Superblocks, Can Batlló.",
   "https://www.barcelona.cat/capitalmundialarquitectura/es/programa/barcelona-valenta-4-verde-que-te-quiero-verde-hacia-una-ciudad-mas-sostenible")
ev("Fiestas de Arquitectura: visita guiada al recinto Llars Mundet","Recinte Mundet","ARCH",D(2026,9,12),D(2026,9,12),
   "Free (registration)","Guided visit to the Mundet complex's institutional architecture.",
   "https://www.barcelona.cat/capitalmundialarquitectura/es/node/4343")
ev("Ser un buen campesino","Meets at Museo de Granollers","ARCH",D(2026,9,12),D(2026,9,12),
   "Free (registration)","Route on vernacular rural architecture and farming heritage around the Vallès.",
   "https://www.barcelona.cat/capitalmundialarquitectura/es/node/6512")
ev("Caminata cultural a las masías históricas de Sant Joan Despí","Sant Joan Despí (via Museo de Granollers)","ARCH",D(2026,9,13),D(2026,9,13),
   "Paid","Cultural walk to historic farmhouses (masies) in Sant Joan Despí.",
   "https://www.barcelona.cat/capitalmundialarquitectura/es/programa/caminata-cultural-las-masias-historicas-de-sant-joan-despi")
ev("Domènech i Montaner (guided route)","Eixample","ARCH",D(2026,9,13),D(2026,9,13),
   "Paid","Guided route on Lluís Domènech i Montaner's Eixample buildings.",
   "https://www.barcelona.cat/capitalmundialarquitectura/es/programa/domenech-i-montaner")
ev("Los jardines señoriales de Sarrià","Sarrià-Sant Gervasi","ARCH",D(2026,9,14),D(2026,9,14),
   "Free (registration)","Walk through Sarrià's grand private gardens, part of the district's September WCA2026 spotlight.",
   "https://www.barcelona.cat/capitalmundialarquitectura/es/programa/los-jardines-senoriales-de-sarria")
ev("Can Ricart, veinte años después","Arxiu Històric del Poblenou","ARCH",D(2026,9,15),D(2026,9,15),
   "Free","Panel with an architect, a historian, a neighborhood association and Hangar revisiting the 2005 fight to save Can Ricart, 20 years on.",
   "https://www.barcelona.cat/capitalmundialarquitectura/es/node/5131")
ev("TO: Hogar sostenible","TO Llar sostenible","ARCH",D(2026,9,17),D(2026,9,17),
   "Free (registration)","Session on sustainable housing retrofits.",
   "https://www.barcelona.cat/capitalmundialarquitectura/es/programa/hogar-sostenible")
ev("RehaBCN: Casa/Estudio Fernando Poo","Casa/Estudio Fernando Poo","ARCH",D(2026,9,18),D(2026,9,18),
   "Free (registration)","Retrofit-focused open house at an architect's live/work studio.",
   "https://www.barcelona.cat/capitalmundialarquitectura/es/programa/rehabcn-casaestudio-fernando-poo")
ev("Explora Barcelona a través de sus mercados: Sant Antoni","Mercat de Sant Antoni","ARCH",D(2026,9,19),D(2026,9,19),
   "Free (registration)","Architecture-focused tour of the renovated Sant Antoni market.",
   "https://www.barcelona.cat/capitalmundialarquitectura/es/programa/explora-barcelona-traves-de-sus-mercados-sant-antoni")
ev("Underground Matters: Arquitecturas invisibles — Pasado","Museu d'Història de Barcelona, Plaça del Rei","ARCH",D(2026,9,19),D(2026,9,19),
   "Free (registration)","MUHBA guided walk on the city's hidden/underground infrastructure — the walking-tour companion to MACBA's exhibition of the same name.",
   "https://www.barcelona.cat/capitalmundialarquitectura/es/programa/underground-matters-arquitecturas-invisibles-pasado")
ev("Jane's Walk: Sarrià-Sant Gervasi","Sarrià-Sant Gervasi","ARCH",D(2026,9,19),D(2026,9,19),
   "Free (registration)","Walk-and-debate inspired by urbanist Jane Jacobs, through September's featured district.",
   "https://www.barcelona.cat/capitalmundialarquitectura/es/programa/janes-walk-paseo-debate-inspirado-en-la-mirada-de-jane-jacobs-sarria-sant-gervasi")
ev("La Barcelona de Bonet: visita al Canòdrom","Canòdrom — Ateneu d'innovació, Meridiana","ARCH",D(2026,9,19),D(2026,9,19),
   "Free (registration)","Tour of Antoni Bonet's former greyhound-racing track, now a digital-innovation center.",
   "https://www.barcelona.cat/capitalmundialarquitectura/es/programa/la-barcelona-de-bonet-visita-al-canodromo-meridiana")
ev("El manto verde infinito — Ruta 6","Conca Fluvial del Besòs","ARCH",D(2026,9,20),D(2026,9,20),
   "Free (registration)","Route along the Besòs river basin's green corridor.",
   "https://www.barcelona.cat/capitalmundialarquitectura/es/programa/el-manto-verde-infinito-ruta-6")
ev("Cierra los ojos y escucha Vallvidrera","Sarrià-Sant Gervasi","ARCH",D(2026,9,21),D(2026,9,21),
   "Free (registration)","A listening-focused walk through Vallvidrera.",
   "https://www.barcelona.cat/capitalmundialarquitectura/es/programa/cierra-los-ojos-y-escucha-vallvidrera")
ev("Barcelona Flashback: la vida en la ciudad a través de los objetos","Ciutat Vella","ARCH",D(2026,9,24),D(2026,9,24),
   "Free (registration)","Object-based history walk, with repeat visits at 11:00, 12:00, 13:00, 16:00 and 17:00.",
   "https://www.barcelona.cat/capitalmundialarquitectura/es/programa/barcelona-flashback-la-vida-en-la-ciudad-a-traves-de-los-objetos")
ev("RehaBCN: Casa/Estudio en Ciutat Vella","Casa/Estudio Ferlandina 20, Ciutat Vella","ARCH",D(2026,9,25),D(2026,9,25),
   "Free (registration)","Retrofit-focused open house at a Ciutat Vella live/work studio.",
   "https://www.barcelona.cat/capitalmundialarquitectura/es/node/4701")
ev("De pobres a ricos en el mundo del vino","Meets at Museo de Granollers","ARCH",D(2026,9,26),D(2026,9,26),
   "Free (registration)","Route on the social history of the wine trade.",
   "https://www.barcelona.cat/capitalmundialarquitectura/es/node/6511")

# ---------- LONG / MULTI-WEEK SPANNING ----------
ev("Fundació Antoni Tàpies: “Àngel Jové. De intactu”","Fundació Antoni Tàpies","GAL",D(2026,8,28),D(2026,9,27),
   "€15 (€9 concessions)","Retrospective of Catalan painter Àngel Jové — closes on the very last day of this window.",
   "https://museutapies.org/en/current-exhibitions/", flags=["closing"])
ev("Editorial Gustavo Gili HQ — WCA2026 main hub + Barcelona city model","Carrer del Rosselló 87-89, Eixample","ARCH",
   D(2026,8,28),D(2026,9,27),
   "Free","Barcelona World Capital of Architecture 2026's main visitor hub, with a large-scale interactive city model.",
   "https://www.barcelona.cat/infobarcelona/en/barcelona-world-capital-of-architecture-2026_1377987.html")
ev("Sarrià-Sant Gervasi — WCA2026 September featured district","Vila Urània and district-wide","ARCH",
   D(2026,9,1),D(2026,9,27),
   "Mostly free","Sarrià-Sant Gervasi hosts the World Capital of Architecture 2026 headquarters and programming for the month.",
   "https://ajuntament.barcelona.cat/sarria-santgervasi/es/noticias/el-districte-acollira-la-seu-de-la-capitalitat-mundial-de-larquitectura-durant-el-mes-de-setembre-1590980",
   approx=True)
ev("MACBA: “Underground Matters: Invisible Architectures”","MACBA","GAL",D(2026,9,19),D(2026,9,27),
   "Included with admission","Workshop/tour series on hidden architectural systems (continues to Nov 14).",
   "https://www.macba.cat/en/whats-on/")
ev("Cirque du Soleil: Kurios","Under the Big Top, L'Hospitalet","CHIC",D(2026,9,3),D(2026,9,27),
   "Paid, premium tiers available","Polished touring big-top show (runs to Oct 12) — a dressed-up “chic” pick outside the gallery scene.",
   "https://www.cirquedusoleil.com/spain/barcelona/kurios/buy-tickets")

# --------------------------------------------------------------------------
def clip(e, wk_start, wk_end):
    s = max(e["start"], wk_start)
    en = min(e["end"], wk_end)
    if s > en:
        return None
    return s, en

def fmt_date_range(s, e):
    months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
    if s == e:
        return f"{months[s.month-1]} {s.day}"
    if s.month == e.month:
        return f"{months[s.month-1]} {s.day}–{e.day}"
    return f"{months[s.month-1]} {s.day} – {months[e.month-1]} {e.day}"

FLAG_ICON = {"closing":"\U0001F534","rare":"⭐","finale":"\U0001F389"}
FLAG_LABEL = {"closing":"Last chance","rare":"One-off / rare","finale":"Season finale"}

weeks_html = []
detail_sections = []

for wi,(wk_start,wk_end) in enumerate(WEEKS):
    ndays = (wk_end - wk_start).days + 1
    # items intersecting this week, with full-duration for sort
    items = []
    for e in E:
        c = clip(e, wk_start, wk_end)
        if c:
            full_dur = (e["end"] - e["start"]).days + 1
            items.append((e, c[0], c[1], full_dur))
    # sort: shorter full-duration first, then by clipped start date
    items.sort(key=lambda t: (t[3], t[1]))

    # day headers
    day_names = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]
    headers = []
    d = wk_start
    while d <= wk_end:
        headers.append(d)
        d += dt.timedelta(days=1)

    header_cells = "".join(
        f'<div class="daycell head"><span class="dow">{day_names[h.weekday()]}</span>'
        f'<span class="dnum">{h.day}</span></div>' for h in headers
    )

    rows_html = []
    detail_rows = []
    idx = 0
    for e, cs, ce, full_dur in items:
        idx += 1
        col_start = (cs - wk_start).days + 1
        span = (ce - cs).days + 1
        cat_label, cat_color = CATS[e["cat"]]
        genre = genre_for(e)
        genre_attr = f' data-genre="{genre}"' if genre else ""
        genre_chip = f'<span class="genrechip">{GENRE_LABELS[genre]}</span>' if genre else ""
        flag_icons = "".join(f'<span class="flagchip" title="{FLAG_LABEL[f]}">{FLAG_ICON[f]}</span>' for f in e["flags"])
        approx_mark = ' <span class="approx">approx.</span>' if e["approx"] else ""
        row = (
            f'<div class="ev-row" data-cat="{e["cat"]}"{genre_attr} style="grid-row:{idx+1}; grid-column:{col_start} / span {span};'
            f' --cat: {cat_color};">'
            f'<span class="ev-badge">{idx}</span>'
            f'<span class="ev-name">{html.escape(e["name"])}</span>'
            f'<span class="ev-venue">{html.escape(e["venue"])}</span>'
            f'{flag_icons}{approx_mark}'
            f'</div>'
        )
        rows_html.append(row)

        detail_rows.append(
            f'<tr data-cat="{e["cat"]}"{genre_attr}>'
            f'<td class="dnum-cell">{idx}</td>'
            f'<td><span class="catdot" style="background:{cat_color}"></span>{html.escape(cat_label)}{genre_chip}</td>'
            f'<td class="evn">{html.escape(e["name"])}{approx_mark}</td>'
            f'<td>{html.escape(e["venue"])}</td>'
            f'<td class="mono">{fmt_date_range(e["start"], e["end"])}</td>'
            f'<td>{html.escape(e["cost"])}</td>'
            f'<td>{html.escape(e["desc"])}</td>'
            f'<td><a href="{e["link"]}" target="_blank" rel="noopener">More info ↗</a></td>'
            '</tr>'
        )

    grid_rows_count = idx + 1
    week_label = fmt_date_range(wk_start, wk_end)
    weeks_html.append(f'''
    <section class="week">
      <h2 class="week-title">Week {wi+1} <span class="week-range">{week_label}</span></h2>
      <div class="grid" style="grid-template-columns: repeat({ndays}, 1fr); grid-template-rows: auto repeat({grid_rows_count-1}, auto);">
        {header_cells}
        {"".join(rows_html)}
      </div>
      <div class="detail-wrap">
        <table class="detail-table">
          <thead><tr><th>#</th><th>Category</th><th>Event</th><th>Venue</th><th>Date</th><th>Cost</th><th>Description</th><th></th></tr></thead>
          <tbody>
            {"".join(detail_rows)}
          </tbody>
        </table>
      </div>
    </section>
    ''')

cat_chip_html = "".join(
    f'<button type="button" class="chip cat-chip" data-cat="{key}" aria-pressed="true">'
    f'<span class="catdot" style="background:{color}"></span>{html.escape(label)}</button>'
    for key, (label, color) in CATS.items()
)

# Genre chips: everything on by default except electronic/EDM, per the user's
# "hide EDM, let me switch it on" request.
genre_chip_html = "".join(
    f'<button type="button" class="chip genre-chip{" off" if g == "electronic" else ""}" '
    f'data-genre="{g}" aria-pressed="{"false" if g == "electronic" else "true"}">{html.escape(label)}</button>'
    for g, label in GENRE_LABELS.items()
)

flag_legend_html = "".join(
    f'<div class="legend-item">{icon} {label}</div>' for icon, label in
    [(FLAG_ICON["closing"], FLAG_LABEL["closing"]), (FLAG_ICON["rare"], FLAG_LABEL["rare"]), (FLAG_ICON["finale"], FLAG_LABEL["finale"])]
)

html_out = f'''<title>Barcelona Cultural Calendar</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Public+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
:root {{
  --bg: #EEF1EE;
  --surface: #FFFFFF;
  --surface-2: #F5F7F4;
  --text: #1C2321;
  --text-muted: #5B6560;
  --accent: #146B63;
  --accent-2: #C77D3B;
  --border: #D9DED9;
  --shadow: 0 1px 2px rgba(20,30,25,0.06), 0 4px 14px rgba(20,30,25,0.05);
}}
@media (prefers-color-scheme: dark) {{
  :root:not([data-theme="light"]) {{
    --bg: #101513;
    --surface: #1B2220;
    --surface-2: #202822;
    --text: #E7ECE8;
    --text-muted: #92A199;
    --accent: #4FCFC0;
    --accent-2: #E2A365;
    --border: #2B3330;
    --shadow: 0 1px 2px rgba(0,0,0,0.3), 0 4px 18px rgba(0,0,0,0.35);
  }}
}}
:root[data-theme="dark"] {{
  --bg: #101513;
  --surface: #1B2220;
  --surface-2: #202822;
  --text: #E7ECE8;
  --text-muted: #92A199;
  --accent: #4FCFC0;
  --accent-2: #E2A365;
  --border: #2B3330;
  --shadow: 0 1px 2px rgba(0,0,0,0.3), 0 4px 18px rgba(0,0,0,0.35);
}}

* {{ box-sizing: border-box; }}
body {{
  background: var(--bg);
  color: var(--text);
  font-family: "Public Sans", -apple-system, "Segoe UI", sans-serif;
  margin: 0;
  padding: 0 0 5rem 0;
}}
.wrap {{ max-width: 1400px; margin: 0 auto; padding: 2.5rem 1.5rem 0; }}

header.page {{
  margin-bottom: 2rem;
}}
h1 {{
  font-family: "Fraunces", serif;
  font-weight: 700;
  font-size: clamp(2rem, 4vw, 2.9rem);
  margin: 0 0 0.35rem;
  text-wrap: balance;
  letter-spacing: -0.01em;
}}
.subtitle {{
  color: var(--text-muted);
  font-size: 1.02rem;
  max-width: 68ch;
  line-height: 1.55;
  margin: 0 0 1.4rem;
}}
.legend {{
  display: flex;
  flex-wrap: wrap;
  gap: 0.9rem 1.6rem;
  padding: 1rem 1.2rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  box-shadow: var(--shadow);
  font-size: 0.86rem;
}}
.legend-group {{ display:flex; flex-wrap:wrap; gap: 0.7rem 1.4rem; }}
.legend-item {{ display:flex; align-items:center; gap:0.4rem; color: var(--text-muted); white-space:nowrap; }}
.catdot {{ width:9px; height:9px; border-radius:50%; display:inline-block; flex:none; }}
.legend-divider {{ width:1px; align-self:stretch; background:var(--border); margin: 0 0.2rem; }}

.filters {{
  margin-top: 1rem;
  padding: 1rem 1.2rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  box-shadow: var(--shadow);
  font-size: 0.86rem;
}}
.filter-row {{ display:flex; flex-wrap:wrap; align-items:center; gap: 0.5rem 0.6rem; }}
.filter-row + .filter-row {{ margin-top: 0.7rem; padding-top: 0.7rem; border-top: 1px solid var(--border); }}
.filter-label {{
  font-family: "IBM Plex Mono", monospace;
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  flex: none;
  margin-right: 0.2rem;
}}
.chip {{
  font: inherit;
  font-family: "Public Sans", sans-serif;
  font-size: 0.8rem;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.7rem;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface-2);
  color: var(--text);
  cursor: pointer;
  white-space: nowrap;
  transition: opacity 0.15s ease, background 0.15s ease;
}}
.chip:hover {{ background: var(--border); }}
.chip:focus-visible {{ outline: 2px solid var(--accent); outline-offset: 1px; }}
.chip.off {{ opacity: 0.4; background: transparent; }}
.chip-reset {{
  margin-left: auto;
  background: transparent;
  border-style: dashed;
  color: var(--text-muted);
}}
body.hide-cat-IND [data-cat="IND"],
body.hide-cat-GAL [data-cat="GAL"],
body.hide-cat-QUEER [data-cat="QUEER"],
body.hide-cat-MUS [data-cat="MUS"],
body.hide-cat-MUSPROD [data-cat="MUSPROD"],
body.hide-cat-GAME [data-cat="GAME"],
body.hide-cat-ARCH [data-cat="ARCH"],
body.hide-cat-FASH [data-cat="FASH"],
body.hide-cat-TECH [data-cat="TECH"],
body.hide-cat-NEIGH [data-cat="NEIGH"],
body.hide-cat-CHIC [data-cat="CHIC"],
body.hide-cat-BONUS [data-cat="BONUS"],
body.hide-genre-latin [data-genre="latin"],
body.hide-genre-hiphop [data-genre="hiphop"],
body.hide-genre-pop [data-genre="pop"],
body.hide-genre-electronic [data-genre="electronic"],
body.hide-genre-mixed [data-genre="mixed"],
body.hide-genre-other [data-genre="other"] {{
  display: none !important;
}}
.genrechip {{
  margin-left: 0.5rem;
  font-size: 0.68rem;
  color: var(--text-muted);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 0.05rem 0.5rem;
}}

.week {{ margin: 2.6rem 0 3.2rem; }}
.week-title {{
  font-family: "Fraunces", serif;
  font-weight: 600;
  font-size: 1.5rem;
  margin: 0 0 0.9rem;
  display:flex;
  align-items:baseline;
  gap: 0.7rem;
}}
.week-range {{
  font-family: "IBM Plex Mono", monospace;
  font-size: 0.82rem;
  font-weight: 400;
  color: var(--text-muted);
  letter-spacing: 0.01em;
}}

.grid {{
  display: grid;
  gap: 4px;
  background: var(--border);
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
  box-shadow: var(--shadow);
}}
.daycell {{
  background: var(--surface-2);
  padding: 0.5rem 0.6rem;
  display:flex;
  align-items:baseline;
  gap: 0.4rem;
  grid-row: 1;
}}
.daycell.head {{
  position: sticky;
  top: 0;
}}
.dow {{
  font-family: "IBM Plex Mono", monospace;
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
}}
.dnum {{
  font-family: "IBM Plex Mono", monospace;
  font-size: 0.92rem;
  font-weight: 500;
}}

.ev-row {{
  background: var(--surface);
  border-left: 4px solid var(--cat);
  padding: 0.4rem 0.6rem;
  display:flex;
  align-items:center;
  gap: 0.5rem;
  min-height: 2.1rem;
  overflow: hidden;
  white-space: nowrap;
}}
.ev-badge {{
  flex:none;
  width: 1.15rem;
  height: 1.15rem;
  border-radius: 50%;
  background: var(--cat);
  color: #fff;
  font-family: "IBM Plex Mono", monospace;
  font-size: 0.65rem;
  display:flex;
  align-items:center;
  justify-content:center;
  font-weight:500;
}}
.ev-name {{
  font-weight: 600;
  font-size: 0.85rem;
  overflow: hidden;
  text-overflow: ellipsis;
}}
.ev-venue {{
  font-size: 0.78rem;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
}}
.flagchip {{ flex:none; font-size: 0.8rem; }}
.approx {{ flex:none; font-size:0.68rem; color: var(--accent-2); font-style: italic; }}

.detail-wrap {{
  margin-top: 0.9rem;
  overflow-x: auto;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  box-shadow: var(--shadow);
}}
table.detail-table {{
  border-collapse: collapse;
  width: 100%;
  font-size: 0.86rem;
  min-width: 920px;
}}
table.detail-table th {{
  text-align: left;
  font-family: "IBM Plex Mono", monospace;
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  padding: 0.6rem 0.7rem;
  border-bottom: 1px solid var(--border);
  background: var(--surface-2);
}}
table.detail-table td {{
  padding: 0.6rem 0.7rem;
  border-bottom: 1px solid var(--border);
  vertical-align: top;
}}
table.detail-table tr:last-child td {{ border-bottom: none; }}
.dnum-cell {{ font-family:"IBM Plex Mono", monospace; color: var(--text-muted); }}
.evn {{ font-weight: 600; min-width: 220px; }}
.mono {{ font-family:"IBM Plex Mono", monospace; font-variant-numeric: tabular-nums; white-space:nowrap; }}
table.detail-table a {{ color: var(--accent); text-decoration: none; white-space:nowrap; }}
table.detail-table a:hover {{ text-decoration: underline; }}

.outside {{
  margin-top: 3rem;
  padding: 1.4rem 1.6rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  box-shadow: var(--shadow);
}}
.outside h2 {{
  font-family:"Fraunces", serif;
  font-size:1.25rem;
  margin: 0 0 0.8rem;
}}
.outside ul {{ margin: 0; padding-left: 1.1rem; line-height: 1.7; }}
.outside a {{ color: var(--accent); }}
footer.note {{
  max-width: 1400px;
  margin: 2.5rem auto 0;
  padding: 0 1.5rem;
  color: var(--text-muted);
  font-size: 0.82rem;
  line-height: 1.6;
}}
</style>

<div class="wrap">
  <header class="page">
    <h1>Barcelona Cultural Calendar</h1>
    <p class="subtitle">Aug 28 &ndash; Sep 27, 2026. Bars are sized to how long each event runs &mdash; short one-off events float to the top of each week, exhibitions and multi-day programs sit lower and stretch across the days they're open. Numbers on each bar match the detail row below it.</p>
    <div class="legend">
      <div class="legend-group">{flag_legend_html}</div>
    </div>
    <div class="filters">
      <div class="filter-row" id="cat-filters">
        <span class="filter-label">Categories</span>
        {cat_chip_html}
        <button type="button" class="chip chip-reset" id="reset-cats">Show all</button>
      </div>
      <div class="filter-row" id="genre-filters">
        <span class="filter-label">Music genre</span>
        {genre_chip_html}
      </div>
    </div>
  </header>

  {"".join(weeks_html)}

  <section class="outside">
    <h2>Flagged but outside this window</h2>
    <ul>
      <li><strong>Circuit Festival Barcelona</strong> &mdash; concluded Aug 1&ndash;9. <a href="https://hotelarclarambla.com/agenda/en/events/circuit-festival-barcelona-2026-dates-full-programme-prices-tickets/" target="_blank">Details</a></li>
      <li><strong>FIRE!! Barcelona LGTBIQ+ Film Festival</strong> &mdash; ran June 2026. <a href="https://mostrafire.com/en/" target="_blank">Official site</a></li>
      <li><strong>Manga Barcelona 2026</strong> &mdash; Dec 5&ndash;8, well after this window. <a href="https://www.manga-barcelona.com/es/info.cfm" target="_blank">Official site</a></li>
      <li><strong>Japan Weekend Barcelona</strong> &mdash; spring edition passed; a further edition is reported for November. <a href="https://barna.news/japan-weekend-barcelona-2026-date-venue/" target="_blank">Details</a></li>
      <li><strong>RetroBarcelona</strong> and <strong>Orgullo Friki Barcelona</strong> &mdash; both already took place in May 2026.</li>
      <li><strong>080 Barcelona Fashion</strong> &mdash; April 2026 edition passed; no confirmed autumn edition found.</li>
      <li><strong>UIA World Congress of Architects</strong> (WCA2026's flagship week) &mdash; took place June 28&ndash;July 2. The central exhibition at Les Tres Xemeneies closed Jul 19, and the Palau Victòria Eugènia show closed Jul 5 &mdash; both before this window. The year-long WCA2026 program continues via the entries shown above (Gustavo Gili HQ, Sarrià-Sant Gervasi as September's district, Seny i Rauxa, Architecture Studio Sessions). <a href="https://www.barcelona.cat/capitalmundialarquitectura/en/programme" target="_blank">Official programme</a></li>
      <li><strong>Modular Day Barcelona</strong> and <strong>Tallers Oberts BCN</strong> &mdash; no confirmed edition dated inside this window; worth rechecking directly.</li>
    </ul>
  </section>

  <footer class="note">
    Compiled from public web research; several smaller venues and collectives (independent queer nightlife, artist-run factories, modular-synth meetups) publish mainly on Instagram rather than indexable listings &mdash; entries marked <span class="approx">approx.</span> or flagged as approximate are worth a direct check closer to the date. Categories with only one or two events in a given week (fashion, some queer/nightlife listings) reflect genuine gaps in what's publicly dated this far out, not omissions.
    <br><br>
    Music genre tags are a best-effort read of each lineup's style, not an official classification &mdash; check the "More info" link if it matters for a specific night. No dedicated hip-hop night turned up in this window's research; the tag is here and ready as soon as one does.
  </footer>
</div>

<script>
(function() {{
  const body = document.body;

  function applyChip(chip, isOn) {{
    chip.classList.toggle('off', !isOn);
    chip.setAttribute('aria-pressed', String(isOn));
    const cls = chip.dataset.cat ? 'hide-cat-' + chip.dataset.cat : 'hide-genre-' + chip.dataset.genre;
    body.classList.toggle(cls, !isOn);
  }}

  // sync body classes with whatever state each chip was rendered in (e.g. the
  // Electronic/EDM genre chip starts "off" so those events are hidden by default)
  document.querySelectorAll('.chip[data-cat], .chip[data-genre]').forEach(chip => {{
    applyChip(chip, !chip.classList.contains('off'));
    chip.addEventListener('click', () => applyChip(chip, chip.classList.contains('off')));
  }});

  document.getElementById('reset-cats').addEventListener('click', () => {{
    document.querySelectorAll('.chip[data-cat]').forEach(chip => applyChip(chip, true));
  }});
}})();
</script>
'''

with open("/tmp/outputs/barcelona_cultural_calendar.html", "w") as f:
    f.write(html_out)

print("done", len(E), "events")
