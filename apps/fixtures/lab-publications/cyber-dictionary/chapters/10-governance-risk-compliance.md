# 10. Governance, Risk & Compliance {#governance-risk-compliance}

## CIA triad {#term-10-1}

*Confidentiality, Integrity, Availability*

The three properties security exists to protect. Most controls trade one against another, and naming which one you are protecting sharpens the argument.

## Non-repudiation {#term-10-2}



Being able to prove someone took an action so they cannot credibly deny it. What signatures and tamper-evident logs provide.

## Defence in depth {#term-10-3}



Layering independent controls so no single failure is fatal. Assumes each layer will eventually fail, because it will.

## Risk appetite / tolerance {#term-10-4}



How much risk leadership is willing to accept. Without it stated, every risk decision becomes an argument.

## Risk register {#term-10-5}



The recorded list of known risks with owners, ratings, and treatment. Useful when actively reviewed, decorative when not.

## Risk treatment {#term-10-6}

*Accept, mitigate, transfer, avoid*

The four things you can do about a risk. Accepting is legitimate — provided someone with authority signs it.

## Inherent vs residual risk {#term-10-7}



Risk before controls versus what remains after them. Residual risk is the number leadership should actually be shown.

## Control {#term-10-8}



A safeguard reducing risk. Categorised as preventive, detective, or corrective, and as technical, administrative, or physical.

## Compensating control {#term-10-9}



An alternative measure when the required control is not feasible. Must genuinely meet the intent, not merely be documented as if it does.

## Policy / standard / procedure {#term-10-10}



Policy states intent, standards set specific requirements, procedures give the steps. Collapsing them into one document is why nobody follows any of them.

## ISO/IEC 27001 {#term-10-11}



The international standard for an information security management system, and certifiable. It assesses the management system, not the technical strength.

## NIST CSF {#term-10-12}

*NIST Cybersecurity Framework*

A voluntary framework organised around Govern, Identify, Protect, Detect, Respond, Recover. Widely used as a common structure for maturity conversations.

## NIST SP 800-53 / 800-171 {#term-10-13}



Detailed US federal control catalogues — 800-53 for federal systems, 800-171 for contractors handling controlled unclassified information.

## SOC 2 {#term-10-14}



An audit report on a service provider's controls against trust criteria. Type I is a point in time; Type II covers a period and is the one to ask for.

## PCI DSS {#term-10-15}

*Payment Card Industry Data Security Standard*

Mandatory rules for anyone handling payment card data. Contractual rather than statutory, and enforced by fines and lost processing rights.

## GDPR {#term-10-16}

*General Data Protection Regulation*

The EU regulation governing personal data. Extraterritorial, principles-based, and backed by fines up to four percent of global turnover.

## Personal data / PII {#term-10-17}

*Personally Identifiable Information*

Data relating to an identifiable person. GDPR's definition is deliberately broad and includes IP addresses and device identifiers.

## Special category data {#term-10-18}

*Sensitive personal data*

Health, biometrics, ethnicity, religion, sexuality, politics, union membership. Higher legal protection and higher real-world harm if exposed.

## Lawful basis {#term-10-19}



The legal justification for processing personal data — consent, contract, legal obligation, vital interests, public task, legitimate interests.

## Data minimisation {#term-10-20}



Collect only what you need and keep it only as long as you need it. The control that shrinks breach impact more than any tool.

## Purpose limitation {#term-10-21}



Data collected for one stated purpose may not be quietly reused for another. The principle most often broken by analytics and AI training.

## Data subject rights {#term-10-22}

*DSAR*

Individuals' rights to access, correct, delete, or port their data, with statutory response deadlines.

## DPIA {#term-10-23}

*Data Protection Impact Assessment*

A required assessment before high-risk processing, documenting risks to people and how they are mitigated. Best done at design, not sign-off.

## Privacy by design {#term-10-24}



Building privacy protections into a system from the start, with privacy-protective defaults. A GDPR obligation, not a philosophy.

## Anonymisation vs pseudonymisation {#term-10-25}



Anonymised data cannot be linked back and leaves scope; pseudonymised data can be re-linked with a key and is still personal data.

## Re-identification {#term-10-26}



Reconnecting supposedly anonymous records to people, usually by combining datasets. The reason true anonymisation is much harder than it sounds.

## Differential privacy {#term-10-27}



Adding calibrated statistical noise so aggregate results are useful while no individual's presence can be inferred.

## Breach notification {#term-10-28}



The legal duty to report certain breaches within a deadline — 72 hours to a regulator under GDPR, and to affected people if the risk is high.

## Data classification {#term-10-29}



Labelling data by sensitivity so handling rules can follow the label. Three or four tiers work; ten do not.

## DLP {#term-10-30}

*Data Loss Prevention*

Tooling that spots and blocks sensitive data leaving. Good at accidents, weak against a determined insider.

## Retention schedule {#term-10-31}



How long each category of data is kept before deletion. Data you deleted on schedule cannot be breached or subpoenaed.

## Third-party risk {#term-10-32}

*TPRM / vendor risk*

Managing the risk suppliers introduce. You can outsource the processing, but not the accountability.

## Due diligence {#term-10-33}



Assessing a supplier's security before signing. Questionnaires are the norm; evidence and audit rights are what actually matter.

## SBOM {#term-10-34}

*Software Bill of Materials*

A machine-readable inventory of components in a piece of software. Turns a new vulnerability disclosure into a lookup rather than a scramble.

## CVE / CVSS {#term-10-35}

*Common Vulnerabilities and Exposures / Scoring System*

CVE is the unique identifier for a known flaw; CVSS scores its severity out of ten. CVSS ignores your context, so it is an input, not a decision.

## KEV {#term-10-36}

*Known Exploited Vulnerabilities catalogue*

CISA's list of vulnerabilities confirmed exploited in the wild. A far better patching priority than CVSS score alone.

## EPSS {#term-10-37}

*Exploit Prediction Scoring System*

A probability that a vulnerability will be exploited in the next 30 days. Pairs well with CVSS to cut patch backlogs to something achievable.

## Audit trail {#term-10-38}



A tamper-evident record of who did what and when. Required by most frameworks and indispensable during an investigation.

## Segregation of duties {#term-10-39}

*SoD*

Splitting a sensitive process so no one person can complete it alone. The standard control against both fraud and single-point mistakes.

## Security awareness training {#term-10-40}



Teaching staff to recognise and report attacks. Effective when it is short, frequent, and safe to report to; useless as an annual slideshow.
