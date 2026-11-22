# Line 1 depth findings (input for prompt 02)

Researched 2026-11-22 (America/Toronto), with about 15 minutes of fetching. Only public documents were used. They are **linked, not saved**: their licences are agency or publisher copyright (TTC, YRRTC, Metrolinx, Transit Toronto, blogTO), or CC BY-SA for Wikipedia text.

How to read this file:

- **Table A** is what `prompts/02-apply-documented-depths.md` consumes. It has one row per existing `data/structure_depths.json` key, and only for keys where a document gives a number. Any key not in Table A has **no documented value**, so it stays an ESTIMATE.
- **Tables B–D** are per-section findings: construction type, documented elevations and depths, portals and grades. They do not map onto an existing key, so prompt 02 does not apply them. They need a follow-up prompt (see the end of this file).

Confidence levels:

- **high** means an engineering report or the TTC's own published number.
- **medium** means the TTC quoted in the press, or Wikipedia citing contemporary sources.
- **low** means secondary or unclear wording.

The model column shows the value baked at commit 7db5caf for comparison. The model uses HRDEM CGVD2013 heights.

## A. Values for prompt 02 (`key | value | unit | quote/page | title | url | licence`)

| key | value | unit | quote/page | title | url | licence |
|---|---|---|---|---|---|---|
| tysseStationRailDepth | 20 | m | Platform depths below street: "Highway 407 with a depth of 21.1 metres below street level"; "York University, which extends 18 metres below the surface" (TTC via blogTO, 2025). The TTC also "did confirm the stations are 20 to 25 metres deep" (RCCAO 2020, §6.0). Rail is about 1 m below platform level (ESTIMATE), so rail depth is about 19–22 m. 20 m is an **estimate within the documented range**; the status is `estimate-in-documented-range`. Confidence: medium. | blogTO, "New TTC station will claim record for the deepest on the network" (31 Mar 2025); RCCAO, "Station to Station" (Apr 2020), §6.0 | https://www.blogto.com/city/2025/03/what-is-deepest-ttc-station/ ; https://rccao.com/research/files/RCCAO-STATION-TO-STATION-REPORT-APRIL2020.pdf | © publishers, link only |
| boreInternalDiameter | 5.4 | m | "The Yonge Subway Extension will be constructed with an internal tunnel diameter of 5.4m. This diameter is consistent with that of the current TYSSE Project but slightly larger than the diameter of the Sheppard Twin Tunnels" (§3.3.1, p. 5). This confirms the existing value; `status` is `documented`. Confidence: high. | TTC/YRRTC, Yonge Subway Extension Conceptual Design Report, FINAL, March 2012 (McCormick Rankin–Hatch Mott MacDonald JV), §3.3.1 p. 5 | https://www.yrrtc.ca/PDFs/YSE/2012_ReportConceptualDesign.pdf | © TTC/YRRTC, link only |

### Keys with no documented value (leave as ESTIMATE)

