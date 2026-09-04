<!-- GENERATED from https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/b456e8e137a0b6ce9a51799b71c6091f5241b5d7/src/content/publications/after-the-corridor.ts at b456e8e137a0b6ce9a51799b71c6091f5241b5d7; do not edit. -->

# 07. Vulnerable Populations, Digital Identity Risk, and Mitigation {#digital-identity-risk}

**The Rohingya precedent.** Refugees are an exceptionally vulnerable group whose personal data demands unusual rigor, and the technology that most tempts humanitarian builders, a comprehensive digital identity for displaced people, is the one this team refuses to build. The evidence is documented rather than hypothetical. Human Rights Watch found that biometric and biographic data collected from Rohingya refugees in Bangladesh was shared onward, ultimately reaching Myanmar, the government they had fled, for the purpose of assessing repatriation eligibility, covering some 830,000 people between 2018 and 2021, without the full data-protection impact assessment UNHCR's own policy requires and without meaningful informed consent.

Consent in that system was structurally compromised. Refugees were told that aid depended on their registration, which makes agreement coerced rather than free. Consent materials were commonly presented in English, a language many of those required to register did not read, and reporting indicates that families who refused enrollment were cut off from food and services. The defining property of the harm is its irreversibility. Biometrics are sticky; an iris cannot be reissued once it is compromised, and a database built to facilitate solutions suffered precisely the function creep that critics had predicted, as data gathered for one stated purpose was repurposed for another.

Mitigation is mostly refusal, then minimization, and it can be stated as a small number of firm commitments.

- Do not build biometric identity. A category refusal, encoded as a versioned decision pattern in the CoLab's open schema, DDC-0001, biometric registration of displaced populations.
- Decouple entitlement from identity: access gated by the thinnest credential, never by who you are proven biometrically.
- Data minimization and purpose limitation: least data, single stated purpose, no secondary use or third-party transfer, as a matter of design rather than policy alone.
- Individual control and local governance: the person holds and selectively presents any credential; refugee-led and local actors govern the data.
- Real consent or none: if consent cannot be free and informed, whether because aid is conditioned on it or because a language or power gap cannot be bridged, treat it as absent and do not proceed.
- Mandatory pre-collection data-protection impact assessment and community consultation: the omitted step whose absence produced the Rohingya harms.

For a funder, this refusal is an asset. A responsible-AI lab that can name the one thing it will not build, and cite exactly why, is more credible than one that promises everything.
