<!-- GENERATED from https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/b456e8e137a0b6ce9a51799b71c6091f5241b5d7/src/content/publications/haste.ts at b456e8e137a0b6ce9a51799b71c6091f5241b5d7; do not edit. -->

# 11. Practical Nature of the Platform {#practical-nature}

HASTE is a full web application rather than a single page or a script. It consists of a browser interface, a set of programming interfaces that the browser front end calls, background workers that handle long jobs such as preparing imagery and training models, a tile server that streams large satellite images into the map view, and a shared Python library holding the analysis logic.

It can be run in two ways. A complete local instance can be started on one machine using Docker, a tool that packages software with everything it needs to run, which requires no cloud account and is intended for evaluation. A production instance is deployed to Microsoft Azure with a single command, and the deploying organisation controls it entirely.

The local configuration is explicitly flagged as unsuitable for production, since it disables authentication and uses an in-memory storage emulator. A separate hardening checklist is provided for real deployments.

The repository shows active and careful security practice, including automated code scanning and secret scanning, and documented handling of known vulnerabilities in the underlying geospatial libraries where a patched version was not available. Sample data from Hurricane Melissa and the Lahaina wildfire is published so that the platform can be tried without sourcing imagery first.