| key | What was found | Conclusion |
|---|---|---|
| tysseBoredRailDepth (24) | The sources conflict. The TYSSE EA says the general clearance is "1.5 to 2 tunnel diameters (9-12m)" of cover (Appendix P, Construction Methods Report, 2005, §3.2, p. 3-3/3-4). The VNSL design criteria give "top of tunnel to grade 1.5-2 tunnel dia. ~ 8 m" (2007 Response to Conditions of Approval, design-criteria table). Tunnel Business Magazine (2013, already cited) gives an invert 20–30 m deep. The 2005 cover figure implies a rail depth of about 15–18 m, which is shallower than the stations; the as-built depths are not known. | **No change.** Add a note that the sources conflict. |
| universityBoredRailDepth (15) | The University line is confirmed bored between Museum and Osgoode (Transit Toronto 5103; TTC station pages: Queen's Park and St Patrick have 3 levels). No depth figure was found. | No documented value. |
| yonge1954BoxRailDepth (9.5) | City of Toronto Archives exhibit: "an 18-foot excavation" at Yonge and Wellington (5.5 m, the initial cut at the ceremony site, not the final grade). Transit Toronto 5102: rock 3–8 ft below grade from Front to Queen. There is nothing newer than the 9.1–12.2 m range already cited. | No change. |
| otherBoxRailDepth (10) | Lawrence station is "18.3 metres below the intersection of Yonge and Lawrence" (TTC via blogTO 2025), but Lawrence is a North Yonge station; see Table B. There is no general box depth. | No change. Use per-section values in a follow-up. |
| boxHeightAboveRail (5.0) | YSE 2012 has a box cross-section (Figure 3-2, p. 6), but its dimensions are only in the drawing and could not be read from the PDF text. Standard TTC station walls are 0.5 m thick and floors 0.6 m (Transit Toronto 5105). | Not documented in text. Read Figure 3-2 by hand next round. |
| portalCover (1.0) | Nothing specific to portals. The VNSL design criteria (2007) give a minimum cover of 3.0 m from the top of a box structure to grade, but that applies to full-cover sections, not portal faces. | No change. |
| rosedaleCutDepth (6.0) | Nothing found. | No documented value. |
| verticalCurveRadius (1250) | YSE 2012 Table 3-2 lists the vertical curves by grade only; no radius appears in the text. | No documented value. |
| maxGradePct (4.0) | The 4% at Summerhill (nycsubway, already cited) stands. For contrast, current TTC design criteria for *new* lines allow at most ±3.5% on main line and ±0.3% through stations (VNSL 2007 table; also the Line 2 East Extension EPR §4). | No change. Note: 3.5% applies to TYSSE and later sections. |

## B. Per-section construction and depth findings

| Section (model km) | Documented construction / cross-section | Documented depth / elevation | Model now (7db5caf) | Confidence | Source |
|---|---|---|---|---|---|
| TYSSE stations: VMC 0.0, Hwy 407 1.27, Pioneer Village 2.65, York U 3.48, Finch W 4.87, Downsview Pk 6.96 | Cut-and-cover station boxes (EA App. P §3.1.1) | Platform below street: Hwy 407 **21.1 m**, York U **18 m** (TTC via blogTO). TTC: "20 to 25 m deep" (RCCAO). Wikipedia infobox gives Finch West "Depth 15 m"; it is unclear whether that is the Line 1 or Line 6 level, so low confidence. Pioneer Village about 17 m (Azure magazine via search snippet; not verified, low). | Rail 17.0–21.0 m below ground | medium | blogTO 2025; RCCAO 2020 §6.0; https://en.wikipedia.org/wiki/Finch_West_station |
| TYSSE stations, **preliminary EA** base slab | — | Base-slab elevation: Sheppard/GO (Sheppard West) **180 m**, Keele/Finch (Finch West) **178 m**, York University **175 m**, Steeles (Pioneer Village) **180 m**. The note says these are "estimated from the subway vertical alignment profile provided by URS" and are preliminary. Top of rail is roughly 1–1.5 m above the slab (ESTIMATE). Vertical datum not stated. | Rail: Sheppard West 185.6, Finch West 180.7, York U 182.8, Pioneer Village 183.8 | medium (preliminary design, not as-built) | TYSSE EA 2005, Appendix P Construction Methods Report, §2.2 table "Base Slab Elevation"; https://www.yrrtc.ca/PDFs/EA/SpadinaSubway/2005_AppP_ConstructionMethodsReport_TYSSE.pdf |
| TYSSE running tunnels (Downsview/Sheppard W → VMC) | Twin bored EPB TBM tunnels; ID **5.4 m** (YSE 2012 §3.3.1), bore 6.1 m (already cited). Design criteria in 2007 said ID 5.2 / OD 5.65 m, so as-built differs. | Cover 1.5–2 diameters, about 9–12 m (EA 2005) or about 8 m (VNSL 2007). Invert 20–30 m (TBM magazine 2013). **The sources conflict.** | Bored rail depth 24 m (estimate) | low/conflict | App. P §3.2; https://yrrtc.ca/PDFs/EA/SpadinaSubway/2007_ResponseConditionsApproval_Hwy7andVaughanNSlink_TYSSE.pdf |
| Wilson → Yorkdale → Eglinton West (Cedarvale) portal | At grade in the Allen Road median. The line crosses Highway 401 on **twin single-track bridges**. Eglinton West station is half underground (south) and half above ground (north): **this is the portal**. | — | Portal at 14.33 km, Cedarvale at 14.41 km; bridge 0.375 km | high | Transit Toronto, "The Spadina Subway" (5106); https://transittoronto.ca/subway/5106.shtml |
| Eglinton West → St Clair West (Cedarvale / Forest Hill ravines) | "**cut-and-cover through the Forest Hill and Cedarvale Ravines** and then north under Everden Road to Eglinton Avenue" | none | Box; roof above ground 17.37–17.54 km (prompt 03). The cut-and-cover through the ravine supports treating it as a shallow, covered structure. | high | TTC The Coupler, "45 years ago in 1978"; https://coupler.ttc.ca/news/back-track/back-track/45-years-ago-in-1978 |
| St Clair West → Dupont (Russell Hill Dr / Nordheimer Ravine → Davenport Rd) | "North from Davenport Road, the line runs **in tunnel** to Russell Hill Drive and the Nordheimer Ravine." This is a mined/bored tunnel under Casa Loma, not a box. | none | **Box (wrong type).** This is also where the model's −4% grade is, at about 17.9 km. | high (type); none (depth) | The Coupler 1978 (above); Transit Toronto 5106 ("tunnelled beneath Casa Loma and Nordheimer Ravine") |
| Dupont → St George (Spadina Rd) | Cut-and-cover with Spadina Road decked (1975–76) | none | Box | high | https://en.wikipedia.org/wiki/Spadina_subway_line (Construction) |
| Museum → Osgoode | **Bored** twin tunnels; Queen's Park and St Patrick are tube stations, each with 3 levels | none | Bored, 1.62 km | high | Transit Toronto 5103; nycsubway.org; ttc.ca station pages |
| Union → Eglinton (1954) | 3.2 mi (5.15 km) cut-and-cover plus **1.4 mi (2.25 km) open cut**; cut-and-cover as far north as Davenport Rd; open cut on the east side of Yonge from about Pleasant Blvd | Initial excavation 18 ft (5.5 m) at Yonge and Wellington; rock 3–8 ft below grade from Front to Queen | Yonge box 5.53 km + open cut 2.02 km | high (lengths), low (depth) | TTC Coupler "60 YEARS YONGE"; City of Toronto Archives exhibit; Transit Toronto 5102 |
| Eglinton → Lawrence | Cut-and-cover just north of Eglinton (tail track); **twin tunnels driven with manual shields** Eglinton–Lawrence; Lawrence station and scissors crossover cut-and-cover | Lawrence station **18.3 m** below the intersection (TTC via blogTO) | Box; Lawrence rail 10.7 m below ground | medium–high | Wikipedia North Yonge subway extension; Transit Toronto 5105; blogTO 2025 |
| Lawrence → York Mills (Hogg's Hollow) | **TBM twin tunnels**, then cut-and-cover through Hogg's Hollow (east of Yonge) with the Don River diverted in a flume; walls 1.2 m and floors 2.4 m thick | **Top of tunnel 1.2 m (4 ft) below the West Don riverbed** | Box; roof above ground 33.77–34.38 km (prompt 03) | high | Wikipedia North Yonge subway extension; Transit Toronto 5105; TTC Annual Report 1970 |
| York Mills → Sheppard-Yonge | **Twin tunnel, 5162 ft (1.57 km), manual shields**, to Johnston Ave; then 1249 ft (381 m) cut-and-cover for Sheppard station and crossover | none | Box | high | Transit Toronto 5105; Wikipedia |
| North Yonge bored tunnels (Eglinton–Sheppard) | Twin tunnels **4.9 m (16 ft) diameter** with 0.6 m concrete rings (that is, smaller than TYSSE's 5.4 m) | none | Box | medium | Wikipedia North Yonge subway extension |
| Sheppard-Yonge → Finch | **Cut-and-cover**, over 7000 ft (2.13 km) from Harlandale Ave, side-by-side tracks; Finch has a double crossover south and a **triple tail track** north (about 300 m) | YSE 2012: rail profile elevation **181.33 m at the north end of the existing Finch tail track** (YSE chainage 1+000); vertical datum not stated in the text | Box; Finch rail 183.1 m at the platform (the model ends at the platform) | high | Transit Toronto 5105; YSE Conceptual Design Report 2012, Table 3-2 p. 4 |

## C. Portals (documented)

| Portal | Documented | Model | Source |
|---|---|---|---|
| Eglinton West / Cedarvale (Spadina, south end of the Allen Road median) | Station half underground, half at grade | 14.33 km ✓ | Transit Toronto 5106 |
| Rosedale and Davisville open cuts (1954 Yonge) | "1.4 miles of open cut", east of Yonge from about Pleasant Blvd north | 26.36 km (Ellis Portal) to 27.13 km, and 28.68–29.95 km ✓ (lengths consistent) | TTC Coupler; City of Toronto Archives |
| Sheppard West / Wilson (Spadina north end) | Line enters the Allen median north of Wilson towards the yard; no exact portal chainage found | 9.15 km | Transit Toronto 5106 / 5304 (no chainage) |

No portal chainages or portal rail elevations were found in any document.

## D. Grades (documented)

- **4%**, the steepest on Line 1, north of Summerhill (nycsubway; already cited). Medium confidence.
- **TTC design criteria for new lines:** main line max **±3.5%**, min ±0.3% for drainage, **±0.3% through stations**, minimum constant grade 150 m. Source: VNSL 2007 table; Line 2 East EPR §4. High confidence for the criteria; TYSSE was designed to them.
- **YSE profile north of Finch:** −2.932% from 181.33 m (end of the Finch tail track), then −0.30% through Cummer (low point 172.78 m). Source: YSE 2012 Table 3-2. This is outside the model, but it fixes the top-of-rail level at the Finch tail.

## Follow-ups (not prompt 02)

1. **Construction-type corrections** in `scripts/bake-profile.mjs` classification:
   - Davenport Rd → Russell Hill Dr is a bored/mined tunnel, not a box.
   - Eglinton → Sheppard is twin bored tunnels of 4.9 m diameter, except the cut-and-cover at stations and Hogg's Hollow.
   - Sheppard → Finch is cut-and-cover.
2. **Station depth pins:** Lawrence platform 18.3 m, Highway 407 21.1 m, York University 18 m.
3. **Hogg's Hollow:** top of tunnel 1.2 m below the riverbed. Use this as the minimum cover in prompt 03 rather than 1.0 m.
4. Read the box and tunnel cross-section figures in YSE 2012 (Figures 3-1 and 3-2, pp. 5–6) by hand to get box internal height and width.
5. Still to search:
   - TTC Design Manual DM-0302-03 (box structures), which is not public;
   - City of Toronto Archives Yonge contract drawings (Fonds 16 / 1128), licensed per item;
   - TYSSE as-built profile drawings;
   - Spadina 1978 profile (UCRS Rail and Transit 1977–78).
