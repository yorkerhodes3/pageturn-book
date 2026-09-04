<!-- GENERATED from https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/b456e8e137a0b6ce9a51799b71c6091f5241b5d7/src/content/publications/cerai.ts at b456e8e137a0b6ce9a51799b71c6091f5241b5d7; do not edit. -->

# 07. Connections to Live Data {#live-data}

To move beyond manual entry, the prototype connects to several external, publicly available data sources.

- Location look-up, using Nominatim and OpenStreetMap, converts a place name into coordinates.
- Weather, using Open-Meteo, retrieves current weather conditions for the assessed location.
- Conflict events, using ACLED, retrieves recorded conflict-event data, which can drive a data-based trajectory calculation.
- News signals, using GDELT, surface recent news articles relevant to the location.

The documentation also describes planned future connections to established humanitarian data systems, including UN OCHA and ReliefWeb access monitoring, the EU Global Conflict Risk Index, FEWS NET and IPC food-security data, and the INFORM Severity Index, as pathways to make the tool more automatically data-driven over time.

Each manually entered figure can also be tagged with a source credibility level, ranging from unverified, through media and NGO reporting, to UN and ICRC verified, and with a data-freshness indicator, so that the reliability and age of the underlying evidence are visible in the assessment itself.
