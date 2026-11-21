# Sources

Every value in the sim is either taken from a source below or marked `ESTIMATE` in the code
and in the data files (`public/data/line1_profile.json` → `structure.*.basis`). Fetched 2026-11-21.

## Data used directly

| What | Source | Licence | Where it is used |
|---|---|---|---|
| Line 1 alignment, stop positions, platform polygons | OpenStreetMap relation [102388](https://www.openstreetmap.org/relation/102388) via Overpass API | ODbL 1.0 | `public/data/line1.json` |
| Tunnel / bridge / layer tags per track way | OpenStreetMap (same relation, way tags) | ODbL 1.0 | `scripts/raw/line1-ways-tags.json` → profile classes |
| Buildings, trees, roads within ~220 m of the line | OpenStreetMap via Overpass | ODbL 1.0 | `public/data/corridor.json` |
| Bare-earth elevation (1 m lidar DTM) | NRCan HRDEM mosaic 1 m, `https://canelevation-dem.s3.ca-central-1.amazonaws.com/hrdem-mosaic-1m/8_2-mosaic-1m-dtm.tif` (STAC: datacube.services.geo.ca, collection `hrdem-mosaic-1m`) | Open Government Licence – Canada | track profile + terrain tiles (all 7,745 track samples and all 120 terrain tiles came from HRDEM; the AWS Terrarium fallback was not needed) |
| Fallback elevation | AWS Terrain Tiles (Terrarium), `s3.amazonaws.com/elevation-tiles-prod` | see Mapzen/AWS terrain tiles attribution | only where HRDEM is nodata (none on this line) |
| Orthoimagery | [Ontario Imagery Web Map Service](https://ws.lioservices.lrc.gov.on.ca/arcgis2/rest/services/LIO_Imagery/Ontario_Imagery_Web_Map_Service/MapServer) (Toronto: South Central Ontario Orthophotography Project 2023) | Open Government Licence – Ontario ([catalogue](https://data.ontario.ca/dataset/open-ontario-imagery)) | `public/imagery/` (baked locally, **not committed**; run `npm run bake:imagery`) |
| Station facts (coordinates, opening date, platform type, structure, levels, neighbourhood) | English Wikipedia, offline zim `wikipedia_en_all_maxi_2026-08` served by kiwix-serve; per-station article titles in `public/data/line1_stations.json` | CC BY-SA 4.0 (short facts only) | `public/data/line1_stations.json`, HUD station panel, platform side |

## Construction / tunnel facts

| Fact | Value | Source |
|---|---|---|
| Steepest Line 1 grade | 4% (north of Summerhill, climbing the Lake Iroquois shoreline) | nycsubway.org, [TTC Yonge-University-Spadina Subway](https://nycsubway.org/wiki/TTC_Yonge-University-Spadina_Subway) |
| 1954 Yonge subway method | cut-and-cover reinforced-concrete "box"; excavated to final grade ~30–40 ft (9.1–12.2 m) below the street | "Strain measurements on the temporary road deck for the Toronto Subway", Proc. ICE 1954 ([doi:10.1680/iicep.1954.11237](https://doi.org/10.1680/iicep.1954.11237)); NRC report ([doi:10.4224/20386636](https://doi.org/10.4224/20386636)) |
| Yonge line north of Bloor | built mostly in open cut; St. Clair–Summerhill section later covered over | Wikipedia, "Line 1 Yonge–University" (Design section) |
| Ellis Portal | the line leaves the tunnel north of Church St / Davenport Rd; the only TTC portal with a name sign | Transit Toronto, [A History of the Original Yonge Subway](https://www.transit-toronto.ca/subway/5102.shtml) |
| Short mined section under the CP tracks near Summerhill | "without the telltale round bore" | Transit Toronto (same page) |
| Cut-and-cover practice (1951) | soldier piles, timber deck, trusses at stations | Transit Toronto, [How Cut and Cover Worked in 1951](https://www.transittoronto.ca/subway/5116.shtml) |
| University line bored sections | Queen's Park and St. Patrick stations are in bored tunnels (circular / semi-circular sections) | Wikipedia, "Line 1 Yonge–University" (Stations section) |
| Spadina line (1978) | from St. George along Spadina Rd, Nordheimer & Cedarvale ravines, surfaces at Eglinton/Allen, ~6 km in the Allen Road median past Wilson | Wikipedia, "Line 1 Yonge–University" |
| TYSSE twin bores | 5.4 m internal diameter, 6.1 m bore; invert 20–30 m below surface (southern tunnels) | Tunnel Business Magazine, [TYSSE – Southern Tunnels](https://tunnelingonline.com/toronto-york-spadina-subway-extension-southern-tunnels/) (Dec 2013); Bidhendi, Amm & Staples, [TAC 2012 paper](https://www.tunnelcanada.ca/document-load.php?dir=2012&file=tac2012Paper103.pdf) |
| TYSSE tunnelling extent | 6.4 km of twin tunnels (8,493 six-segment rings); remaining 2.2 km stations/cut-and-cover; TBMs launched at Downsview Park and Highway 407, extracted at VMC | TTC Project News, [December 2013](https://web.archive.org/web/20140222052920/www.ttc.ca/Spadina/Project_News/Newsletters/News_by_Date/2013/December/Project_News_December_2013.jsp); TAC 2012 paper |

## Estimates (no public figure found yet)

Tunnel rail depths other than the documented ranges, box dimensions, island/side platform widths,
track spacing, portal cover, Rosedale cut depth, vertical-curve radius, tunnel-depth smoothing,
short-tunnel ("covered way") threshold, building heights without OSM tags, tree sizes, road widths.
Each one is labelled `ESTIMATE` where it is defined.

## Found, not yet used (next round)

- TTC board / staff reports on ttc.ca (e.g. Line 1 capacity and ATC reports) – not yet searched for profile drawings.
- City of Toronto Archives: Yonge subway construction photos and plans (1949–54), Spadina line (1978) – plans may give box dimensions and depths; licences vary per item, link only.
- TYSSE environmental assessment / design reports (Metrolinx/TTC) – station box depths, exact portal and shaft chainages.
- Yonge North Subway Extension (Metrolinx) reports – Finch station tail tracks and the extension profile.
- Transit Toronto pages on the University (1963), North Yonge (1973–74) and Spadina (1978) extensions – construction methods per section.
