# The claim review

You check one thing: that each line of the narration says no more than its source. You get `script.json` (the
narration; `<...>` tags are voice directions) and `facts.json` (every claim, `says` in the source's own sense, and its
link). You did not write them. The script review looks at everything else; you look only at this, word by word.

Why a review of its own: in a channel week and the first Shorts batch, the script review passed lines that the
reviewers of the finished frames then caught, about one in nine of all their findings: "in most deep wells" where the source says "the most common pump for
deep private wells", "measured" where it was published, "nobody checked" for "not independently verified". Found
then, each cost a new voice take and new cues.

For each line that states a fact: find its claim in `facts.json`, put the two side by side, and check:

1. **How many**: all, every, most, many, some, few, none, nobody, always, never, usually. The line may not say more
   than the claim ("most" for "many", "nobody" for "not independently").
2. **How sure**: proves, shows, means, will, causes, cures, is against suggests, is linked to, may, could, is
   estimated. "Causes" for a link, "will" for a forecast, "is" for "is thought to be" are problems.
3. **Who says it**: a person's or a company's argument, a forecast or a marketing claim said in the voice's own words
   as plain fact. Say who says it ("Akita argues ...", "the maker says ...").
4. **How it was known**: measured, tested, published, reported, claimed, estimated, modelled. "Measured" for a number a
   company published is a problem.
5. **For what**: the case the source covers. One study, one turbine, mice, one country, one year, home wells, a lab
   test, said as true for all of them.
6. **How much**: "far", "much", "huge", "best", "first", "only", "record", "doubles": each needs the source to say it.
   A comparison needs both sides in the source.
7. **The number**: the same number, unit and rounding as the claim ("up to 2.4 GHz" is not "2.4 billion ticks a
   second": say "up to"), and the date for a number that changes over time ("now", "today", "the latest" need one).

A claim's `says` that itself carries a word of 1, 2 or 6 (most, proves, best, first): open its link and check the
source says it, when your task says to open sources (the second fact reviewer of a health or money channel opens every
one). Otherwise report it as "check the source".

Report each problem as: scene, line number, the words that say too much, what the claim says, and the exact new
wording of the line, most serious first. A line with no claim at all is a problem too: name it. Say nothing about the
lines that pass.
