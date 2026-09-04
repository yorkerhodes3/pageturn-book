<!-- GENERATED from https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/b456e8e137a0b6ce9a51799b71c6091f5241b5d7/src/content/publications/erus.ts at b456e8e137a0b6ce9a51799b71c6091f5241b5d7; do not edit. -->

# 08. Grounding in Humanitarian Standards and Law {#grounding}

The tool's own source table is explicit about a boundary that matters. No real dataset is used anywhere. The sources listed inform the design of the model, meaning which factors exist, which are gatekeepers, and where thresholds come from. They do not supply data.

The sources the tool names are as follows.

- The Sphere Handbook, fourth edition, 2018, behind the Shelter and Food and water factors. Sphere is a voluntary set of minimum standards for humanitarian response, developed by a coalition of humanitarian organisations. The two figures the tool cites from it are accurate: a minimum of 15 litres of water per person per day, and 3.5 square metres of covered living space per person.
- The UNHCR Handbook for Emergencies, third edition, 2007. An earlier version of the tool cited this as the origin of the forty per cent minimum readiness threshold. That attribution has since been withdrawn as incorrect, since readiness is a construct internal to the tool. The handbook is retained for what it does support, informing which readiness factors are worth modelling, and the threshold itself is treated in this report as an unsourced modelling assumption.
- Inter-Agency Standing Committee guidance from 2007, cited behind the Authority consent gatekeeper. The Inter-Agency Standing Committee is the main coordination forum of the United Nations and non-governmental humanitarian system. Its guidance in this area establishes that humanitarian operations require the consent of the host government, which is the principle the gatekeeper encodes.
- Additional Protocol I to the Geneva Conventions, 1977, Articles 12 and 58, behind the Medical capacity and Security factors. Article 12 protects medical units from attack. Article 58 requires parties to a conflict to take precautions to protect civilians under their own control from the effects of attacks.
- An ICRC publication from 2013 on violence and the use of force, cited as grounding the Security gatekeeper. The ICRC is the International Committee of the Red Cross, the body with a specific mandate under the Geneva Conventions.
- Park and Miller, 1988, for the random number generator, which is a computing citation rather than a humanitarian one.

A reader should treat these citations as the origin of design choices rather than as validation of the numbers. The tool does not claim that Sphere endorses a weight of 2 for gatekeepers, and it should not be read as claiming so.
