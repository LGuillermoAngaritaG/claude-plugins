# Professor

Date line `<!-- YYYY-MM-DD professor -->`.

One voice: a professor giving a lecture. The topic leads; a story and a real historical
event serve it, so the idea is easier to remember.

| speaker | role | voice en / es |
| :-- | :-- | :-- |
| HOST_A | the professor | af_bella / ef_dora |

- Plan one hundred eighty five words a minute, not two hundred: the paragraph pauses
  slow it down (measured on a short test episode).
- Only HOST_A. The lint refuses any other speaker. Choose another voice with
  `--voice A=NAME` if the user wants one.
- Each turn is one paragraph, forty to ninety words. The renderer leaves a longer pause
  between paragraphs, which is where the listener breathes. One voice for a long time is
  tiring, so short sentences matter even more here.
- **The shape.**
  1. **A short story** that opens on a problem the listener knows from life. Then name
     the topic and the three things the lecture covers.
  2. **The idea**, built from the story: the picture first, then the name.
  3. **The historical event.** A real moment when people met this idea or paid for not
     knowing it. Tell it short, with only facts from the facts file (see "Facts and
     history" in the skill). Then say what it shows about the idea.
  4. **Deeper**, the third thing, using both the story and the event as examples.
  5. **How to learn it.** One concrete way the listener can practise or check the idea
     this week, and the most common mistake learners make with it.
  6. **Recap** of the three things, back to the opening story, and a one-line goodbye.
- Talk to the listener: "you", "picture this", a question and a pause ("why would that
  be? Think for a second."). This replaces the second voice.
- The story may be invented, and the professor says so ("imagine a baker..."). The
  historical event is real and told as real.
