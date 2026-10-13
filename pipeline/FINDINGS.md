# Form D fundraising findings

A long Kaplan–Meier median mostly reflects that most rounds are never followed by another Form D filing, not that typical gaps are 5–7 years. Among rounds that are followed by another filing, the median gap is about 14 months.

These figures describe 114,695 completed venture rounds from 68,441 companies. Follow-up ends on 2026-09-30, the latest filing date in the download. The event is "followed by another Form D filing." Many follow-on raises (SAFEs, convertible notes, rounds without a Form D) and shutdowns are invisible here, so these rates are lower bounds on fundraising. The probabilities are Kaplan–Meier estimates: a recent round that has not had time for another filing is still in the follow-up, and is not counted as if it will never file again.

## Headlines

1. **Among rounds that were followed by another filing, the gap is about 14 months in every sector.** That conditional median is 14.5 months overall, and 13.6 to 15.6 months by sector (Energy/ClimateTech 13.6, FinTech 13.8, Other/Unclassified 14.0, Consumer 14.2, Technology 14.4, HealthTech/Biotech 15.6). The Kaplan–Meier median, which also keeps rounds with no later filing, is 54.7 months for HealthTech/Biotech and 87.9 months for Technology. It is not reached for FinTech, Energy/ClimateTech, Consumer, or Other/Unclassified, because the estimated share with another filing stays under 50%.

2. **At 24 months, Technology and HealthTech/Biotech are tied.** An estimated 37.6% of Technology rounds and 36.8% of HealthTech/Biotech rounds have been followed by another Form D filing. That gap is under one point, so neither sector is faster. Energy/ClimateTech is lower, at 31.4%. FinTech (28.7%), Other/Unclassified (27.3%), and Consumer (26.1%) sit together, several points below Energy/ClimateTech and about 9 to 11 points below Technology.

3. **About two-thirds of rounds have no further Form D filing within 24 months.** Overall, an estimated 32.7% have been followed by another filing by 24 months, so 67.3% have not. Because missing raises never appear, the share that obtained some later financing is at least this high, and may be higher.

4. **Mid-size rounds are followed by another filing within 24 months more often than the smallest rounds.** In Technology, the 24-month rate is 42.0% for $1–5 million rounds and 33.7% for rounds under $1 million. In HealthTech/Biotech the same comparison is 40.9% versus 32.5%. The largest rounds are not the most likely to be followed within two years: Technology rounds of $20 million or more are at 35.5%, and HealthTech/Biotech rounds of that size are at 33.2%, close to the under-$1 million rates in those sectors and several points below the mid-size rates.

5. **Companies with 3 or more observed rounds are much more likely to file again.** This is a pattern in who is still filing, not a cause. By 24 months, about 51% of rounds numbered 3 or higher have been followed by another filing in HealthTech/Biotech (51.5%), FinTech (51.3%), and Energy/ClimateTech (51.2%). Technology, Other/Unclassified, and Consumer are close to that, at 47.3%, 47.5%, and 47.1%. First observed rounds are much lower: 17.4% in Consumer, 19.1% in FinTech, and 19.2% in Other/Unclassified. HealthTech/Biotech first rounds are at 27.1%, and Technology first rounds are at 31.7%. Reaching a third observed filing describes companies that kept filing. It does not show that the third round produces the next one.

6. **Other/Unclassified should stay its own sector.** By 24 months, 27.3% of its rounds have been followed by another filing. That matches Consumer (26.1%) and FinTech (28.7%), and it is about 10 points below Technology (37.6%). Merging it into Technology would pull the technology rate down. It is a mixed leftover industry, not a market.

Every sector crossed with an amount bucket, and every sector crossed with stage (round 1, round 2, or round 3+), has at least 100 rounds. None of those cuts were marked insufficient. A smaller cut would be, and the app should use the sector-level number instead.

## Limitations

The clock stops at the next Form D filing in this extract. An acquisition, an IPO, a shutdown, or a raise that was never filed on Form D all look the same: no later filing. SAFEs, convertible notes, and other rounds without a Form D are missing, so a low rate here is a lower bound on fundraising, not a count of companies that failed to raise.

Rounds with no later filing are treated as still under observation until 2026-09-30, even when the last round was years earlier and the company may have stopped operating. That is why a Kaplan–Meier median can land at 5–7 years even though the gap among rounds that do get another filing is about 14 months. One round falls on the end date itself and has essentially no follow-up.

`observed_round_number` counts rounds in this Form D extract. It is not the company's true seed or Series A. A "round 1" can be the first filing we see, not the company's first raise.

Form D covers exempt offerings under Regulation D and Section 4(a)(5). Amounts are what the issuer reported, and offerings within 90 days were merged into one round.

Other/Unclassified is the Form D industry label "Other." Benchmarks should report it on its own.

## Validation

Fill this in by hand. Compare a few companies' publicly reported rounds with the rounds this dataset contains.

| Company | Rounds publicly reported | Rounds found in Form D data | Notes |
|---|---|---|---|
|  |  |  |  |
