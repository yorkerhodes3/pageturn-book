<!-- GENERATED from https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/b456e8e137a0b6ce9a51799b71c6091f5241b5d7/src/content/publications/haste.ts at b456e8e137a0b6ce9a51799b71c6091f5241b5d7; do not edit. -->

# 07. Data Sources {#data-sources}

**Imagery.** HASTE holds no imagery of its own; the analyst supplies it. Only GeoTIFF files are accepted. The documentation records that in past activations imagery has come from the following providers.

- Planet, a commercial operator of a large constellation of small satellites that publishes disaster imagery openly.
- Maxar, now Vantor, a commercial provider of high-resolution imagery with its own open data programme for disasters.
- The Airbus Foundation.
- Sentinel-1 and Sentinel-2, the radar and optical satellites of the European Union's Copernicus programme, whose data is free to all.
- Products from the Copernicus Emergency Management Service.
- Aerial imagery from the United States National Oceanic and Atmospheric Administration.

The software itself has no live connection to any of these providers. Placeholder functions for fetching imagery directly from Maxar and Planet exist in the code but are empty. In practice the analyst supplies a link to a file, and for security reasons those links may point only at Azure Blob Storage or Amazon S3, the two hosting services on the platform's permitted list. Public disaster imagery from the major providers is generally published on one of those, which is why the restriction is workable.

HASTE does adjust for the provider in one respect. Different satellites record their colour bands in different orders, and some record bands the human eye cannot see, so the platform holds a lookup table of band orders for Planet Scope, Planet Skysat, Maxar, Sentinel-2, and one partner-specific format, and uses it to assemble a correct colour picture. Where the source is unknown, HASTE falls back to the labels embedded in the file, and failing that assumes the first three bands are red, green, and blue.

**Building outlines.** Overture Maps by default, described in section 04, and analyst-supplied outlines where better local data exists. HASTE reads the Overture data anonymously from a public store, taking the most recent release available and falling back to a fixed February 2026 release if it cannot determine one. Only polygons are kept.

**What HASTE does not use.** The platform draws on imagery and building outlines and nothing else. It does not read ground reports, weather data, sensor networks, social media, or population figures. Its picture of a disaster is strictly what a camera in orbit could see, which is a narrower thing than what happened.

**Personal data.** The platform is not designed to identify people, does not ingest or output personal data, and does not treat person-scale features in imagery as signal.
