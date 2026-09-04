# 14. Source Library {#source-library}

## Copernicus Data Space Ecosystem {#source-1}

[ESA / European Commission](<https://dataspace.copernicus.eu>)

**Shelf:** Satellite & Earth Observation

Free, full-archive Sentinel-1 (radar), Sentinel-2 (10 m optical), Sentinel-3 and Sentinel-5P imagery for the whole planet, updated every few days.

Register for a free account, then use the OData/STAC catalogue APIs to search and the S3-compatible endpoint to download. openEO and Sentinel Hub APIs sit on top for on-the-fly processing.

**Cost:** Free

## NASA Earthdata {#source-2}

[NASA](<https://www.earthdata.nasa.gov>)

**Shelf:** Satellite & Earth Observation

The front door to NASA's entire Earth science archive — MODIS, VIIRS, Landsat, GRACE, SMAP, atmospheric and ocean products.

Create a free Earthdata Login, then query the CMR (Common Metadata Repository) API or use the earthaccess Python library, which handles auth and streaming for you.

**Cost:** Free

## USGS EarthExplorer / Landsat {#source-3}

[USGS](<https://earthexplorer.usgs.gov>)

**Shelf:** Satellite & Earth Observation

Fifty years of Landsat imagery plus aerial photography, elevation and declassified historical satellite data.

Free account, then the M2M (machine-to-machine) JSON API for scripted search and bulk download, or pull the same scenes as cloud-optimised GeoTIFFs from AWS Open Data.

**Cost:** Free

## Sentinel Hub {#source-4}

[Planet / Sinergise](<https://www.sentinel-hub.com>)

**Shelf:** Satellite & Earth Observation

Processing API that renders satellite imagery on demand — pick a bounding box, date range and band maths, get a PNG or GeoTIFF back.

OAuth client credentials, then a POST to the Process API with an evalscript. WMS/WMTS endpoints let you drop it straight into Leaflet or QGIS.

**Cost:** Free tier, paid above it

## Microsoft Planetary Computer {#source-5}

[Microsoft](<https://planetarycomputer.microsoft.com>)

**Shelf:** Satellite & Earth Observation

A large STAC catalogue of Earth observation data hosted on Azure, with a hosted JupyterHub for analysis next to the data.

Query the public STAC API, then sign asset URLs with the free token endpoint (or the planetary-computer Python package) before reading the COGs.

**Cost:** Free

## AWS Open Data Registry {#source-6}

[Amazon Web Services](<https://registry.opendata.aws>)

**Shelf:** Satellite & Earth Observation

Hundreds of public datasets hosted free in S3 — Sentinel, Landsat, NOAA weather, OpenStreetMap extracts, genomics, census.

Most buckets are anonymously readable: point the AWS CLI or boto3 at them with --no-sign-request. Many also publish a STAC catalogue.

**Cost:** Free to read

## Google Earth Engine {#source-7}

[Google](<https://earthengine.google.com>)

**Shelf:** Satellite & Earth Observation

A planetary-scale analysis platform with a petabyte catalogue already ingested and ready to compute over.

Register a cloud project, then use the JavaScript Code Editor or the Python earthengine-api. Free for research, non-profit and education; commercial use is paid.

**Cost:** Free for non-commercial

## Planet {#source-8}

[Planet Labs](<https://www.planet.com/nicfi/>)

**Shelf:** Satellite & Earth Observation

Daily high-resolution commercial imagery. The NICFI programme releases tropical basemaps free for forest and land-use work.

Apply for NICFI access, then use the Planet Basemaps API or the XYZ tile endpoint directly in a web map.

**Cost:** Free under NICFI, otherwise commercial

## Maxar Open Data Program {#source-9}

[Maxar](<https://www.maxar.com/open-data>)

**Shelf:** Satellite & Earth Observation

Very high-resolution imagery released free after major disasters and crises, licensed CC BY-NC.

Browse the event STAC catalogue and pull cloud-optimised GeoTIFFs directly over HTTP — no key required.

**Cost:** Free (non-commercial)

## UNOSAT {#source-10}

[UNITAR](<https://unosat.org>)

**Shelf:** Satellite & Earth Observation

Satellite-derived damage assessments, flood extents and displacement maps produced for UN operations.

Download analysis-ready GIS layers and PDF maps per activation; some layers are served as ArcGIS REST feature services you can consume live.

**Cost:** Free

## NASA FIRMS {#source-11}

[NASA](<https://firms.modaps.eosdis.nasa.gov>)

**Shelf:** Satellite & Earth Observation

Near-real-time active fire and thermal anomaly detections worldwide, within about three hours of satellite overpass.

Request a free MAP_KEY, then hit the CSV/GeoJSON area API by country or bounding box. WMS layers exist for direct map embedding.

**Cost:** Free

## OpenAerialMap {#source-12}

[Humanitarian OpenStreetMap Team](<https://openaerialmap.org>)

**Shelf:** Satellite & Earth Observation

Openly licensed drone and aerial imagery, much of it flown after disasters.

Search the open catalogue API for imagery footprints, then use the returned TMS tile URL straight in Leaflet or MapLibre.

**Cost:** Free

## OpenStreetMap {#source-13}

[OSM Foundation](<https://www.openstreetmap.org>)

**Shelf:** Maps & Geospatial

The crowd-built map of the world — roads, buildings, rivers, clinics, shops — open-licensed under ODbL.

For live queries use the Overpass API with its own query language; for bulk use Geofabrik regional extracts. Never scrape the main tile server for production.

**Cost:** Free

## Overpass Turbo {#source-14}

[OSM community](<https://overpass-turbo.eu>)

**Shelf:** Maps & Geospatial

A browser sandbox for writing and testing Overpass queries against OpenStreetMap before you put them in code.

Write the query, run it, export GeoJSON. The generated query string drops straight into a fetch() against an Overpass endpoint.

**Cost:** Free

## Geofabrik Downloads {#source-15}

[Geofabrik](<https://download.geofabrik.de>)

**Shelf:** Maps & Geospatial

Daily OpenStreetMap extracts cut by country and region, in PBF and shapefile.

Plain HTTP download by URL — trivially scriptable in a build step. Load PBF with osmium or osm2pgsql into PostGIS.

**Cost:** Free

## Overture Maps Foundation {#source-16}

[Linux Foundation / Meta, Microsoft, Amazon, TomTom](<https://overturemaps.org>)

**Shelf:** Maps & Geospatial

Open, standardised global map layers — places, buildings, transportation, administrative boundaries — released quarterly.

Data ships as GeoParquet on S3 and Azure. Query it in place with DuckDB's spatial extension, or use the overturemaps Python CLI.

**Cost:** Free

## Natural Earth {#source-17}

[Volunteer / NACIS](<https://www.naturalearthdata.com>)

**Shelf:** Maps & Geospatial

Small-scale cartographic base layers — coastlines, borders, rivers, populated places — in three tidy resolutions, public domain.

Download shapefiles or GeoJSON directly. Bundled inside most mapping libraries already, so often a one-line import.

**Cost:** Free

## GADM {#source-18}

[University of California, Davis](<https://gadm.org>)

**Shelf:** Maps & Geospatial

Administrative boundaries for every country, down to district and ward level.

Download per-country GeoPackage or shapefile by URL. Free for academic and non-commercial use — check the licence for anything else.

**Cost:** Free (non-commercial)

## geoBoundaries {#source-19}

[William & Mary geoLab](<https://www.geoboundaries.org>)

**Shelf:** Maps & Geospatial

Open, CC BY licensed administrative boundaries for every country — the permissively-licensed alternative to GADM.

A simple REST API returns a download link per country and admin level; the GeoJSON is small enough to fetch client-side.

**Cost:** Free

## MapLibre GL {#source-20}

[MapLibre / open source](<https://maplibre.org>)

**Shelf:** Maps & Geospatial

The open-source fork of Mapbox GL — fast vector map rendering in the browser and on mobile.

npm install maplibre-gl, point it at a style JSON and a vector tile source. No API key and no vendor account required.

**Cost:** Free / open source

## Leaflet {#source-21}

[Open source](<https://leafletjs.com>)

**Shelf:** Maps & Geospatial

The small, dependable JavaScript library for raster tile maps and GeoJSON overlays.

One script tag or npm install, then L.map() and L.tileLayer() with any XYZ tile URL. Huge plugin ecosystem for clustering, heatmaps and drawing.

**Cost:** Free / open source

## Protomaps {#source-22}

[Protomaps](<https://protomaps.com>)

**Shelf:** Maps & Geospatial

A single-file map tile format (PMTiles) that serves an entire basemap from static hosting — no tile server at all.

Download or build a .pmtiles file, put it on S3 or GitHub Pages, and read it with the pmtiles JS library via HTTP range requests.

**Cost:** Free / open source

## Nominatim {#source-23}

[OSM Foundation](<https://nominatim.org>)

**Shelf:** Maps & Geospatial

Geocoding and reverse geocoding built on OpenStreetMap — address to coordinates and back.

The public endpoint allows one request per second with a valid User-Agent. For real volume, run the Docker image against your own extract.

**Cost:** Free (rate-limited)

## Pelias {#source-24}

[Open source](<https://pelias.io>)

**Shelf:** Maps & Geospatial

A self-hostable geocoder that blends OpenStreetMap, OpenAddresses, Who's on First and Geonames into one search index.

Run the Docker Compose project for your region, then query its JSON API for search, autocomplete and reverse lookups.

**Cost:** Free / open source

## GeoNames {#source-25}

[GeoNames](<https://www.geonames.org>)

**Shelf:** Maps & Geospatial

Eleven million place names with coordinates, population, elevation and alternate spellings in many languages.

Free account gives you a username to pass to the JSON web services; the full database is also downloadable as tab-separated dumps.

**Cost:** Free

## Copernicus DEM / SRTM {#source-26}

[ESA / NASA](<https://spacedata.copernicus.eu/collections/copernicus-digital-elevation-model>)

**Shelf:** Maps & Geospatial

Global elevation models — 30 m Copernicus DEM and the older SRTM — for terrain, slope, viewshed and flood modelling.

Copernicus DEM tiles are on AWS Open Data as COGs; SRTM comes from NASA Earthdata or OpenTopography's API.

**Cost:** Free

## OpenTopography {#source-27}

[NSF / UC San Diego](<https://opentopography.org>)

**Shelf:** Maps & Geospatial

High-resolution topography, including lidar point clouds, plus hosted global DEMs.

Free API key, then the Global DEM REST API returns a GeoTIFF for a bounding box in a single call.

**Cost:** Free

## Copernicus Climate Data Store {#source-28}

[ECMWF / European Commission](<https://cds.climate.copernicus.eu>)

**Shelf:** Climate & Weather

ERA5 reanalysis, seasonal forecasts and climate projections — the standard source for historical hourly weather anywhere on Earth since 1940.

Register, accept the licence, then use the cdsapi Python client with your key in ~/.cdsapirc. Requests are queued, so plan for asynchronous retrieval.

**Cost:** Free

## Open-Meteo {#source-29}

[Open-Meteo](<https://open-meteo.com>)

**Shelf:** Climate & Weather

Weather forecast, historical, air quality, marine and climate projection APIs with genuinely simple JSON.

No key needed for non-commercial use — a single GET with latitude, longitude and the variables you want. Ideal for prototypes and dashboards.

**Cost:** Free (non-commercial)

## NOAA / NWS API {#source-30}

[US National Weather Service](<https://www.weather.gov/documentation/services-web-api>)

**Shelf:** Climate & Weather

Official US forecasts, alerts, observations and radar as a public JSON API.

No key; just set a descriptive User-Agent header. GeoJSON responses drop straight into a map layer.

**Cost:** Free

## NOAA Climate Data Online {#source-31}

[NOAA NCEI](<https://www.ncei.noaa.gov/cdo-web/>)

**Shelf:** Climate & Weather

Station-level historical temperature, precipitation and extremes going back over a century, worldwide.

Request a free token by email, then pass it as a header to the CDO v2 REST API. Bulk GHCN files are also on FTP and AWS.

**Cost:** Free

## IPCC WGI Interactive Atlas {#source-32}

[IPCC](<https://interactive-atlas.ipcc.ch>)

**Shelf:** Climate & Weather

Regional climate change projections from the assessment reports, explorable by region, scenario and variable.

Explore in the browser and export figures and data; underlying CMIP6 data is downloadable from ESGF for analysis.

**Cost:** Free

## World Bank Climate Change Knowledge Portal {#source-33}

[World Bank](<https://climateknowledgeportal.worldbank.org>)

**Shelf:** Climate & Weather

Country-level historical climate and projections packaged for planners rather than climate scientists.

A documented REST API returns country time series as JSON; the site also exports CSV per indicator.

**Cost:** Free

## Global Forest Watch {#source-34}

[World Resources Institute](<https://www.globalforestwatch.org>)

**Shelf:** Climate & Weather

Near-real-time deforestation alerts, tree cover loss and land use layers, updated weekly.

The GFW Data API serves query and tile endpoints; free API key via the developer portal. Alerts also come as XYZ raster tiles for direct map use.

**Cost:** Free

## Climate TRACE {#source-35}

[Climate TRACE coalition](<https://climatetrace.org>)

**Shelf:** Climate & Weather

Independently estimated greenhouse gas emissions by asset and sector, built from satellite and sensor data rather than self-reporting.

Bulk CSV downloads per country and sector, plus a public REST API for assets and emissions.

**Cost:** Free

## Electricity Maps {#source-36}

[Electricity Maps](<https://www.electricitymaps.com>)

**Shelf:** Climate & Weather

Live carbon intensity and power breakdown of electricity grids by zone.

Free tier API key covers one zone; commercial plans for more. The historical dataset is also published for download.

**Cost:** Free tier, paid above

## Our World in Data {#source-37}

[Global Change Data Lab / Oxford](<https://ourworldindata.org>)

**Shelf:** Climate & Weather

Cleaned, harmonised long-run datasets on climate, energy, health, poverty and more, with the charts to match.

Every chart has a download button, and the full data catalogue is on GitHub as tidy CSVs — no key, no auth.

**Cost:** Free

## World Bank Open Data {#source-38}

[World Bank](<https://data.worldbank.org>)

**Shelf:** Population & Development

Around 16,000 development indicators for every country — GDP, population, access to electricity, schooling, health.

A clean REST API: /v2/country/{iso}/indicator/{code}?format=json. No key. The wbdata and wbgapi Python packages wrap it.

**Cost:** Free

## UN Data / SDG Indicators {#source-39}

[United Nations](<https://unstats.un.org/sdgs/dataportal>)

**Shelf:** Population & Development

Official Sustainable Development Goal indicator data by country, target and year.

The SDG API returns JSON by series and geo area; bulk downloads are available per goal.

**Cost:** Free

## WorldPop {#source-40}

[University of Southampton](<https://www.worldpop.org>)

**Shelf:** Population & Development

Gridded population estimates at 100 m resolution, plus age and sex structure, births and migration.

Download GeoTIFFs per country and year, or use the WorldPop REST API to request statistics for your own polygon.

**Cost:** Free

## Humanitarian Data Exchange {#source-41}

[UN OCHA](<https://data.humdata.org>)

**Shelf:** Population & Development

The main open repository for humanitarian data — 20,000+ datasets on displacement, needs, food security, admin boundaries.

It runs on CKAN, so the full CKAN API works for search and download. The hdx-python-api package handles pagination and resources.

**Cost:** Free

## IPUMS {#source-42}

[University of Minnesota](<https://www.ipums.org>)

**Shelf:** Population & Development

Harmonised census and survey microdata from over 100 countries, made comparable across time and place.

Free registration, define an extract in the web interface or via the IPUMS API, then download when it is built.

**Cost:** Free (registration)

## DHS Program {#source-43}

[USAID](<https://dhsprogram.com>)

**Shelf:** Population & Development

Demographic and Health Surveys — nationally representative household data on health, nutrition, gender and mortality.

Request dataset access per country with a stated research purpose; the DHS API serves indicator data as JSON without that step.

**Cost:** Free (access request)

## GHSL — Global Human Settlement Layer {#source-44}

[European Commission JRC](<https://human-settlement.emergency.copernicus.eu>)

**Shelf:** Population & Development

Global built-up surface, population grids and settlement classification derived from satellite imagery, back to 1975.

Direct download of GeoTIFF tiles by epoch and resolution; also available as WMS layers for quick map use.

**Cost:** Free

## Eurostat {#source-45}

[European Commission](<https://ec.europa.eu/eurostat>)

**Shelf:** Population & Development

Official statistics for the EU and member states — economy, population, environment, transport, at NUTS region level.

The Statistics API returns JSON-stat by dataset code; the eurostat Python and R packages make it a one-liner.

**Cost:** Free

## data.gov / data.europa.eu {#source-46}

[US Government / European Commission](<https://data.europa.eu>)

**Shelf:** Population & Development

National open data portals aggregating hundreds of thousands of government datasets.

Both run catalogue APIs (CKAN-style and SPARQL respectively) so you can search programmatically before downloading.

**Cost:** Free

## ACLED {#source-47}

[Armed Conflict Location & Event Data Project](<https://acleddata.com>)

**Shelf:** Conflict, Rights & Humanitarian

Coded records of political violence and protest events worldwide — date, location, actors, fatalities — updated weekly.

Register for a free access key, then query the REST API by country, date range and event type. Free for academic and non-profit use.

**Cost:** Free for research

## UCDP {#source-48}

[Uppsala University](<https://ucdp.uu.se>)

**Shelf:** Conflict, Rights & Humanitarian

The longest-running armed conflict dataset, with georeferenced events back to 1989 and conflict-year data to 1946.

An open REST API returns JSON per dataset version; full CSV and RData downloads need no registration at all.

**Cost:** Free

## ReliefWeb {#source-49}

[UN OCHA](<https://reliefweb.int>)

**Shelf:** Conflict, Rights & Humanitarian

Situation reports, appeals, maps and job postings across every active humanitarian emergency.

A well-documented public API supports full-text search and filtering by country, disaster and source. No key; just an appname parameter.

**Cost:** Free

## IDMC {#source-50}

[Internal Displacement Monitoring Centre](<https://www.internal-displacement.org>)

**Shelf:** Conflict, Rights & Humanitarian

Global estimates of people internally displaced by conflict and disaster, by country and year.

The Global Internal Displacement Database offers CSV export and a public API for displacement figures.

**Cost:** Free

## UNHCR Refugee Data Finder {#source-51}

[UNHCR](<https://www.unhcr.org/refugee-statistics/>)

**Shelf:** Conflict, Rights & Humanitarian

Official refugee, asylum seeker and stateless population statistics by country of origin and asylum, back to 1951.

A public REST API serves population and solutions data as JSON; the refugees R package wraps it.

**Cost:** Free

## IOM Displacement Tracking Matrix {#source-52}

[International Organization for Migration](<https://dtm.iom.int>)

**Shelf:** Conflict, Rights & Humanitarian

Field-collected data on displaced populations — locations, numbers, needs — at site and admin level.

A public API serves admin-level datasets by country and round; bulk downloads available per operation.

**Cost:** Free

## Bellingcat Online Investigation Toolkit {#source-53}

[Bellingcat](<https://bellingcat.gitbook.io/toolkit>)

**Shelf:** Conflict, Rights & Humanitarian

A curated, maintained index of open-source investigation tools — geolocation, satellite, archives, transport tracking.

Browse by category; most entries are free web tools or open-source repos you can run yourself.

**Cost:** Free

## OpenSanctions {#source-54}

[OpenSanctions](<https://www.opensanctions.org>)

**Shelf:** Conflict, Rights & Humanitarian

Consolidated sanctions lists, politically exposed persons and watchlists from hundreds of sources, as structured entity data.

Bulk JSON and CSV downloads are free under CC BY-NC; a hosted matching API and commercial licence exist for business use.

**Cost:** Free (non-commercial)

## Forensic Architecture {#source-55}

[Goldsmiths, University of London](<https://forensic-architecture.org>)

**Shelf:** Conflict, Rights & Humanitarian

Investigations reconstructing human rights incidents from open sources, plus open-source tooling they build to do it.

Methods and some tools are published openly on GitHub — notably Timemap for building situated event timelines.

**Cost:** Free / open source

## GBIF {#source-56}

[Global Biodiversity Information Facility](<https://www.gbif.org>)

**Shelf:** Environment & Biodiversity

Over two billion species occurrence records contributed by museums, researchers and citizen scientists.

An open REST API for search and a download API for large extracts (free account needed for the latter). pygbif and rgbif wrap both.

**Cost:** Free

## IUCN Red List {#source-57}

[IUCN](<https://www.iucnredlist.org>)

**Shelf:** Environment & Biodiversity

Extinction risk assessments and range data for over 150,000 species.

Request a free API token, then query by species, country or category. Spatial range polygons are a separate download request.

**Cost:** Free (token)

## Protected Planet / WDPA {#source-58}

[UNEP-WCMC & IUCN](<https://www.protectedplanet.net>)

**Shelf:** Environment & Biodiversity

The World Database on Protected Areas — boundaries and attributes for every designated protected area on Earth.

Free API token for the REST API, or download monthly shapefile and GeoDatabase releases by country.

**Cost:** Free

## OpenAQ {#source-59}

[OpenAQ](<https://openaq.org>)

**Shelf:** Environment & Biodiversity

Aggregated air quality measurements from government and research monitoring stations worldwide, harmonised into one schema.

Free API key, then query measurements by location, parameter and date. The full archive is also mirrored on AWS Open Data.

**Cost:** Free

## Global Fishing Watch {#source-60}

[Global Fishing Watch](<https://globalfishingwatch.org>)

**Shelf:** Environment & Biodiversity

Vessel activity and apparent fishing effort derived from AIS tracking, plus port visits and encounters at sea.

Register for an API token, then use the vessels, events and 4Wings tile APIs. Map tiles can be layered directly in MapLibre.

**Cost:** Free for non-commercial

## Copernicus Marine Service {#source-61}

[Mercator Ocean / EU](<https://marine.copernicus.eu>)

**Shelf:** Environment & Biodiversity

Ocean physics and biogeochemistry — sea surface temperature, currents, sea level, chlorophyll — as analysis and forecast products.

Free account, then the copernicusmarine Python toolbox to subset and download NetCDF, or open datasets lazily over the ARCO/Zarr endpoints.

**Cost:** Free

## Global Flood Monitor / GloFAS {#source-62}

[European Commission JRC](<https://global-flood.emergency.copernicus.eu>)

**Shelf:** Environment & Biodiversity

Global flood forecasting and monitoring, including river discharge forecasts and rapid flood mapping.

Forecast data is distributed through the Climate Data Store API; flood extent layers come as WMS and downloadable rasters.

**Cost:** Free

## USGS Earthquake Hazards {#source-63}

[USGS](<https://earthquake.usgs.gov>)

**Shelf:** Environment & Biodiversity

Real-time global earthquake catalogue, shakemaps and hazard models.

The FDSN event API returns GeoJSON with no key; there are also live GeoJSON feeds updated every minute for direct map consumption.

**Cost:** Free

## WHO Global Health Observatory {#source-64}

[World Health Organization](<https://www.who.int/data/gho>)

**Shelf:** Health

Official global health statistics — mortality, disease burden, immunisation, health systems — by country and year.

The GHO OData API returns JSON by indicator code with no authentication. Athena API serves the same data in XML/CSV.

**Cost:** Free

## IHME Global Health Data Exchange {#source-65}

[Institute for Health Metrics and Evaluation](<https://ghdx.healthdata.org>)

**Shelf:** Health

Global Burden of Disease results — cause-specific mortality and disability for every country, age and sex, over decades.

Use the GBD Results Tool to build a query and export CSV; a results API is available for registered users.

**Cost:** Free

## HealthSites.io {#source-66}

[Healthsites / OSM community](<https://healthsites.io>)

**Shelf:** Health

An open, validated global registry of health facility locations built on OpenStreetMap.

Free API key, then a REST API returns facilities as GeoJSON by country or bounding box.

**Cost:** Free

## OpenFDA {#source-67}

[US Food and Drug Administration](<https://open.fda.gov>)

**Shelf:** Health

Drug adverse events, recalls, labelling and device reports as queryable open data.

Public JSON API with no key for light use; a free key raises the rate limit. Elasticsearch-style query syntax.

**Cost:** Free

## DHIS2 {#source-68}

[University of Oslo](<https://dhis2.org>)

**Shelf:** Health

The open-source health information platform used as the national system in over 80 countries.

Self-host or use the demo server; a comprehensive REST API covers data values, metadata and analytics for integration.

**Cost:** Free / open source

## UN Comtrade {#source-69}

[United Nations](<https://comtrade.un.org>)

**Shelf:** Economy, Trade & Corporate

Official bilateral trade statistics — who exports what to whom, by commodity code and year.

Free API key from the developer portal, then query by reporter, partner, period and HS code. Rate limits are tight on the free tier.

**Cost:** Free tier

## OpenCorporates {#source-70}

[OpenCorporates](<https://opencorporates.com>)

**Shelf:** Economy, Trade & Corporate

The largest open database of companies — legal entities, officers and filings from company registers worldwide.

REST API with a free key for public-interest and non-commercial use; bulk data under licence for commercial work.

**Cost:** Free tier, licensed above

## GLEIF {#source-71}

[Global Legal Entity Identifier Foundation](<https://www.gleif.org>)

**Shelf:** Economy, Trade & Corporate

The authoritative register of Legal Entity Identifiers, including parent and child ownership relationships.

A fully open REST API and daily bulk files — no key, no licence fee, CC0 licensed.

**Cost:** Free

## Open Ownership {#source-72}

[Open Ownership](<https://www.openownership.org>)

**Shelf:** Economy, Trade & Corporate

Beneficial ownership data — who ultimately controls companies — in a standard data format across jurisdictions.

Bulk downloads in the Beneficial Ownership Data Standard JSON; a register API for programmatic lookup.

**Cost:** Free

## Open Contracting Data Standard {#source-73}

[Open Contracting Partnership](<https://standard.open-contracting.org>)

**Shelf:** Economy, Trade & Corporate

A common schema for public procurement data, used by dozens of national and city contracting portals.

Publishers expose OCDS releases as JSON APIs or bulk files; Kingfisher tooling collects and normalises them for analysis.

**Cost:** Free

## IMF Data {#source-74}

[International Monetary Fund](<https://data.imf.org>)

**Shelf:** Economy, Trade & Corporate

Macroeconomic and financial statistics — balance of payments, government finance, exchange rates, WEO projections.

An SDMX JSON REST API by dataset and series key, no authentication required.

**Cost:** Free

## OECD Data Explorer {#source-75}

[OECD](<https://data-explorer.oecd.org>)

**Shelf:** Economy, Trade & Corporate

Comparable statistics across member and partner countries — labour, education, tax, environment, innovation.

SDMX REST API returning JSON or CSV; the OECD R and Python packages handle the query syntax.

**Cost:** Free

## NVD {#source-76}

[NIST](<https://nvd.nist.gov>)

**Shelf:** Security & Threat Data

The US National Vulnerability Database — CVE records enriched with CVSS scores, affected product identifiers and references.

CVE API 2.0 returns JSON; request a free API key to lift the rate limit substantially. Full JSON feeds are downloadable for offline use.

**Cost:** Free

## CISA KEV Catalog {#source-77}

[CISA](<https://www.cisa.gov/known-exploited-vulnerabilities-catalog>)

**Shelf:** Security & Threat Data

Vulnerabilities confirmed to be exploited in the wild — the single best free patch-prioritisation list.

One JSON or CSV file at a stable URL, updated as entries are added. No key, trivially automatable.

**Cost:** Free

## OSV {#source-78}

[Google / Open Source Security Foundation](<https://osv.dev>)

**Shelf:** Security & Threat Data

Vulnerability data for open-source packages, keyed precisely to affected versions across every major ecosystem.

A free REST API takes a package name and version and returns matching advisories. osv-scanner scans a lockfile or SBOM directly.

**Cost:** Free

## MITRE ATT&CK {#source-79}

[MITRE](<https://attack.mitre.org>)

**Shelf:** Security & Threat Data

The reference catalogue of real-world adversary tactics and techniques, with groups, software and mitigations mapped to each.

The full knowledge base is published as STIX 2.1 JSON on GitHub; the mitreattack-python library loads and queries it locally.

**Cost:** Free

## AlienVault OTX {#source-80}

[LevelBlue](<https://otx.alienvault.com>)

**Shelf:** Security & Threat Data

A community threat intelligence exchange — indicators grouped into pulses by contributors.

Free account gives an API key; the DirectConnect API pulls subscribed pulses and indicators as JSON.

**Cost:** Free

## abuse.ch {#source-81}

[abuse.ch / Spamhaus](<https://abuse.ch>)

**Shelf:** Security & Threat Data

Feeds of malware samples, botnet C2 servers, malicious URLs and SSL fingerprints — MalwareBazaar, ThreatFox, URLhaus.

Free API key per service, then simple POST queries returning JSON. Plain-text and CSV blocklists are also published for direct ingestion.

**Cost:** Free

## Shodan {#source-82}

[Shodan](<https://www.shodan.io>)

**Shelf:** Security & Threat Data

A search engine for internet-connected devices and exposed services, with banners, certificates and known vulnerabilities.

API key from a paid or academic account; the shodan Python library covers search, host lookup and streaming.

**Cost:** Paid, academic access available

## Have I Been Pwned {#source-83}

[Troy Hunt](<https://haveibeenpwned.com>)

**Shelf:** Security & Threat Data

Breach exposure lookup for email addresses and domains, plus a password-compromise check.

The Pwned Passwords range API is free and anonymous via k-anonymity; breach search by email needs a paid key.

**Cost:** Mixed

## Censys Search {#source-84}

[Censys](<https://search.censys.io>)

**Shelf:** Security & Threat Data

Continuously scanned inventory of internet hosts and certificates — useful for attack surface discovery.

Free tier API credentials allow a modest query volume; the REST API and Python client support structured host and certificate search.

**Cost:** Free tier, paid above

## CIS Benchmarks {#source-85}

[Center for Internet Security](<https://www.cisecurity.org/cis-benchmarks>)

**Shelf:** Security & Threat Data

Consensus secure configuration baselines for operating systems, cloud platforms, databases and browsers.

Free PDF download after registration; automated assessment content and hardened images are membership or paid.

**Cost:** Free (PDFs)

## QGIS {#source-86}

[OSGeo](<https://qgis.org>)

**Shelf:** Geospatial Tooling

The full open-source desktop GIS — analysis, cartography, georeferencing, and a large plugin ecosystem.

Install and open. Connects directly to PostGIS, WMS/WFS services and cloud-optimised GeoTIFFs over HTTP; scriptable in Python via PyQGIS.

**Cost:** Free / open source

## GDAL / OGR {#source-87}

[OSGeo](<https://gdal.org>)

**Shelf:** Geospatial Tooling

The translation layer underneath almost every geospatial tool — reads and writes several hundred raster and vector formats.

Command line (gdal_translate, ogr2ogr) or bindings in Python, R and Node. The /vsicurl/ prefix reads remote files without downloading them.

**Cost:** Free / open source

## PostGIS {#source-88}

[OSGeo](<https://postgis.net>)

**Shelf:** Geospatial Tooling

Spatial extension for PostgreSQL — geometry types, spatial indexes and hundreds of analysis functions in SQL.

CREATE EXTENSION postgis on any Postgres instance, then load data with ogr2ogr or shp2pgsql.

**Cost:** Free / open source

## STAC {#source-89}

[STAC community](<https://stacspec.org>)

**Shelf:** Geospatial Tooling

SpatioTemporal Asset Catalog — the common JSON standard for describing and searching satellite imagery archives.

Learning one STAC API means you can query Copernicus, Planetary Computer, Earth Search and dozens more the same way. Use pystac-client.

**Cost:** Free / open standard

## Cloud-Optimised GeoTIFF {#source-90}

[COG community](<https://www.cogeo.org>)

**Shelf:** Geospatial Tooling

A GeoTIFF layout that lets clients read just the tiles they need over HTTP range requests, with no server-side software.

Serve a COG from static hosting and read windows of it with rasterio or GDAL — the key to cheap, serverless imagery pipelines.

**Cost:** Free / open standard

## Rasterio & Shapely {#source-91}

[Open source](<https://rasterio.readthedocs.io>)

**Shelf:** Geospatial Tooling

The Python workhorses for reading raster data and manipulating vector geometry respectively.

pip install rasterio shapely geopandas. GeoPandas ties them together with a familiar DataFrame interface.

**Cost:** Free / open source

## Titiler {#source-92}

[Development Seed](<https://developmentseed.org/titiler/>)

**Shelf:** Geospatial Tooling

A dynamic tile server that turns any cloud-optimised GeoTIFF or STAC item into XYZ map tiles on the fly.

Run the Docker image or deploy to Lambda, then request /cog/tiles/{z}/{x}/{y} with a url parameter pointing at your raster.

**Cost:** Free / open source

## Kepler.gl / deck.gl {#source-93}

[OpenJS Foundation / Uber](<https://deck.gl>)

**Shelf:** Geospatial Tooling

WebGL layers for rendering very large geospatial datasets in the browser — millions of points, arcs, hexbins and trips.

npm install deck.gl and compose layers over a MapLibre basemap. Kepler.gl is the no-code application built on top of it.

**Cost:** Free / open source

## DuckDB Spatial {#source-94}

[DuckDB Foundation](<https://duckdb.org/docs/extensions/spatial>)

**Shelf:** Geospatial Tooling

An in-process analytical database that queries GeoParquet, GeoJSON and shapefiles directly, including files on S3.

INSTALL spatial; LOAD spatial; then query remote Parquet with SQL. The fastest route into Overture data with no infrastructure.

**Cost:** Free / open source

## OpenLayers {#source-95}

[OSGeo](<https://openlayers.org>)

**Shelf:** Geospatial Tooling

A mature JavaScript mapping library with unusually strong support for OGC services, projections and raster analysis.

npm install ol. Better than Leaflet when you need WMTS, WFS, reprojection or non-Mercator coordinate systems.

**Cost:** Free / open source

## Development Seed Community {#source-96}

[Development Seed](<https://developmentseed.org/community/>)

**Shelf:** Communities & Programmes

The open-source geospatial community around Development Seed — the team behind STAC tooling, Titiler, eoAPI and much NASA and World Bank open data infrastructure.

Follow their open repositories on GitHub, join the community calls and Slack, and reuse their STAC and tiling stacks directly in your own projects.

**Cost:** Free

## Humanitarian OpenStreetMap Team {#source-97}

[HOT](<https://www.hotosm.org>)

**Shelf:** Communities & Programmes

Coordinates volunteer mapping of unmapped, vulnerable places, and builds the open tooling to do it.

Map through the Tasking Manager, or use their open tools — the Export Tool for custom OSM extracts and OpenAerialMap for imagery.

**Cost:** Free

## Open Data Kit / KoboToolbox {#source-98}

[ODK / Kobo Inc.](<https://www.kobotoolbox.org>)

**Shelf:** Communities & Programmes

Offline-first mobile data collection for field research and humanitarian assessment, used across the aid sector.

Free hosted server for humanitarian users, or self-host. A REST API exposes submissions as JSON, CSV or GeoJSON for downstream pipelines.

**Cost:** Free tier

## OpenStreetMap Foundation community {#source-99}

[OSMF](<https://community.openstreetmap.org>)

**Shelf:** Communities & Programmes

The forum where OSM tagging, imports and local mapping conventions are actually decided.

Read before importing anything at scale — imports without community agreement get reverted.

**Cost:** Free

## OSGeo {#source-100}

[Open Source Geospatial Foundation](<https://www.osgeo.org>)

**Shelf:** Communities & Programmes

The umbrella foundation behind QGIS, GDAL, PostGIS, GeoServer and much of the open geospatial stack.

Project directories, the OSGeoLive bootable distribution with everything preinstalled, and local chapters worldwide.

**Cost:** Free

## Radiant Earth / Source Cooperative {#source-101}

[Radiant Earth](<https://source.coop>)

**Shelf:** Communities & Programmes

A publishing platform for open geospatial data, hosting large public datasets with permanent, citable access.

Browse repositories and read data directly from S3-compatible endpoints; many are STAC-catalogued.

**Cost:** Free

## Open Knowledge Foundation {#source-102}

[OKFN](<https://okfn.org>)

**Shelf:** Communities & Programmes

Long-running advocates for open data, and stewards of CKAN, Frictionless Data and the Open Definition.

CKAN powers many national data portals, so learning its API unlocks a great many catalogues at once.

**Cost:** Free

## Datasette {#source-103}

[Simon Willison](<https://datasette.io>)

**Shelf:** Communities & Programmes

A tool for publishing any SQLite database as a browsable, queryable website with a JSON API for free.

pip install datasette, point it at a .db file, deploy anywhere. The fastest way to turn a CSV into a public API.

**Cost:** Free / open source

## OpenSSF {#source-104}

[Open Source Security Foundation](<https://openssf.org>)

**Shelf:** Communities & Programmes

The cross-industry body working on open-source supply chain security — Scorecard, Sigstore, SLSA, OSV.

Run Scorecard against your own repository for an immediate baseline, and use Sigstore to sign releases without managing keys.

**Cost:** Free

## Zenodo {#source-105}

[CERN](<https://zenodo.org>)

**Shelf:** Communities & Programmes

Open repository for research data and software, issuing a permanent DOI for anything you deposit.

A REST API supports programmatic deposit; connect a GitHub repo and every release is archived and given a DOI automatically.

**Cost:** Free
