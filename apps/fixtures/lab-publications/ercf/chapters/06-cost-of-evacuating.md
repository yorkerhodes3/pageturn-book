<!-- GENERATED from https://raw.githubusercontent.com/Ethical-Tech-CoLab/website/b456e8e137a0b6ce9a51799b71c6091f5241b5d7/src/content/publications/ercf.ts at b456e8e137a0b6ce9a51799b71c6091f5241b5d7; do not edit. -->

# 06. The Cost of Evacuating: Every Variable Explained {#cost-of-evacuating}

This is the part of the tool with the strongest evidentiary foundation. The planner supplies four things: the population at risk, the percentage of that population who are vulnerable, the distance in kilometres to safety, and the terrain quality. Everything else is derived.

The population is split into vulnerable and non-vulnerable. Non-vulnerable people are assigned to standard buses at 50 people per bus. Vulnerable people are assigned to medical buses at 20 people per bus, and ambulances at one per 150 vulnerable people. The bus capacities are marked in the code as operational assumptions not validated against field data. The ambulance ratio has a history worth recording: it was originally set at one ambulance per 40 vulnerable people, and was revised to one per 150 after the author found that no published field standard exists at all and that the original figure was three to five times above what documented practice, in particular a study of the Kosovo operation, actually showed.

The number of medical buses and ambulances is then multiplied by a factor derived from D2, the mobility dimension. At D2 of 1 the factor is 0.8, at 2 it is 1.0, at 3 it is 1.3, at 4 it is 1.8, and at 5 it is 2.5. In plain terms, a population with severe mobility constraints needs roughly two and a half times the assisted transport of a baseline population. This factor is described in the code as estimated with no primary source.

Staffing is set by ratio, and the security ratio tightens sharply as danger rises. The medical staffing figure is the Sphere Handbook 2018 standard for clinical officers in emergency settings, and it was corrected upward during development: an earlier version used one per 500, half the Sphere standard, with no documented justification.

**Daily rates are total cost to the operation, not take-home pay. All four are tagged as estimated.**

| Role | Allocation | Daily rate, US dollars |
| --- | --- | --- |
| Security | none at Level 0, one per 500 civilians at Level 1, per 200 at Level 2, per 100 at Level 3, per 50 at Level 4 | 300 |
| Medical staff | one per 250 people | 200 |
| Paramedics | one per 100 people | 150 |
| Drivers | one per vehicle | 50 |

The code carries an unusually candid note about the rates: every rate implicitly assumes national staff or a lower-cost international non-governmental deployment at roughly the level of Médecins Sans Frontières, and full United Nations international professional staff, once daily subsistence allowance and danger pay are included, would cost three to six times more. The author records that this assumption is not stated in the interface and should be flagged.

Water is calculated at 20 litres per person per day for three days. This is the UNHCR full planning standard, chosen deliberately over the Sphere emergency minimum of 7.5 to 15 litres because an evacuation is a planned operation rather than a first-response emergency. Food is calculated at 0.45 kilograms of dry food per person per day for three days, which is the dry-weight equivalent of the Sphere minimum of 2,100 kilocalories per person per day. Tents are provided at one per five people, which at the Sphere standard of 3.5 square metres per person gives 17.5 square metres per tent and is internally consistent. Basic medical kits are provided at one per 100 people, and trauma kits at one per 50 people when the risk level is 3 or above, or one per 200 otherwise. Radios are provided at one per five vehicles plus a fixed five for coordination.

The unit costs applied to those quantities are set out below, each with the evidence the project records behind it. Fuel is the one line with a consumption figure of its own: it is calculated at 0.35 litres per kilometre per vehicle for a return journey before the per-litre price is applied.

| Item | Unit cost | Evidence recorded in the code |
| --- | --- | --- |
| Standard bus | 200 US dollars each |  |
| Medical bus | 400 US dollars each | Revised upward after research found no primary source for the earlier value; sits at the lower bound of documented field ranges for medically-equipped vehicles. |
| Ambulance | 700 US dollars each | Revised upward on the same basis as the medical bus. |
| Fuel | 1.20 US dollars per litre | Revised down from 1.50 on the basis of ACAPS reporting of Yemeni consumer fuel prices in 2022. |
| Food | 3 US dollars per kilogram | Flagged by the project's own parameter registry as having no citation behind it, even though the quantity does. |
| Water | 0.05 US dollars per litre | Field evidence gathered in 2026 found real water trucking costs of 2 to 23 US dollars per cubic metre, all below the model's baseline; the lower figures were not adopted pending further validation. |
| Tent | 380 US dollars each | Raised from an earlier 150 once that figure was found to describe a tarpaulin kit suitable for a week rather than a standard tent; 380 sits just below the 400 dollar replacement cost UNHCR gave publicly in 2022. |
| Basic medical kit | 21 US dollars | Derived from the WHO and UNICEF Interagency Emergency Health Kit costing, revised down from an earlier 50 that was roughly seven times too high for a three-day convoy. |
| Trauma kit | 200 US dollars | Unvalidated. The ICRC does not publish per-kit pricing. |
| Radio | 500 US dollars each | Within the documented procurement range for professional handheld VHF units. |

Three multipliers are applied on top. Terrain multiplies transport and fuel costs, with five levels running from 4.0 for the worst terrain down to 1.0 for the best, and 2.5, 1.7 and 1.2 in between. The lower end of this range is consistent with published road-condition cost models; the upper end of 4.0 is an expert estimate consistent with a World Food Programme figure showing per-tonne delivery costs in the Central African Republic, South Sudan and the Democratic Republic of the Congo running about five times a standard country average, though that figure mixes terrain, access and security together.

Season adjusts terrain further. If the operation starts in a month the tool classifies as a closure period for that latitude, the terrain multiplier is boosted by 50 per cent for the worst terrain, 30 per cent for the second worst and 20 per cent for middling terrain. Closure periods are set by latitude: December to March above 30 degrees north, June to September below 30 degrees south, and April to October in the tropics for wet season. The author describes these as broad regional approximations. The most useful output here is not the cost boost but a flag: the worst terrain in a closure period is marked potentially impassable, which is an operational warning rather than a number.

D4, logistics, adds 10 per cent to transport and fuel for each point above 1, so a D4 of 5 adds 40 per cent. D5, destination, changes the number of tents needed: a destination with good existing infrastructure halves the tent requirement, a destination with none doubles it. Both are marked estimated with no primary source. Finally, 15 per cent is added to the whole subtotal as contingency, which the code justifies as the lower bound of the 15 to 20 per cent standard used for high-risk projects.

A worked example is carried in the code. For 10,000 people, 20 per cent of them vulnerable, at Level 2, moving 50 kilometres: 160 standard buses, 100 medical buses and 50 ambulances, 310 vehicles in total; 50 security staff, 20 medical staff, 100 paramedics and 310 drivers; 10,850 litres of fuel, 15,000 kilograms of food, 450,000 litres of water, 2,000 tents and 67 radios. Transport comes to 92,500 US dollars, fuel to 16,275, personnel to 34,000, food to 45,000, water to 22,500, shelter to 300,000, medical to 15,000 and communications to 33,500, giving a subtotal of 558,775, a contingency of 83,816, and a total of roughly 643,000 US dollars, or about 64 dollars per person. Shelter dominates, which is a useful thing for a planner to be able to see at a glance.
