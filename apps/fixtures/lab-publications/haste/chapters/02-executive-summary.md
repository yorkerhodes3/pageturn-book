<!-- GENERATED from https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/b456e8e137a0b6ce9a51799b71c6091f5241b5d7/src/content/publications/haste.ts at b456e8e137a0b6ce9a51799b71c6091f5241b5d7; do not edit. -->

# 01. Executive Summary {#executive-summary}

HASTE is a web-based platform that turns post-disaster satellite imagery into an estimate of which individual buildings have been damaged. It was developed by the Microsoft AI for Good Lab and released as open-source software under the MIT licence. The version reviewed here is the copy held in the Ethical Tech CoLab repository, which is a fork of the original project at microsoft/haste.

The platform's central design choice is to train a fresh model for each disaster rather than maintain one global model that tries to recognise damage everywhere. A hurricane in Jamaica and an earthquake in Türkiye leave visually different traces on visually different building stock, and a model tuned to one is not expected to work on the other. HASTE accepts that limitation deliberately in exchange for speed: a model fitted to one event, from one analyst's labels, can be ready in minutes.

A human being is required at every stage, and there is no automatic mode. The project documentation states repeatedly that outputs are preliminary signals requiring expert validation rather than authoritative damage assessments. Section 09 sets out where the human sits in the workflow.

HASTE offers two routes from imagery to an answer. The faster route, Rapid Building Assessment, computes a numerical fingerprint for every building in the area, asks the analyst to label a handful of them, and trains a very small classifier inside the web browser, which scores all the rest in seconds. The slower route, Damage Mapping, asks the analyst to draw damaged and undamaged areas by hand and trains a full image-segmentation model on a graphics processor, producing a continuous, pixel-level damage map.

Both routes end at the same place: a per-building damage figure, a set of accuracy measures computed against a human-labelled validation sample, and an estimate of the total number of damaged buildings with a stated margin of error.

The platform depends on outside data it does not produce. Imagery comes from commercial and public providers such as Planet, Maxar, Airbus, the European Union's Copernicus programme, and the United States National Oceanic and Atmospheric Administration. Building outlines come from the Overture Maps Foundation. Where those outlines are missing or wrong, HASTE has nothing to attach its predictions to.

According to the research paper published alongside the platform, HASTE has been used in thirty-one field deployments since early 2023, and its outputs have been released openly through the Humanitarian Data Exchange.
