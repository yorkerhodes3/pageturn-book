# 9. Defense & Operations {#defense-operations}

## SOC {#term-9-1}

*Security Operations Centre*

The team and tooling that monitor, triage, and respond to security events. In-house, outsourced, or a mix.

## SIEM {#term-9-2}

*Security Information and Event Management*

Central log collection, correlation, and alerting. Only as good as the sources feeding it and the rules written on top.

## SOAR {#term-9-3}

*Security Orchestration, Automation and Response*

Automating repetitive response steps through playbooks — enrich, contain, notify — so analysts handle the judgement calls.

## Detection engineering {#term-9-4}



Treating detections as code: written, tested, version-controlled, and measured. The shift from buying alerts to building them.

## Detection as code {#term-9-5}



Managing detection rules in a repository with review and CI, so changes are traceable and testable like any other software.

## Sigma {#term-9-6}



A vendor-neutral format for writing detection rules that can be converted to run on different SIEMs. The shared language for sharing detections.

## YARA {#term-9-7}



A pattern-matching language for identifying malware families by content. Widely used in threat hunting and malware triage.

## True / false positive {#term-9-8}



A real detection versus a false alarm. False positive volume, not detection coverage, is what usually breaks a SOC.

## Alert fatigue {#term-9-9}



Analysts becoming numb to alerts through sheer volume. The mechanism by which a genuine alert is closed unread.

## Triage {#term-9-10}



Rapidly deciding whether an alert is real and how urgent. The gatekeeping step between monitoring and incident response.

## Threat hunting {#term-9-11}



Proactively searching for intrusions that no alert fired on, driven by a hypothesis rather than a queue.

## Incident response {#term-9-12}

*IR*

The structured process of handling a confirmed security incident. Usually framed as prepare, detect, contain, eradicate, recover, learn.

## Containment {#term-9-13}



Stopping an incident spreading — isolating hosts, disabling accounts, blocking traffic — before removing the attacker.

## Eradication {#term-9-14}



Removing the attacker's access completely: malware, backdoors, added accounts, altered configuration, rogue tokens.

## Recovery {#term-9-15}



Bringing systems back into service safely and confirming the environment is clean. Restoring too early reinfects everything.

## Post-incident review {#term-9-16}

*Lessons learned, blameless postmortem*

Examining what happened and why, without hunting individuals. Blame guarantees the next incident is reported late or not at all.

## Playbook / runbook {#term-9-17}



Written steps for a specific scenario. Their real value is that they work at three in the morning when nobody is thinking clearly.

## Tabletop exercise {#term-9-18}



A discussion-based rehearsal of an incident scenario. Cheap, and reliably exposes decision-making and communication gaps.

## Chain of custody {#term-9-19}



Documented handling of evidence from collection onwards. Break it and the evidence may be worthless in a legal proceeding.

## Digital forensics {#term-9-20}

*DFIR*

Recovering and analysing digital evidence to establish what happened. Paired with incident response as one discipline.

## Order of volatility {#term-9-21}



Collect the most perishable evidence first — memory, then network state, then disk. Pulling the plug destroys the most useful data.

## Memory forensics {#term-9-22}



Analysing RAM for injected code, decrypted secrets, and running processes that never touched disk. Often the only place fileless malware exists.

## Timeline analysis {#term-9-23}



Building an ordered sequence of events across sources to reconstruct an intrusion and find the initial access point.

## Log retention {#term-9-24}



How long logs are kept. Intrusions are often found months later, so short retention quietly makes investigation impossible.

## Telemetry {#term-9-25}



The raw signals systems emit. Detection is limited by telemetry — you cannot alert on something nobody records.

## Baseline / anomaly detection {#term-9-26}



Learning what normal looks like and alerting on deviation. Catches novel attacks and generates plenty of noise doing it.

## UEBA {#term-9-27}

*User and Entity Behaviour Analytics*

Behavioural profiling of users and machines to spot compromised accounts and insiders acting out of character.

## Deception technology {#term-9-28}

*Honeypot, canary token*

Fake systems, files, or credentials that nothing legitimate should ever touch. Very low false-positive rate when they trigger.

## Vulnerability management {#term-9-29}



Finding, prioritising, fixing, and verifying vulnerabilities as a continuous cycle. Prioritisation is the hard part, not scanning.

## Vulnerability scanner {#term-9-30}



A tool that checks systems against a database of known flaws. Reports what might be vulnerable, not what is exploitable in your context.

## Attack surface management {#term-9-31}

*ASM / EASM*

Continuously discovering what of yours is exposed to the internet, including assets nobody remembered owning.

## Purple teaming {#term-9-32}



Red and blue working together, running known techniques to check whether detection actually fires. Improvement rather than scorekeeping.

## Breach and attack simulation {#term-9-33}

*BAS*

Automated, continuous safe replay of attack techniques to validate that controls and detections still work after changes.

## MTTD / MTTR {#term-9-34}

*Mean Time to Detect / Respond*

How long detection and response take on average. The two operational metrics that most reflect real-world damage.

## Runbook automation {#term-9-35}



Turning repeated manual response steps into scripts or workflows. Consistency under pressure, and a free audit trail.

## On-call / escalation {#term-9-36}



Defined rotas and paths for raising an incident out of hours. An unclear escalation path costs more time than any tool saves.

## Crisis communications {#term-9-37}



Deciding in advance who says what to staff, customers, regulators, and press. Prepared badly, it turns an incident into a reputational event.

## Business continuity {#term-9-38}

*BCP*

How the organisation keeps operating during disruption, including manual fallbacks. Broader than technical disaster recovery.
