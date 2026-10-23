# Making good marketing videos with AI (research, October 2026)

Scope: what works in paid and organic marketing video in 2025-2026, written for a team that builds video with
Remotion, local Kokoro TTS, LTX-2.5 clips and gpt-image pictures, and that already made vertical ads for a B2B
SaaS (Dictaria, meeting transcription).

How to read the evidence:

- **[official]** = the platform or regulator's own page, fetched during this research.
- **[vendor]** / **[agency]** = a company that sells tools or services. Read as opinion with a motive.
- **UNCONFIRMED** = I could not trace the number to a primary source, or sources disagree.
- Each claim has a source link in brackets. The full list is at the end.
- Research limit: the web-search budget ran out near the end. Two things were not checked and are marked
  UNCONFIRMED: Meta's learning-phase event count and the popular "3:2:2" testing method.

---

## 0. The short version for Dictaria

1. **Make the real product the hero, not the AI people.** Use real screen recordings of the Dictaria UI (zoomed,
   with a smooth cursor, composited in Remotion). Keep AI clips of people for short context b-roll only. Why:
   - The EU's final Article 50 guidelines say realistic but fictitious AI people can count as "deep fakes" that need a
     visible "AI" label. Advertising rarely gets the lighter "creative" treatment. [Bird & Bird](https://brandwrites.twobirds.com/post/102ng3r/when-marketing-meets-genai-update-what-do-the-final-eu-ai-act-transparency-gui)
   - An AI-made product image that misleads about the product also counts as a deep fake. [Bird & Bird](https://brandwrites.twobirds.com/post/102ng3r/when-marketing-meets-genai-update-what-do-the-final-eu-ai-act-transparency-gui)
   - Brain-measurement work found that even high-quality AI ads produced weaker memory activation than traditional ads.
     [NIQ](https://nielseniq.com/global/en/news-center/2024/niq-research-uncovers-hidden-consumer-attitudes-toward-ai-generated-ads/)
2. **Say the core message in the first 3 seconds, and hook within 6.** This is TikTok's own guidance.
   [TikTok official](https://ads.tiktok.com/help/article/creative-best-practices?lang=en)
3. **Make many ads that are clearly different, not many copies of one ad.** Meta recommends launching new ads every week,
   keeping at least 20 varied ads in Advantage+ shopping campaigns, and spending 20-30% of budget on testing.
   [Meta official](https://www.facebook.com/business/news/three-steps-to-optimize-your-performance-with-creative-diversification)
   TikTok recommends 3-5 creatives per ad group. [TikTok official](https://ads.tiktok.com/help/article/creative-best-practices?lang=en)
4. **Design for sound on, and always burn in captions.** YouTube says 95% of its videos are watched with sound on
   ([Google via PPC Land](https://ppc.land/mastering-youtube-advertising-with-the-abcd-framework/)). LinkedIn says 79% of
   feed videos are watched with sound off ([LinkedIn, 2021](https://www.linkedin.com/business/marketing/blog/linkedin-ads/4-tips-for-better-video-ads-on-linkedin-in-2021)).
5. **Use one safe box for every vertical platform:** x 120-888, y 288-1248 on a 1080x1920 frame (derived in section 3).
6. **Label AI where it is needed.** Put a visible "AI" mark at the start of any ad with realistic AI people (EU), and
   switch on TikTok's "This ad contains AI-generated content" toggle.
   [TikTok official](https://ads.tiktok.com/help/article/add-disclaimers-to-ads?lang=en)
7. **Never use an AI person as a "customer" giving a testimonial.** The FTC rule bans reviews and testimonials by
   people who do not exist, including AI-generated ones.
   [FTC](https://www.ftc.gov/news-events/news/press-releases/2024/08/federal-trade-commission-announces-final-rule-banning-fake-reviews-testimonials)
8. **Back up every number you claim** (accuracy %, time saved). The FTC punished an AI firm for an unsupported
   "98 percent accurate" claim. [CyberScoop](https://cyberscoop.com/ftc-workado-settlement-ai-detector-false-and-misleading-claims/)
9. **Cut each ad to more than one length:**
   - 15 s master. This fits every Meta placement; the range that qualifies for all of them is 5-15 s.
     [Jon Loomer](https://www.jonloomer.com/meta-video-ad-length-requirements/)
   - 15-30 s for LinkedIn. [LinkedIn official](https://www.linkedin.com/help/lms/answer/a424737)
   - 15 s or less for X. [X official](https://business.x.com/en/help/campaign-setup/creative-ad-specifications)
   - 6 s bumper for YouTube. [Google official](https://support.google.com/google-ads/answer/11462260)
10. **Measure hook rate, hold rate and CTR, then judge on pipeline, not on cost per lead.** One B2B SaaS analysis found
    that the cheapest-lead ad set produced none of the purchases.
    [TripleDart](https://www.tripledart.com/blog/meta-ads-b2b-lead-quality-claude)

---

## 1. Ad formats in 2026 and when to use each

### What the data says about formats in general

- **Look native.** Google reviewed 2,000 Shorts ads and found the best ones "feel like they're part of a viewer's Shorts
  feed", like creator content. Casual, direct-to-camera ads work well there.
  [Google blog](https://blog.google/products/ads-commerce/youtube-shorts-ads-select-lineups-abcds/)
- **Show people.** TikTok recommends featuring creators, employees or customers. It also recommends a "DIY or not
  overly polished" look. [TikTok official](https://ads.tiktok.com/help/article/creative-best-practices?lang=en)
- **Talk to the viewer.** TikTok says one in three of its highest-view-through ads "break the fourth wall" by speaking
  straight to the viewer.
  [TikTok blog](https://ads.tiktok.com/business/th/blog/9-creative-tips-to-drive-auction-ad-performance)
- **Motion's 2026 data (Meta only).** Motion studied about 550,000 ads, from about 6,000 advertisers, with about $1.3B of
  spend on Facebook and Instagram, from September 2025 to January 2026.
  [Motion](https://motionapp.com/events/2026-creative-strategy-bootcamp/homebase/2026-creative-benchmarks)
  - Only 5-8% of ads become "winners", and about half never get meaningful spend.
  - Formats reported with the highest hit rates: offer-first banner, demo, testimonial, unboxing, montage,
    before & after, listicle, split screen and "us vs them", at roughly 5-10% (UNCONFIRMED exact ranking: it comes
    from a search summary of Motion's pages, and the landing page I fetched does not list it).
  - The data is Meta-only and leans toward consumer brands, so treat it as a direction, not a rule for B2B.
- **Platform style differs.** One media buyer warns that polished, brand-safe creative that wins on Meta often loses on
  TikTok. [Stackmatix](https://stackmatix.com/blog/tiktok-creative-best-practices-2026)

### Format guide

Motion's format definitions are at [Motion formats library](https://motionapp.com/library/formats/).

| Format | What it is | Use it when | B2B SaaS fit |
|---|---|---|---|
| **Product demo / screen recording** | The real UI doing one job, with zooms and a cursor | The product's output is visual and fast (a transcript or summary appears). Retargeting and consideration. | **Best.** It is proof, not a promise. Motion lists "Demo" among top hit-rate formats (UNCONFIRMED ranking). |
| **UGC-style talking head** | One person talks to camera, lo-fi | Cold audiences on TikTok, Reels and Shorts. Google and TikTok both favor direct address. | Good with a real employee or customer. AI avatar: see section 5. |
| **Founder-led** | The founder explains why they built it | LinkedIn, trust building, early-stage brands. Usually run as Thought Leader Ads on LinkedIn. | **Strong on LinkedIn.** Evidence is mostly practitioner opinion ([ZenABM](https://zenabm.com/blog/founder-led-linkedin-ads)). LinkedIn reports 1.6x engagement for Thought Leader Ads (UNCONFIRMED, via agencies). |
| **Problem-solution skit** | A short scripted scene (missed action item, then the fix) | Making a dull pain point feel real. Humor helps: Google found humor performed best for watch time and brand lift ([Google 2015](https://business.google.com/ca-en/think/marketing-strategies/creating-youtube-ads-that-break-through-in-a-skippable-world/)). | Good. Real actors beat AI actors for comedy timing (opinion). |
| **Testimonial** | A real customer's story with a specific result | Mid and late funnel, LinkedIn, retargeting | **Strong**, but only with real customers (FTC, section 7). |
| **Before / after, split screen, us vs them** | Two states side by side (manual notes vs auto summary) | When the change is visible in one frame | **Strong** for Dictaria: a messy notebook next to a clean summary. |
| **Listicle** | "3 things that happen after your call ends" | Feature-rich products, fast pacing | Good. Each item is a mini demo. |
| **Explainer** | Calm walk through the problem, how it works and the outcome | Landing pages, YouTube, onboarding | Good off-feed. Too slow for cold feed ads. |
| **Motion-graphics ad** | Animated type, UI cards and icons, no people | Sound-off feeds, LinkedIn. LinkedIn found motion graphics gave a 3% CTR lift over its video benchmark ([LinkedIn 2021](https://www.linkedin.com/business/marketing/blog/linkedin-ads/4-tips-for-better-video-ads-on-linkedin-in-2021)). | Good, and it is our pipeline's strength (Remotion). |
| **"Faceless" b-roll + voiceover** | Stock or AI b-roll with VO and captions | Cheap volume testing of angles | OK for testing messages. Weaker trust. AI b-roll of realistic people triggers EU labeling. |
| **Carousel-to-video** | Turning static slides into a short video | Reusing proven static ads | OK. Meta's Advantage+ beta turns images and concepts into 15-20 s videos itself ([Jon Loomer](https://www.jonloomer.com/advantage-plus-creative-video-generation-beta/)). |
| **YouTube pre-roll (skippable in-stream)** | 15-60 s, with a skip button after 5 s | Search-intent audiences, retargeting, explainer-length stories | Medium. Showing the brand early raises recall but also raises skips ([Google 2015](https://business.google.com/ca-en/think/marketing-strategies/creating-youtube-ads-that-break-through-in-a-skippable-world/)). |
| **LinkedIn B2B video** | 15-30 s, captioned, person-led or demo | Account-based marketing, retargeting, thought leadership | **Core channel.** One agency says LinkedIn video ranks last on cost per outcome despite a 34% lower CPM, and works better for retargeting ([ZenABM](https://zenabm.com/blog/linkedin-video-ads-best-practices.md), UNCONFIRMED). |

**Ranking for a B2B SaaS like Dictaria** (my synthesis of the sources above):

1. Screen-recording demo with a strong hook
2. Before/after or split screen
3. Founder-led or employee talking head (real person)
4. Real customer testimonial
5. Motion-graphics listicle
6. Problem-solution skit
7. Faceless b-roll with VO, for message tests only

AI-avatar UGC comes last for a trust-heavy B2B purchase. The evidence on avatars is mixed and comes from vendors (section 5).

---

## 2. Script structure

### The hook (first 1-3 seconds)

Official timing:

- **TikTok:** "Introduce your content proposition in the first 3 seconds" and "Prioritize your hook in the first 6 seconds".
  [TikTok official](https://ads.tiktok.com/help/article/creative-best-practices?lang=en)
- **TikTok data:** over 63% of the highest-CTR videos put the key message or product in the first 3 seconds.
  [TikTok blog](https://ads.tiktok.com/business/th/blog/9-creative-tips-to-drive-auction-ad-performance)
- **Google ABCD ("Attract"):** tight framing, people early, surprising visuals, faster pacing, "often with multiple
  shots in the first five seconds". [PPC Land summary of Google ABCD](https://ppc.land/mastering-youtube-advertising-with-the-abcd-framework/)
- **Shorts:** there is no time to set up a premise. Get in fast.
  [Google blog](https://blog.google/products/ads-commerce/youtube-shorts-ads-select-lineups-abcds/)

**The 3 jobs of a hook** (Motion bootcamp, [Evan Lee, Motion](https://motionapp.com/library/talk/creative-strategy-explained-the-3-jobs-of-a-hook-bootcamp-week-1-evan-lee-motion/)):

1. Create an emotional reaction that cuts through the noise.
2. Target the right viewer and turn away the wrong one.
3. Lead naturally into the story. A flashy opening that does not fit the pitch is "hook slop".

**Hook layers.** A hook has four parts that should agree with each other:

- visual (what moves on screen)
- text (on-screen words)
- verbal (the first spoken line)
- audio (sound cue)

[Motion hook analysis](https://motionapp.com/library/frameworks/hook-analysis),
[Billo](https://help.billo.app/en/articles/8894539-for-creators-hooks-key-to-high-performing-video-ads)

**Hook types.** These are from Motion's 2026 dataset, Meta only.
[Motion top hook tactics](https://motionapp.com/library/research/creative-benchmarks-2026/top-hook-tactics)

- **Promotional cluster:** newness, sale announcement, price anchor, urgency, offer, FOMO, new product announcement,
  event announcement, giveaway. These had high hit rates, roughly 6-11% for the top group.
- **Interrupt cluster:** confession, contrarian, shocking statement, reverse psychology, warning, myth busting, bold
  claim. These had lower hit rates but more variance.
- **Others:** curiosity, if/then, relatability, contrast, direct address, authority, storytelling, reasons why.

Example hooks for Dictaria. These are my illustrations, not tested. Swap in real features and real numbers only.

| Type | Example (visual + line) |
|---|---|
| Problem call-out | Close-up of someone typing notes while a client talks: "Still typing while your client talks?" |
| Result first | The finished summary with action items appears on screen within 2 s: "This was written 10 seconds after the call." (only if true) |
| Contrarian | "Stop taking meeting notes." |
| Confession | "I lost a deal because nobody wrote down what we promised." |
| If/then (targeting) | "If you have more than five calls a day, watch this." |
| Contrast / split screen | Left: a messy notebook. Right: a clean summary. No words needed. |
| Curiosity | "What did your team agree to yesterday? You don't remember. It does." |
| Listicle | "3 things that happen when your call ends." |
| Newness | "New: ask your meetings a question." (only if the feature exists) |

### Body frameworks

- **Hook-body-CTA.** This is the basic unit. TikTok's SMB playbook treats seconds 3-6 as the hook window, then selling
  points, then a closing CTA. [TikTok SMB Creative Playbook](https://ads.tiktok.com/business/library/SMB_Creative_Playbook.pdf)
  (the PDF is slide images I could not read; this summary comes from a search result, so it is partly UNCONFIRMED).
- **PAS (Problem, Agitate, Solution).** One 30 s template ([Benly](https://benly.ai/learn/ad-creative/video-ad-structure-frameworks)),
  vendor timings:

  | Beat | Time |
  |---|---|
  | Problem | 0-5 s |
  | Agitate | 5-18 s |
  | Solution | 18-25 s |
  | CTA | 25-30 s |

  Another vendor uses Problem 0-5 s, Agitate 5-15 s, Solve 15-30 s ([AdCreate](https://adcreate.com/blog/ad-copywriting-formulas-frameworks)).
  The exact seconds are heuristics, not research.
- **AIDA (Attention, Interest, Desire, Action).** It is still used, but a Motion talk (December 2025) calls AIDA-style
  scripts outdated for video, because viewers tune out lists of benefits.
  [Motion](https://motionapp.com/library/talk/how-to-script-micro-movie-ads-that-scale-in-2026-step-by-step/)
- **"Micro-movie" (30-60 s).** Setup, then tension, then payoff. The product enters at the emotional shift, about
  40-50% into the story. That is practitioner opinion based on one case, not a validated rule.
  [Motion](https://motionapp.com/library/talk/how-to-script-micro-movie-ads-that-scale-in-2026-step-by-step/)
- **Before-After-Bridge.** Suggested for "transformation" stories. Same source.
- **Google ABCD.** Attract, Brand, Connect, Direct. Kantar's model (Link AI, more than 11,000 ads) *predicted* a 30%
  lift in short-term sales likelihood and 17% in long-term brand contribution for ads that follow it. This is a model
  prediction, not measured sales. [Kantar](https://www.kantar.com/north-america/industries/technology-and-telecoms/validating-googles-abcd-framework-with-the-power-of-artificial-intelligence)

### Timing templates for our ads

These are my synthesis of the sources above.

**15 s:**

| Time | Beat |
|---|---|
| 0-3 s | Hook. The proposition is visible and spoken. |
| 3-11 s | One product moment shown on the real UI (1-2 shots). |
| 11-15 s | Outcome, brand and CTA. |

**30 s:**

| Time | Beat |
|---|---|
| 0-3 s | Hook |
| 3-8 s | Problem |
| 8-24 s | Demo: two or three beats |
| 24-30 s | Proof or offer, then CTA |

**Word budget.** At a normal speaking pace of about 2.5 words a second (an estimate, UNCONFIRMED), a 15 s ad holds about
30-38 spoken words. One script guide suggests 60 words or fewer for 20 s
([scriptwriting methodology](https://claudeskills.info/skills/mike-coulbourn/claude-vibes/scriptwriting-methodology/), weak source).

**On-screen text speed.** TikTok recommends 5-10 words per second when using text
([TikTok official](https://ads.tiktok.com/help/article/creative-best-practices?lang=en)). Treat 10 as the ceiling, not the target.

### Writing the CTA

- **Google ABCD "Direct":** show the CTA with a text card, animation or voiceover. Use specific action phrases ("Visit
  site", "Buy now"). Urgency or offers help.
  [PPC Land / Google](https://ppc.land/mastering-youtube-advertising-with-the-abcd-framework/)
- **TikTok:** "Guide your audience on what to think, feel, or do with a strong CTA". Use the platform CTA buttons with
  short, direct language. [TikTok official](https://ads.tiktok.com/help/article/creative-best-practices?lang=en),
  [TikTok blog](https://ads.tiktok.com/business/th/blog/9-creative-tips-to-drive-auction-ad-performance)
- **LinkedIn (2021 data):** ads with an offer got 1.2x the average completion rate. An offer in the headline gave 8%
  higher completion.
  [LinkedIn](https://www.linkedin.com/business/marketing/blog/linkedin-ads/4-tips-for-better-video-ads-on-linkedin-in-2021)
- **YouTube Shorts:** the platform CTA button appears 3 s in for Performance Max, App and Demand Gen, and 10 s in for
  Video view and Video reach campaigns. So the spoken CTA can come early.
  [Google official](https://support.google.com/google-ads/answer/16041697)
- **Rules I recommend** (my synthesis): one action only, verb first, low friction, and say what they get ("Try it free
  on your next call"). The CTA text must sit inside the safe box and agree with the button label.

### Length benchmarks per platform

| Platform | Official limit | Official or best-sourced recommendation |
|---|---|---|
| TikTok In-Feed | up to 10 min ([TikTok](https://ads.tiktok.com/help/article/tiktok-auction-in-feed-ads)) | None on the help page. "21-34 s" is widely said to be TikTok's sweet spot (UNCONFIRMED: not found on a TikTok page) ([Neal Schaffer](https://nealschaffer.com/tiktok-video-length/)). 9-15 s for conversion goals is vendor opinion ([Cometly](https://www.cometly.com/post/how-long-should-a-tiktok-ad-be)). |
| Instagram Reels ads | 0 s to 15 min ([Meta](https://www.facebook.com/business/ads-guide/update/video/instagram-reels)) | 5-15 s qualifies for every Meta placement ([Jon Loomer](https://www.jonloomer.com/meta-video-ad-length-requirements/)) |
| Facebook Reels ads / In-stream | 15 s max ([Jon Loomer](https://www.jonloomer.com/meta-video-ad-length-requirements/)) | 15 s |
| Instagram Stories | 1 s to 60 min. Under 10 s plays in full; 16 s or more is split into cards ([Meta](https://www.facebook.com/business/ads-guide/update/video/instagram-story)) | 15 s or less |
| YouTube Shorts ads | up to 3 min ([Google](https://support.google.com/google-ads/answer/16041697)) | Under 60 s. 10-30 s for action campaigns (same source). |
| YouTube skippable in-stream | Skip button after 5 s. You pay at 30 s, or at the end if the ad is shorter ([Google](https://support.google.com/google-ads/answer/2375464)) | No fixed length |
| YouTube non-skippable | Bumper up to 6 s. Standard 7-15 s. CTV 16-30 s ([Google](https://support.google.com/google-ads/answer/11462260)) | - |
| LinkedIn | 3 s to 30 min. In-stream up to 90 s ([LinkedIn](https://www.linkedin.com/help/lms/answer/a424737)) | 15-30 s (same source) |
| X | up to 2:20; some advertisers up to 10 min ([X](https://business.x.com/en/help/campaign-setup/creative-ad-specifications)) | 15 s or less (same source) |

---

## 3. Platform specs

### Specs table

| | Aspect | Resolution | Notes |
|---|---|---|---|
| TikTok In-Feed (non-Spark) | 9:16 recommended; 16:9 and 1:1 allowed | min 540x960 | 500 MB or less; at least 516 kbps; mp4, mov, mpeg, 3gp, avi. The ad caption has no clickable links, @ or hashtags. A Spark Ad caption shows at most 4 lines. ([TikTok](https://ads.tiktok.com/help/article/tiktok-auction-in-feed-ads)) TikTok also says to shoot at least 720p ([TikTok](https://ads.tiktok.com/help/article/creative-best-practices?lang=en)). |
| Instagram Reels ads | 9:16 | 1440x2560 listed | 4 GB; min width 250 px under 30 s, 500 px at 30 s or more; H.264, AAC at 128 kbps or more. Subtitles and sound recommended. Avoid licensed music. ([Meta](https://www.facebook.com/business/ads-guide/update/video/instagram-reels)) |
| Instagram Stories ads | 9:16 | 1440x2560 | Primary text 125 characters ([Meta](https://www.facebook.com/business/ads-guide/update/video/instagram-story)) |
| YouTube Shorts ads | 9:16 preferred; others get blurred bars | - | Description up to 90 characters ([Google](https://support.google.com/google-ads/answer/16041697)) |
| YouTube in-stream | 16:9 standard | - | See formats ([Google](https://support.google.com/google-ads/answer/2375464)) |
| LinkedIn | 16:9, 1:1, 4:5 (recommended 720x900, max 1080x1350), 9:16 (max 1080x1920) | - | 75 KB to 500 MB; under 30 fps; H.264; captions as SRT, plain text only ([LinkedIn](https://www.linkedin.com/help/lms/answer/a424737)). Vertical shows only on mobile ([QuickFrame](https://quickframe.com/blog/linkedin-video-ad-specs), secondary). |
| X | 9:16 recommended; also 1:1 and 16:9 | - | MP4 or MOV up to 1 GB, under 30 MB recommended; 29.97 or 30 fps (up to 60); H.264; AAC LC ([X](https://business.x.com/en/help/campaign-setup/creative-ad-specifications)). The 9:16-first wording came from a localized help page (secondary). |

Rendering note: we render at 1080x1920. All platforms accept it. Meta lists 1440x2560 for Reels and Stories, so a
1440x2560 export is an option for Meta only. It is not required.

### Safe zones on a 1080x1920 frame

| Platform | Top | Bottom | Left | Right | Source |
|---|---|---|---|---|---|
| TikTok In-Feed | 240 | 660 | 120 | 120, plus a button column 180 px wide from y=840 down | TikTok's template, scaled from 720x1280 by [Socialync](https://www.socialync.io/tools/safe-zones/tiktok). The column width was measured by Socialync, not published by TikTok. |
| Instagram/Facebook Reels and IG Stories | 14% = 269 | 35% = 672 | 6% = 65 | 6% = 65 | [Meta official](https://www.facebook.com/business/ads-guide/update/video/instagram-reels), [Meta Stories](https://www.facebook.com/business/ads-guide/update/video/instagram-story) |
| YouTube Shorts | 288 | 672 | 48 | 192 | [Socialync](https://www.socialync.io/tools/safe-zones/youtube-shorts), said to be from Google's specs. UNCONFIRMED: AdKit measured smaller margins ([AdKit](https://adkit.so/tools/safe-zones/youtube)). |

**One box for all three.** I took the strictest margin on each side:

- Safe box: **x 120 to 888, y 288 to 1248** (768 x 960 px).
- Below y = 840, also keep text left of **x = 780**. This is a conservative reading of TikTok's button column
  (120 + 180 from the right edge).
- This is my calculation from the sourced numbers.
- Meta's Ads Manager has a "Show Safe Zones" preview toggle
  ([House of Marketers](https://www.houseofmarketers.com/guide-to-safe-zones-tiktok-facebook-instagram-stories)).
- TikTok publishes a downloadable template ([TikTok](https://ads.tiktok.com/help/article/tiktok-auction-in-feed-ads)).
- Check both before you launch.

### Captions and subtitles

- **Captions are recommended on Meta** for Reels and Stories
  ([Meta](https://www.facebook.com/business/ads-guide/update/video/instagram-reels)).
- **LinkedIn:** use captions in the audio's language, single-track audio, and make the ad work without sound
  ([LinkedIn](https://www.linkedin.com/business/marketing/blog/linkedin-ads/4-tips-for-better-video-ads-on-linkedin-in-2021)).
  LinkedIn SRT files take plain text only ([LinkedIn](https://www.linkedin.com/help/lms/answer/a424737)).
- **Burn captions into the video** for TikTok, Reels and Shorts, where you control the style. Also upload SRT on
  LinkedIn and YouTube for accessibility. This is my recommendation.
- **Chunks of 3-5 words, bold sans-serif, with a stroke or shadow.** Vendor guidance
  ([Way With Words](https://waywithwords.net/?p=18489), [OpenClip](https://openclip.app/learn/caption-styling)).
- **Placement conflict.** One vendor says captions belong 65-85% of the way down the frame
  ([BlitzCut](https://blitzcutai.com/blog/best-caption-placement-short-form-video)). That band falls inside Meta's bottom
  35% and TikTok's bottom 660 px. Use **about y 960-1240** (50-64% down) instead. This is my reconciliation.
- **Line length and reading speed:**
  - At most 42 characters per line, two lines at most (Netflix,
    [Netflix](https://backlothelp.netflix.com/hc/en-us/articles/215758617)).
  - About 20 characters per second for adults (UNCONFIRMED on a Netflix page; third-party,
    [checker](https://www.bookwriter.vip/subtitle-reading-speed-checker)).

### Sound on vs sound off

| Platform | Figure | Quality of source |
|---|---|---|
| YouTube | 95% of videos viewed with sound on | Google, via [PPC Land](https://ppc.land/mastering-youtube-advertising-with-the-abcd-framework/) |
| YouTube Shorts | Sound "has been shown to increase conversions by over 20%" | [Google official](https://support.google.com/google-ads/answer/16041697) |
| TikTok | 88% of users say sound is essential to TikTok (a perception, not a share of plays). 73% would "stop and look" at ads with audio. | Kantar for TikTok, Jan 2021 ([TikTok](https://ads.tiktok.com/business/en-US/blog/evolution-of-sound-volume-1), [Social Media Today](https://www.socialmediatoday.com/news/tiktok-shares-new-insights-into-the-importance-of-sound-for-marketing-promo/601569)) |
| LinkedIn | 79% of feed videos watched with sound off | [LinkedIn, 2021](https://www.linkedin.com/business/marketing/blog/linkedin-ads/4-tips-for-better-video-ads-on-linkedin-in-2021) |
| Facebook | "85% watched without sound" is 2016 publisher data, not Meta. **Do not use.** No current official Meta figure was found. | [Digiday](https://digiday.com/media/silent-world-facebook-video/) |
| Reels | "About 60% of Reels viewers have sound on" | UNCONFIRMED blog figure ([Logical Position](https://www.logicalposition.com/blog/supercharge-your-advertising-with-reels)) |

What Meta recommends:

- 9:16, sound (music and voice-over) and safe zones, plus one extra element such as a hook in the first seconds, human
  presence, text overlays or lo-fi style.
- Meta reported that creative meeting these rules had a 30% higher 3-second playrate and 56% higher CTR. The baseline
  is not stated.
- [Adobe quoting Meta](https://blog.adobe.com/en/publish/2024/11/04/unlock-potential-reels-best-practices-for-creative-success-using-adobe-creative-cloud)

---

## 4. Visual and audio craft

### On-screen text and kinetic captions

- **Short overlays work.** TikTok: 40% of the highest-view-through ads use concise text overlays
  ([TikTok blog](https://ads.tiktok.com/business/th/blog/9-creative-tips-to-drive-auction-ad-performance)). Keep text at
  5-10 words per second or slower ([TikTok official](https://ads.tiktok.com/help/article/creative-best-practices?lang=en)).
- **Word-by-word ("karaoke") highlighting.** It works best for hooks and scripted lines. For instructions, show whole
  phrases instead. [OpenClip](https://openclip.app/learn/caption-styling),
  [Subclip](https://subclip.app/blogs/subtitle-styles-that-convert) (vendors)
- **Test on the worst frame.** If captions are readable on the best frame but disappear on the worst one, the style is
  not production-safe. [OpenClip](https://openclip.app/learn/caption-styling)
- **Our pipeline:** draw every word in Remotion, never inside AI video. Generated video garbles text (section 5).

### Pacing, cuts and pattern interrupts

- **No study isolates cut rate.** The common rule "cut every 2-3 seconds" is **UNCONFIRMED**. The studies I found vary
  total length, not cut frequency. For example, Google's Netflix test built its 15 s and 6 s cuts by keeping only the
  most impactful moments of the 30 s ad.
  [Think with Google](https://thinkwithgoogle.com/advertising-channels/video/video-ad-length-testing-netflix)
- **What is supported:** Google's ABCD recommends quick pacing and several shots in the first five seconds
  ([PPC Land](https://ppc.land/mastering-youtube-advertising-with-the-abcd-framework/)). Event-recap editors use 1-2 s
  cuts with 5-10 s speaker bites ([Klap](https://klap.app/blog/conference-video-editing), vendor).
- **Pattern interrupt** means doing what the viewer does not expect at the open: Motion's "interrupt cluster" hooks
  (confession, contrarian, warning) or a surprising visual. These have higher variance.
  [Motion](https://motionapp.com/library/research/creative-benchmarks-2026/top-hook-tactics)
- **Our rule of thumb** (my recommendation): a new visual event every 1.5-3 s. That can be a cut, a zoom, a UI card
  entering, or a text change. With 5 s AI clips, put a zoom or card inside each clip so no shot sits still for 5 s.

### Product shots and branding

- **Show product or logo early.** Google: in the first 5 seconds, and woven into the story or onto the product. People
  saying the brand name works better than voice-over alone.
  [PPC Land / Google](https://ppc.land/mastering-youtube-advertising-with-the-abcd-framework/)
- **Early brand has a cost.** On skippable YouTube, an early brand raised recall and awareness but also raised skips.
  Floating logos that are not on the product hurt (2015, consumer data).
  [Google](https://business.google.com/ca-en/think/marketing-strategies/creating-youtube-ads-that-break-through-in-a-skippable-world/)
- **For SaaS, the "product shot" is the UI.** Make UI zooms the beauty shots, smooth the cursor, hide private data
  (bookmarks, email), and get to live product fast.
  [Consensus](https://goconsensus.com/blog/best-practices-for-saas-product-demos/),
  [Screen Studio overview](https://thegtmdirectory.com/tools/screen-studio/md)
- **Brand consistency.**
  - LinkedIn's B2B Institute "95-5 rule": most buyers are out of market at any moment, so the brand most easily
    remembered tends to be bought.
    [LinkedIn B2B Institute](https://business.linkedin.com/it/it/advertise/resources/b2b-institute/b2b-research/trends/95-5-rule)
  - Distinctive assets (colours, logo, sound, faces) help memory
    ([BLCK Alpaca](https://blckalpaca.at/de/wissen/social-media/social-media-grundlagen-strategie/brand-vs-performance-marketing-95-5-regel.md), secondary).
  - In practice: one color system, one type family, one end card, one sound logo across all variants.

### Music and sound design

- **Tempo.** TikTok says fast tracks above 120 BPM often drive higher view-through rates. It gives no percentage.
  [TikTok blog](https://ads.tiktok.com/business/th/blog/9-creative-tips-to-drive-auction-ad-performance)
- **Music at the open can hurt.** Google (2015) found that any music in the first five seconds may hurt brand awareness,
  and calming or action-oriented music increased skips. Test with and without.
  [Google](https://business.google.com/ca-en/think/marketing-strategies/creating-youtube-ads-that-break-through-in-a-skippable-world/)
- **Sound logos.** Sonic assets show large lifts in vendor studies. For example, System1/TikTok reportedly found a 191%
  brand-awareness lift (UNCONFIRMED, secondary, sellers of sonic branding)
  ([Yahoo Finance](https://finance.yahoo.com/sectors/technology/articles/sonic-branding-most-underused-asset-104500993.html)).
  One academic thesis found no significant effect on cued recall
  ([MOspace](https://mospace.umsystem.edu/items/3ef128aa-1dc9-4777-b69a-17bd1b1607bb)). A short sound logo on the end
  card is cheap to test.
- **Keep audio simple.** LinkedIn advises one audio source, because multi-track audio lowers completion.
  [LinkedIn](https://www.linkedin.com/business/marketing/blog/linkedin-ads/4-tips-for-better-video-ads-on-linkedin-in-2021)
- **Licensing:** see section 7. Use commercial libraries only.

### Voice choice

- **AI voices lose to human voices, unless the script is strong.** Wistia's 2026 report: AI voiceovers "tend to
  underperform human voices, but the gap narrows when the script and pacing are strong". No numbers were given.
  [Wistia](https://wistia.com/blog/state-of-video-webinar-recap)
- **People prefer human speakers for learning content.** 87% prefer a human speaker over avatars for instructional
  video. The study details are not published. [TechSmith](https://www.techsmith.com/blog/what-matters-in-video-right-now/)
- **AI voice tells:** no breaths and a flat "TTS plateau" cadence. [Opus](https://www.opus.pro/blog/ai-slop-aesthetic-12-tells)
- **Kokoro:**
  - Apache-2.0 license, trained on permissive or non-copyrighted audio, and fine for commercial use.
    [Hugging Face](https://huggingface.co/hexgrad/Kokoro-82M)
  - It cannot clone voices, and anyone can use the same voices
    ([tts.ai](https://tts.ai/voices/kokoro/?lang=ja), vendor). Pick one voice as the brand voice and keep it.
- **Practical (my recommendation):** short sentences, punctuation that forces pauses, and one stressed word per line.
  For the best-performing ads, consider re-recording the VO with a real person (the founder).

---

## 5. AI-specific

### What AI does well today

- **Planning and post-production.** In 2025, 41% of marketers used AI for video, up from 18%. Captions were the top use
  (over 60% of AI users), then dubbing (38%) and translation (31%).
  [MarTech on Wistia 2025](https://martech.org/41-of-brands-using-ai-for-video-up-from-18-last-year/)
- **Volume of variants.** Over a million advertisers made more than 15 million ads in one month with Meta's GenAI tools.
  [Meta Engineering](https://engineering.fb.com/2024/12/02/production-engineering/meta-andromeda-advantage-automation-next-gen-personalized-ads-retrieval-engine/)
- **Backgrounds and text variants.** Meta reports image generation in Advantage+ creative gave about 11% higher CTR
  (method not given). [Meta](https://www.facebook.com/business/news/the-creative-advantage-unlocking-the-power-of-diversification-with-meta-andromeda)
- **Non-realistic or stylized visuals.** These avoid the "deep fake" test entirely. Fantastical content is out of
  scope. [Bird & Bird](https://brandwrites.twobirds.com/post/102ng3r/when-marketing-meets-genai-update-what-do-the-final-eu-ai-act-transparency-gui)

### What AI does badly today

**Visual and audio failure points** ([Opus](https://www.opus.pro/blog/ai-slop-aesthetic-12-tells),
[Segmind on Veo 3](https://blog.segmind.com/veo-3-image-to-video-guide/)):

- hands that morph
- gibberish text in the scene
- background physics that change between cuts
- flat lighting and over-saturated color
- floaty camera moves
- lip-sync errors
- broken reflections
- odd-moving extras in the background
- repeating textures
- flat TTS

**Temporal coherence.** Higher resolution does not fix it.
[NemoVideo](https://www.nemovideo.com/blog/why-ai-videos-look-fake-how-to-fix)

**Prompt adherence.** LTX-2's own model card says it may not match prompts perfectly, prompt following depends heavily on
prompting style, and audio without speech may be lower quality. Width and height must be divisible by 32, and frame
count must be 8k+1. [Hugging Face LTX-2](https://huggingface.co/Lightricks/LTX-2)

**Audience reaction:**

- IAB, January 2026:
  - 82% of ad executives think Gen Z and Millennials feel positive about AI ads; only 45% do.
  - 39% of Gen Z feel negative.
  - Consumers rate AI-using brands as "innovative" less often than before (23%, down from 30%).
  - Clear disclosure is the third-highest driver of attention.
  - [IAB](https://www.iab.com/insights/the-ai-ad-gap-widens/)
- NIQ: consumers spotted most AI ads, called them "annoying, boring, confusing", and saw a possible negative halo on the
  brand. [NIQ](https://nielseniq.com/global/en/news-center/2024/niq-research-uncovers-hidden-consumer-attitudes-toward-ai-generated-ads/)
- McDonald's Netherlands pulled its AI Christmas ad about three days after release, in December 2025, after a backlash.
  [NBC News](https://www.nbcnews.com/world/europe/mcdonalds-ai-generated-christmas-advert-social-media-backlash-rcna248590)

### Avoiding the "AI slop" look

Practitioner advice, mainly from [NemoVideo](https://www.nemovideo.com/blog/why-ai-videos-look-fake-how-to-fix),
[Opus](https://www.opus.pro/blog/ai-slop-aesthetic-12-tells) and [Unite.AI](https://www.unite.ai/how-brands-can-avoid-ai-slop-in-video-advertising):

1. **Start from an image, not text.** Generate a still with gpt-image (reference sheets of 3-5 angles for any recurring
   person), then animate it with LTX image-to-video. Do not use pure text-to-video for people.
2. **One camera move per shot,** with lighting described concretely.
3. **Frame hands out of the shot,** keep them below the frame, or pick clips where hands are still.
4. **No text, logos or UI inside generated video.** Add them all in Remotion as overlays. For the product, use real
   screen recordings, not a generated or redrawn UI.
5. **Keep AI clips short** (our 5 s is fine), cut away before artifacts build up, and review every clip frame by frame
   on hands, faces, edges and backgrounds.
6. **Use one consistent grade.** Turn saturation down. Add light grain or handheld micro-shake so it matches real
   footage (my suggestion).
7. **Prefer non-photoreal styles** (illustration, 3D, the ink style of our sketch kit) when people are not essential.
   Clearly unrealistic content falls outside the EU deep-fake test.
   [Bird & Bird](https://brandwrites.twobirds.com/post/102ng3r/when-marketing-meets-genai-update-what-do-the-final-eu-ai-act-transparency-gui)
8. **Make the intent matter.** "Slop comes from shipping work that feels unfinished or careless", not from using AI.
   [Unite.AI](https://www.unite.ai/how-brands-can-avoid-ai-slop-in-video-advertising)

### AI avatar and AI UGC tools

Prices change often. Official pages were fetched in October 2026 where marked; the rest are third-party reports.

| Tool | What it is for | Rough price | Source |
|---|---|---|---|
| **HeyGen** | Talking avatars, photo avatars, voice cloning, translation and dubbing | Free (3 videos a month, up to 1 min). Creator $29/mo (600 credits). Pro from $49/mo. Business $149/mo (+$20/seat). Avatar IV uses about 20 credits a minute. | [official](https://www.heygen.com/pricing); credit rate from [Creatify](https://creatify.ai/blog/heygen-pricing-(2026)-plans-and-what-you-ll-actually-pay) (competitor) |
| **Synthesia** | Corporate training and L&D avatars, SCORM, 140+ language translation | Free tier. Starter $29/mo ($18 yearly). Pro $89/mo ($64 yearly). Enterprise custom. | [official](https://www.synthesia.io/pricing) |
| **Arcads** | AI actors (1,000+) for UGC-style ads, product-in-hand, many video models | Not shown on site. Reported: Starter with talking actors $110 list (promo $77). About $7.70-$11 per video before discards. | [Arcads](https://www.arcads.ai/); price from [Creatify](https://creatify.ai/blog/arcads-pricing-(2026)-plans-credits-and-what-you-ll-actually-pay) (competitor) and [eesel](https://www.eesel.ai/en/blog/arcads-ai-pricing) |
| **Creatify** | URL-to-video ads with AI avatars, script variants, competitor ad tracker | Starter $39/mo, Pro $99/mo (August 2026, third-party) | [Wireflow](https://www.wireflow.ai/blog/creatify-pricing), [Zeely](https://zeely.ai/blog/creatify-ai-review/) |
| **Captions / Mirage** | AI UGC "Ad Studio" on its own Mirage model; captions and dubbing app | Ad Studio $199-$799/mo (conflicting). Clips capped at 4 s per its help page. | [Captions help](https://help.captions.ai/docs/project/ad-studio-mirage), [Mirage help](https://help.mirage.app/docs/project/ad-studio), [Sacra](https://sacra.com/research/mirage) |
| **Higgsfield** | Cinematic camera controls, Soul ID character consistency, "Speak" lip-sync, Marketing Studio | About $15-$129/mo (conflicting). Reported: the free plan has no commercial rights. | [Creatify](https://creatify.ai/blog/higgsfield-pricing-(2026)-plans-and-what-you-ll-actually-pay) (competitor), [CostBench](https://costbench.com/software/ai-video-generators/higgsfield/) |
| **Icon** | "Admaker" (AdGPT, AdCut) that remixes a brand's tagged footage library into ads, plus a managed human-UGC service | "$39+/mo" on its site. A LinkedIn post reports a pivot to human UGC ($999 for 6 ads) (UNCONFIRMED). | [Icon](https://icon.com/how-we-help), [NeuronFeed](https://neuronfeed.com/startups/icon-admaker) |
| **TikTok Symphony** | Free creative studio. Digital avatars built from licensed paid actors. Image-to-video. Auto "AI-generated" label. | Free | [TikTok](https://ads.tiktok.com/business/en-US/blog/tiktok-symphony-ai-creative-suite), [PetaPixel](https://petapixel.com/2024/06/20/tiktok-will-have-ads-featuring-ai-generated-versions-of-real-people) |
| **Meta Advantage+ creative** | Gen-AI backgrounds, text variants, image-to-video (beta) inside Ads Manager | Free | [Jon Loomer](https://www.jonloomer.com/advantage-plus-creative-video-generation-beta/) |

**Context:** the WSJ reported that Meta aims to fully automate ad creation (image plus budget in, finished ad out) by the
end of 2026. No launch confirmation was found.
[exchange4media](https://www.exchange4media.com/digital-news/meta-aims-to-fully-automate-advertising-with-ai-by-2026-144037.html)

**AI avatar vs human creator results.** No independent study exists; vendors and agencies disagree:

- Admiral (sells AI characters): AI won 9 of 13 tests.
  [Admiral](https://admiral.media/ai-characters-vs-ugc-performance-ads/)
- Moburst: humans had 22% higher watch-through and 31% higher post-click conversion for products over $75 (UNCONFIRMED).
  [Moburst](https://intercept.moburst.com/ai-avatar-ads-vs-real-creators-which-wins-on-meta/)
- RevenueCat case: a lip-sync delay caused a 68% CTR drop. A later digital twin reached 87% of the human conversion rate.
  [RevenueCat](https://www.revenuecat.com/blog/growth/ad-generated-ads-ugc)
- The pattern across sources: avatars do fine on cheap impulse products and worse on trust-heavy purchases. B2B SaaS is
  trust-heavy.

### When to use real footage or screen recordings instead

| Situation | Use real | Why |
|---|---|---|
| The product UI | Always a real screen recording | AI or redrawn product depictions that mislead can be "deep fakes" in the EU ([Bird & Bird](https://brandwrites.twobirds.com/post/102ng3r/when-marketing-meets-genai-update-what-do-the-final-eu-ai-act-transparency-gui)). Demo is a top format. Proof beats promise. |
| Testimonials and "I use it" claims | Always real customers | FTC fake-review rule and Endorsement Guides (section 7) |
| Founder or employee voice | Real person | Trust and LinkedIn Thought Leader Ads. TechSmith: 87% prefer a human speaker. |
| Comedy or emotion-heavy skits | Real actors, if budget allows | Lip-sync and timing artifacts are visible AI tells ([Opus](https://www.opus.pro/blog/ai-slop-aesthetic-12-tells)) |
| Context b-roll (an office, people in a call, a city) | AI is acceptable, with a label if realistic people appear | Cheap variety. Needs an "AI" label in the EU if realistic. |
| Abstract concepts, transitions, icons | AI pictures or code animation | No deep-fake risk if clearly stylized |

---

## 6. Creative testing

### Metrics

| Metric | Formula | Benchmarks (vendor, conflicting) |
|---|---|---|
| Thumb-stop / hook rate | 3 s video plays ÷ impressions | Motion: under 25% needs work; 25-35% solid; over 35% strong. The Motion glossary says 20-40% is solid. ([Motion blog](https://motionapp.com/blog/key-creative-performance-metrics), [Motion glossary](https://motionapp.com/glossary)) |
| Hold rate | 15 s plays (ThruPlays) ÷ 3 s plays. Some tools divide by impressions instead, so check the formula. | Motion: 40-50% average. Madgicx: 25-40%. (UNCONFIRMED, definitions differ.) ([Motion blog](https://motionapp.com/blog/key-creative-performance-metrics), [Madgicx](https://madgicx.com/blog/facebook-creative-scoring)) |
| Average watch time | Platform metric | Check it next to hold rate, because a ThruPlay fires at 15 s ([Motion bootcamp](https://motionapp.com/library/talk/creative-strategy-explained-the-3-jobs-of-a-hook-bootcamp-week-1-evan-lee-motion/)) |
| CTR (outbound) | Link clicks ÷ impressions | - |
| CPA / cost per lead | Spend ÷ conversions | For B2B, also track lead-to-opportunity and pipeline. One SaaS analysis: the cheap-lead ad set produced none of the 5 purchases ([TripleDart](https://www.tripledart.com/blog/meta-ads-b2b-lead-quality-claude)). |

**How to read them.** The hook is judged by thumb-stop, the body by hold rate and watch time, the offer and CTA by CTR,
and the business result by CPA and pipeline. A good hook is measurable, "not subjective".
[Motion](https://motionapp.com/library/talk/creative-strategy-explained-the-3-jobs-of-a-hook-bootcamp-week-1-evan-lee-motion/)

### How many variants

- **TikTok:** 3-5 creatives per ad group, and 3-5 varied ad groups per campaign.
  [TikTok official](https://ads.tiktok.com/help/article/creative-best-practices?lang=en)
- **Meta:**
  - Launch new ads every week, keep at least 20 varied ads in Advantage+ shopping campaigns, and put 20-30% of budget into
    testing new ads.
    [Meta official, Nov 2024](https://www.facebook.com/business/news/three-steps-to-optimize-your-performance-with-creative-diversification)
  - Meta has a native Creative Testing tool for up to 5 new ads (some versions allow up to 10) with a set budget slice,
    inside the existing ad set. [Jon Loomer](https://www.jonloomer.com/qvt/creative-testing-feature/)
  - Ads per ad set: up to 50 (UNCONFIRMED, third-party).
    [AdManage](https://admanage.ai/blog/how-many-facebook-ads-should-you-run-at-once)
- **Base rate:** only 5-8% of ads become winners
  ([Motion](https://motionapp.com/events/2026-creative-strategy-bootcamp/homebase/2026-creative-benchmarks)). Plan for
  volume.
- **Not checked:** Meta's learning-phase threshold (often quoted as about 50 optimization events in 7 days) is
  UNCONFIRMED here; the help page did not load. The "3:2:2" dynamic-creative method was not researched (search budget ran
  out).

### Iterating hooks

- **Keep the body, change the open.** Keep a proven body and swap the first 1-3 s (visual, text and line together).
  Motion's example: Ridge Wallet kept one line ("Your wallet sucks") and paired it with many visuals.
  [Motion](https://motionapp.com/library/talk/creative-strategy-explained-the-3-jobs-of-a-hook-bootcamp-week-1-evan-lee-motion/)
- **Mix hook types.** A hook library that is all one type fatigues fast, and results vary a lot by vertical. Test inside
  your own category.
  [Motion](https://motionapp.com/library/research/creative-benchmarks-2026/top-hook-tactics)
- **Fatigue has no official threshold.** Frequency cut-offs (2-4) are practitioner opinion. Watch CTR and CPA trends over
  7-14 days. [AdManage](https://admanage.ai/blog/how-many-facebook-ads-should-you-run-at-once),
  [Jon Loomer](https://www.jonloomer.com/?p=37773)

### How the platforms handle creative diversity in 2026

- **Meta Andromeda** is the ad retrieval engine behind Advantage+. Meta reports +6% recall and +8% ads quality, and
  expects creative volume to keep growing.
  [Meta Engineering](https://engineering.fb.com/2024/12/02/production-engineering/meta-andromeda-advantage-automation-next-gen-personalized-ads-retrieval-engine/)
- **Meta's advice:** creative with "different themes, messages, and visuals".
  [Meta, Apr 2025](https://www.facebook.com/business/news/the-creative-advantage-unlocking-the-power-of-diversification-with-meta-andromeda)
- **Practitioner reading:** near-duplicate ads are grouped and compete for one slot, so small edits (a colour, one word,
  the music) do not count as new ads.
  [Segwise](https://segwise.ai/blog/meta-andromeda-update-creative-strategy-2026),
  [Jon Loomer](https://www.jonloomer.com/meta-andromeda-creative-diversification/)
- **Creative Similarity Score:** thresholds of 40% or 60% are UNCONFIRMED.
  [nikhil.pro](https://nikhil.pro/meta-ads-creative-similarity-explained/)
- **What counts as different** (practitioner list): a different persona, pain point, awareness level, format, hook type
  or visual world.
- **TikTok Smart+** picks creatives from creator content, your own assets and generated content. It ranks them on
  predicted performance and refreshes them to fight fatigue: "More creative variety increases the chance of finding
  winning ads". [TikTok official](https://ads.tiktok.com/help/article/about-auto-selected-creatives?lang=en)
  Asset-group limits (30 or 50) are UNCONFIRMED. [Segwise](https://segwise.ai/blog/tiktok-smart-campaigns-guide-benefits)

**What this means for us** (my synthesis): one "concept" is a persona × pain × format. Ship 3-5 concepts, each with 3
hooks. Kill on thumb-stop and CTR after enough spend. Keep winners, and add new concepts every week, not just new colours.

---

## 7. Legal and trust

### EU AI Act Article 50 (transparency)

**Dates:**

- In force and enforceable from **2 August 2026**. Fines up to €15M or 3% of worldwide turnover.
  [Goodwin](https://www.goodwinlaw.com/en/insights/publications/2026/08/alerts-technology-dpc-eu-ai-act-transparency-obligations-now-in-force)
- **2 December 2026:** grace period ends for the machine-readable marking duty (50(2)) of generative systems already on
  the market before 2 August 2026.
- **2 February 2027:** Code signatories need watermark-detection interoperability.
  [Faegre Drinker](https://www.faegredrinker.com/en/insights/publications/2026/7/eu-ai-act-commission-confirms-transparency-code-of-practice-as-adequate-and-publishes-final-version-of-its-guidelines-on-transparency-obligations)
- **10 June 2026:** final Code of Practice on AI-generated content published. **20 July 2026:** final Article 50
  Guidelines published. Both are non-binding but shape enforcement. The Commission confirmed the Code as adequate in
  July 2026.
  [Bird & Bird](https://brandwrites.twobirds.com/post/102ng3r/when-marketing-meets-genai-update-what-do-the-final-eu-ai-act-transparency-gui),
  [Faegre Drinker](https://www.faegredrinker.com/en/insights/publications/2026/7/eu-ai-act-commission-confirms-transparency-code-of-practice-as-adequate-and-publishes-final-version-of-its-guidelines-on-transparency-obligations)

**Duties:**

- **50(2):** providers must mark outputs machine-readably.
- **50(4):** deployers, which includes us as advertisers, must disclose deep-fake image, audio or video "in a clear and
  distinguishable manner", at the latest at first exposure.
- [AI Act Art. 50](https://artificialintelligenceact.eu/article/50/)

**What counts as a deep fake.** Article 3(60): content that resembles existing persons, objects, places or events and
would falsely appear authentic. [Presencis](https://presencis.com/regulations/eu-ai-act/definitions/deep-fake/)

**What the guidelines say for marketing** ([Bird & Bird](https://brandwrites.twobirds.com/post/102ng3r/when-marketing-meets-genai-update-what-do-the-final-eu-ai-act-transparency-gui),
[SRD](https://www.srd-rechtsanwaelte.de/en/blog/labelling-requirements-ai-act-deepfakes)):

- Realistic AI-generated human avatars count as "persons". A realistic fictitious but natural-looking person can be a
  deep fake.
- Most advertising does **not** get the lighter "creative" treatment.
- A teleshopping-style video with simulated consumers is not exempt.
- An AI product image that misleads about look, features or use is a deep fake. A real product on an AI background is
  fine if it does not mislead.
- Intent to deceive is not needed. The test is the reasonably foreseeable audience, including vulnerable people.
- Industry pushback exists ([EGTA](https://www.egta.com/joint-letter-to-the-european-commission-on-the-ai-act-draft-guidelines/)).

**How to label (Code of Practice):**

- For visuals, the label includes "AI".
- For video, it appears at the start and, where possible, at intervals.
- It must be legible, kept clear of other overlays, and on screen long enough to be noticed.
- The Commission's icon satisfies the rule.
- [Bird & Bird](https://brandwrites.twobirds.com/post/102ng3r/when-marketing-meets-genai-update-what-do-the-final-eu-ai-act-transparency-gui),
  [Faegre Drinker](https://www.faegredrinker.com/en/insights/publications/2026/7/eu-ai-act-commission-confirms-transparency-code-of-practice-as-adequate-and-publishes-final-version-of-its-guidelines-on-transparency-obligations)

**Application to the current Dictaria ads** (my reading, not legal advice):

- AI clips of realistic office workers shown to EU viewers likely need a visible "AI" label from the first frame.
- A drawn UI card that matches the real product is not AI-generated. It still must not misrepresent the product.

### United States: FTC

- **Fake reviews rule, 16 CFR Part 465.** Effective October 2024. Bans reviews and testimonials that misrepresent that
  they come from someone who does not exist, "such as AI-generated fake reviews", or from someone with no real experience.
  It allows civil penalties against knowing violators.
  [FTC](https://www.ftc.gov/news-events/news/press-releases/2024/08/federal-trade-commission-announces-final-rule-banning-fake-reviews-testimonials),
  [Consumer Finance Monitor](https://www.consumerfinancemonitor.com/2024/08/20/ftc-issues-final-rule-to-fight-fake-product-reviews/)
- **Endorsement Guides (2023).**
  - Virtual influencers count as endorsers.
  - Endorsements must reflect real opinions and experience, which an AI persona cannot have.
  - Disclosure is needed if even a significant minority of the audience would not understand the connection.
  - [Crowell](https://www.crowell.com/NewsEvents/AlertsNewsletters/all/Does-the-FTCs-Recent-Influencer-Guidance-Address-Robots),
    [InfoLawGroup](https://www.infolawgroup.com/insights/2023/8/11/virtual-influencers-are-now-officially-regulated-endorsersunless-theyre-spokespersons)
  - **Rule for us:** an AI avatar may present the product as a spokesperson. It may never say "I use it and it saved me
    hours" as if it were a customer.
- **Claims need evidence.**
  - Workado was ordered (final order, August 2025) to stop unsupported "98 percent" accuracy claims. Independent testing
    showed 53% on general content.
    [CyberScoop](https://cyberscoop.com/ftc-workado-settlement-ai-detector-false-and-misleading-claims/),
    [FKKS](https://advertisinglaw.fkks.com/post/102l358/ftcs-ai-crackdown-continues-workado-ordered-to-drop-unsupported-accuracy-claims)
  - The FTC's AI-claims enforcement continues under Chairman Ferguson, with more scrutiny of **B2B** marketing claims.
    [Holland & Knight, Aug 2026](https://www.hklaw.com/en/insights/publications/2026/08/operation-ai-comply-2-years-later-continued-enforcement)
  - Any "X% accurate transcription" or "saves N hours" line needs our own test data on file.

### Platform AI labels

| Platform | Rule |
|---|---|
| **Meta** | Labels ads made or significantly edited with its own GenAI tools as "AI info". For an AI-generated photorealistic human, the label sits next to "Sponsored". Meta's June 2026 update says it will auto-detect third-party AI tools "through industry-standard signals" and label them in "About this ad". Political and social-issue ads must disclose digitally created or altered media. ([Meta help](https://www.meta.com/en-gb/help/artificial-intelligence/355108217670024/), [Meta newsroom](https://about.fb.com/news/2025/02/gen-ai-transparency-metas-ads-products/)) |
| **TikTok ads** | For non-Spark ads with fully AI-generated or significantly AI-modified image, video or audio, tick "This ad contains AI-generated content". Duplicating a campaign resets the toggle. ([TikTok official, Sept 2025](https://ads.tiktok.com/help/article/add-disclaimers-to-ads?lang=en)) |
| **TikTok organic and Spark** | Community Guidelines require labeling realistic AI content. Unlabeled realistic AI can be removed. C2PA files may be auto-labeled. ([BGR](https://bgr.com/business/tiktok-rolls-out-new-rules-for-content-generated-by-ai/), [TBS / Reuters](https://www.tbsnews.net/node/847181)) |
| **YouTube (organic)** | Disclose realistic altered or synthetic content: real people saying things they did not, altered real events, realistic scenes that did not happen, and AI music that is the main focus. Script help, captions and beauty filters are exempt. Disclosure "won't limit a video's audience". The page does not say whether this covers ads. ([YouTube Help](https://support.google.com/youtube/answer/14328491)) |
| **Google Ads** | Confirmed only for election ads (since 2023). A general "AI label for all ads" claim is UNCONFIRMED ([Axios](https://www.axios.com/2023/09/06/google-ai-election-ads-disclosure), [AuditSocials](https://auditsocials.com/blog/google-ads-ai-generated-content-label-policy-2026)). The misrepresentation policy applies however an ad is made. |

### C2PA and content credentials

- **OpenAI images:** OpenAI adds C2PA Content Credentials and a SynthID watermark to images from ChatGPT and its API,
  checkable at openai.com/verify. This is from a search summary of OpenAI's help page (the direct fetch was blocked), so
  it is partly UNCONFIRMED. [OpenAI help](https://help.openai.com/en/articles/8912793-c2pa-in-chatgpt-images)
- **Metadata usually does not survive.** Social platforms strip metadata, and re-encoding a gpt-image frame inside a
  Remotion render will drop the C2PA manifest (my inference). Do not count on platforms auto-labeling. Self-disclose.
- **YouTube "captured with a camera"** needs C2PA 2.1+ capture and no edits.
  [Gigazine](https://wbgsv0a.gigazine.net/gsc_news/en/20241016-youtube-c2pa-captured-with-a-camera)

### Music licensing

- **TikTok:** business accounts should use the Commercial Music Library (pre-cleared). Chart songs are licensed for
  personal use, not ads.
  [TikTok blog](https://ads.tiktok.com/business/zh/blog/audio-library-royalty-free-music),
  [Soundstripe](https://www.soundstripe.com/blogs/tiktok-music-licensing-rules)
- **Meta:** avoid licensed music in Reels ads; use original audio or Meta's Sound Collection.
  [Meta](https://www.facebook.com/business/ads-guide/update/video/instagram-reels)
- **AI music (Suno, Udio):**
  - Paid plans grant commercial use. Free tiers do not.
  - Label lawsuits are only partly settled: UMG and Udio in October 2025, Warner and Suno in November 2025, others
    pending.
  - Terms are changing, so keep proof of the plan at the time of generation.
  - [Dubspot](https://blog.dubspot.com/ai-music-licensing-explained-2026)
- **YouTube** asks for disclosure when AI music is the main focus of a video.
  [YouTube Help](https://support.google.com/youtube/answer/14328491)

### Copyright of AI output

- The US Copyright Office (Part 2 report, 29 January 2025) says purely prompt-generated material is not copyrightable.
  Human selection, arrangement or modification can be.
  [Library of Congress blog](https://blogs.loc.gov/copyright/2025/02/inside-the-copyright-offices-report-copyright-and-artificial-intelligence-part-2-copyrightability/)
- **Implication:** our raw AI clips have weak protection. The edited ad, script and brand assets carry the value.

### Voice

Kokoro is Apache-2.0, and its training data is described as permissive.
[Hugging Face](https://huggingface.co/hexgrad/Kokoro-82M)

---

## 8. Other video types worth knowing

| Type | What makes it good | Evidence |
|---|---|---|
| **Product launch video** | 30-60 s. Lead with the problem. Show, don't tell (a realistic scenario on screen). Combine a hype promo with a short how-to: the Arc browser "Boosts" video did a promo clip followed by a host's walkthrough. One CTA. | [Vidico](https://vidico.com/news/best-product-launch-videos), [Tella on Arc Boosts](https://www.tella.com/best-product-videos/arc-boosts), [Flowjam](https://www.flowjam.com/blog/saas-launch-video) (vendors) |
| **Onboarding / tutorial** | Clarity first: 57% of viewers say clarity keeps them engaged. Under 6 min for quick tasks; ranges of 1-6, 6-10 and 10-20 min by depth. A real presenter is preferred (87%). Keep the real UI full screen with a small presenter bubble (the Linear walkthrough style). How-to videos keep high engagement (82% for short ones). | [TechSmith](https://www.techsmith.com/blog/what-matters-in-video-right-now/), [Moonb](https://www.moonb.io/blog/product-launch-video), [Wistia via MarTech](https://martech.org/41-of-brands-using-ai-for-video-up-from-18-last-year/) |
| **Social explainer** | Under 1 min averages 52% engagement on Wistia. One idea per video. Captions. Hook as in ads. 96% of people say they have watched an explainer to learn about a product (Wyzowl). | [Wistia](https://wistia.com/blog/optimal-video-length), [Wyzowl](https://wyzowl.com/explainer-video-conversion-rate/) |
| **Customer testimonial** | Real customer, a specific measurable result, unscripted answers to prepared questions, a viewer can "see themselves". Cut to under 1 min for ads and keep a longer cut for sales. Wistia: testimonial videos average 46% engagement. Conversion-lift stats online are unsourced (UNCONFIRMED). | [Testimonial.to](https://testimonial.to/resources/video-testimonials-for-business), [Wistia](https://wistia.com/blog/optimal-video-length) |
| **Event recap** | Usually a minute or less. A shot list before the event. 1-2 s cuts, 5-10 s speaker bites. Every clip must make sense without the room. Clean audio. Licensed music. | [RainFocus](https://rainfocus.com/blog/15-points-of-a-great-recap-video/), [Vimeo](https://vimeo.com/de/blog/post/event-recap-video), [Klap](https://klap.app/blog/conference-video-editing) |
| **Internal training** | Microlearning chunks. A human presenter is preferred, but 75% are receptive to AI-assisted video. SCORM export for an LMS (Synthesia and HeyGen Business have it). Update with AI dubbing and translation instead of reshoots. | [TechSmith](https://www.techsmith.com/blog/what-matters-in-video-right-now/), [Synthesia](https://www.synthesia.io/pricing), [HeyGen](https://www.heygen.com/pricing) |
| **Webinars and long-form** | Wistia: webinars and original series drive the most conversions, and 30-60 min videos convert best. A CTA in the first quarter of short videos converts well. | [MarTech on Wistia](https://martech.org/41-of-brands-using-ai-for-video-up-from-18-last-year/) |

---

## 9. Checklists

### A. Producing a 15-30 s vertical SaaS ad (for an AI agent)

**Brief**

1. Write one line each:
   - audience (persona, awareness level)
   - one pain
   - one promised outcome
   - one proof (a real feature or a real number you have evidence for)
   - one CTA
   - target platforms
2. Pick the format from section 1: a demo, before/after, talking head, listicle or skit. Write down why.
3. Pick a length set: a 15 s master, plus 6 s (bumper), 20-30 s (TikTok, LinkedIn) and 15 s (X) cutdowns.

**Script**

4. Write 3-5 hooks of *different types* (problem, result-first, contrarian, if/then, contrast). Each hook must:
   - state the proposition by 3 s
   - work with sound off (text on screen)
   - disqualify the wrong viewer
5. Write one body: 1-3 product moments, each shown on the **real UI**. Keep to about 2.5 spoken words a second
   (15 s is about 35 words).
6. Write the CTA: verb first, one action, a low-friction offer, matching the platform button label.
7. **Claims check.** Every number or superlative needs evidence on file (FTC). No first-person "I use it" lines from an
   AI person.

**Assets**

8. Record the real product on screen at 2x scale with clean demo data: no real customer names, no private tabs. Plan
   zooms on the exact element that changes.
9. AI b-roll, only where people or settings add context:
   - gpt-image stills first, with reference sheets for any recurring person
   - then LTX image-to-video with one camera move, no hands in focus, no text or screens in the shot
   - width and height divisible by 32, frames 8k+1
   - generate 3-4 takes per shot and keep the cleanest
10. Pictures: stylized beats photoreal when people are not essential (no deep-fake issue).
11. Voice: one fixed Kokoro brand voice, written for prosody (short lines, commas for breath). Music from a commercial
    library. A sound logo on the end card.

**Build (Remotion)**

12. 1080x1920, 30 fps. All text, UI cards, captions and logos drawn in Remotion, never inside generated video.
13. Keep everything important inside the **safe box x 120-888, y 288-1248** (and x 780 or less below y 840). Captions
    around y 960-1240.
14. Captions:
    - burned in, 3-5 word chunks, bold sans-serif with a stroke
    - 42 characters per line or fewer
    - one highlighted keyword at a time
    - on-screen text at 10 words a second or slower
15. Pacing: a new visual event every 1.5-3 s (a cut, zoom, card or text change). Several shots in the first 5 s. The
    brand or product visible within 5 s, ideally *on the product* (the UI header), not a floating logo.
16. AI label: if any realistic AI person appears, add a legible "AI" mark (for example "AI-generated scenes") from the
    first frame. It must stay clear of other overlays and be visible long enough to read.
17. End card: logo, one-line benefit, CTA, URL, inside the safe box, about 2-3 s.

**Variants and export**

18. Export hooks × one body: 3-5 hook versions of the same body. Plus at least one *different concept* (another persona
    or format) for creative diversity.
19. Export per platform cut. Upload SRT where supported (LinkedIn, YouTube).
20. At upload, tick the platform AI disclosure where it applies (TikTok non-Spark toggle; Meta and YouTube as required).

### B. Review before publishing

**Message**

- [ ] With sound off, is the offer clear from the first 3 seconds of frames alone?
- [ ] With eyes closed (sound only), does the VO still make sense?
- [ ] Is there exactly one CTA, and does it match the button and the landing page?
- [ ] Is every claim true, specific and backed by data we hold? No fake testimonials, no AI "customers".

**Frame**

- [ ] Overlay each platform's safe-zone template (TikTok template, Meta "Show Safe Zones", Shorts preview). Nothing
      important under the UI.
- [ ] Captions are readable on the worst frame, spelled correctly, synced within a few frames, and two lines or fewer.
- [ ] The product UI shown is real and current. Nothing on screen makes the product look better than it is.

**AI quality pass** (step through frame by frame)

- [ ] Hands, faces, teeth and eyes are stable. No morphing between frames.
- [ ] No gibberish text, fake logos or garbled screens inside AI clips.
- [ ] Lighting and colour match across shots. No floaty camera or repeating textures.
- [ ] The VO has natural pauses. No mispronounced brand or product names.

**Trust and legal**

- [ ] A realistic AI person or scene is present: a visible "AI" label at the start (EU) and the platform toggle set.
- [ ] Music comes from a commercial library or a paid AI plan, with a licence record.
- [ ] No real person's likeness or voice without written consent.

**Technical**

- [ ] Correct resolution and aspect ratio. H.264 and AAC. Size under each platform's limit.
- [ ] Loudness consistent. No clipping. The first frame is not black (it is the thumbnail on some placements).

**Testing**

- [ ] At least 3 hooks and at least 2 concepts are ready.
- [ ] Naming encodes concept, hook and length, for analysis.
- [ ] A decision rule is written down in advance: which thumb-stop, hold and CTR thresholds to kill or scale at, and
      the pipeline check date.

---

## Sources

Platform documentation
- https://ads.tiktok.com/help/article/creative-best-practices?lang=en
- https://ads.tiktok.com/help/article/tiktok-auction-in-feed-ads
- https://ads.tiktok.com/help/article/add-disclaimers-to-ads?lang=en
- https://ads.tiktok.com/help/article/about-auto-selected-creatives?lang=en
- https://ads.tiktok.com/business/th/blog/9-creative-tips-to-drive-auction-ad-performance
- https://ads.tiktok.com/business/library/SMB_Creative_Playbook.pdf
- https://ads.tiktok.com/business/en-US/blog/evolution-of-sound-volume-1
- https://ads.tiktok.com/business/en-US/blog/tiktok-symphony-ai-creative-suite
- https://ads.tiktok.com/business/zh/blog/audio-library-royalty-free-music
- https://www.facebook.com/business/ads-guide/update/video/instagram-reels
- https://www.facebook.com/business/ads-guide/update/video/instagram-story
- https://www.facebook.com/business/news/three-steps-to-optimize-your-performance-with-creative-diversification
- https://www.facebook.com/business/news/the-creative-advantage-unlocking-the-power-of-diversification-with-meta-andromeda
- https://engineering.fb.com/2024/12/02/production-engineering/meta-andromeda-advantage-automation-next-gen-personalized-ads-retrieval-engine/
- https://www.meta.com/en-gb/help/artificial-intelligence/355108217670024/
- https://about.fb.com/news/2025/02/gen-ai-transparency-metas-ads-products/
- https://transparency.meta.com/governance/tracking-impact/labeling-ai-content/
- https://support.google.com/google-ads/answer/16041697
- https://support.google.com/google-ads/answer/2375464
- https://support.google.com/google-ads/answer/11462260
- https://support.google.com/youtube/answer/14328491
- https://blog.google/products/ads-commerce/youtube-shorts-ads-select-lineups-abcds/
- https://business.google.com/ca-en/think/marketing-strategies/creating-youtube-ads-that-break-through-in-a-skippable-world/
- https://thinkwithgoogle.com/advertising-channels/video/video-ad-length-testing-netflix
- https://www.linkedin.com/help/lms/answer/a424737
- https://www.linkedin.com/business/marketing/blog/linkedin-ads/4-tips-for-better-video-ads-on-linkedin-in-2021
- https://news.linkedin.com/2025/helping-brands-expand-their-reach-in-new-ways-with-video-from-to
- https://business.linkedin.com/it/it/advertise/resources/b2b-institute/b2b-research/trends/95-5-rule
- https://business.x.com/en/help/campaign-setup/creative-ad-specifications
- https://backlothelp.netflix.com/hc/en-us/articles/215758617
- https://help.openai.com/en/articles/8912793-c2pa-in-chatgpt-images
- https://huggingface.co/Lightricks/LTX-2
- https://huggingface.co/Lightricks/LTX-2.5-Pre-Trained/blob/main/README.md
- https://huggingface.co/hexgrad/Kokoro-82M

Law and regulation
- https://artificialintelligenceact.eu/article/50/
- https://www.goodwinlaw.com/en/insights/publications/2026/08/alerts-technology-dpc-eu-ai-act-transparency-obligations-now-in-force
- https://www.faegredrinker.com/en/insights/publications/2026/7/eu-ai-act-commission-confirms-transparency-code-of-practice-as-adequate-and-publishes-final-version-of-its-guidelines-on-transparency-obligations
- https://brandwrites.twobirds.com/post/102ng3r/when-marketing-meets-genai-update-what-do-the-final-eu-ai-act-transparency-gui
- https://www.srd-rechtsanwaelte.de/en/blog/labelling-requirements-ai-act-deepfakes
- https://presencis.com/regulations/eu-ai-act/definitions/deep-fake/
- https://www.egta.com/joint-letter-to-the-european-commission-on-the-ai-act-draft-guidelines/
- https://www.ftc.gov/news-events/news/press-releases/2024/08/federal-trade-commission-announces-final-rule-banning-fake-reviews-testimonials
- https://www.consumerfinancemonitor.com/2024/08/20/ftc-issues-final-rule-to-fight-fake-product-reviews/
- https://www.crowell.com/NewsEvents/AlertsNewsletters/all/Does-the-FTCs-Recent-Influencer-Guidance-Address-Robots
- https://www.infolawgroup.com/insights/2023/8/11/virtual-influencers-are-now-officially-regulated-endorsersunless-theyre-spokespersons
- https://cyberscoop.com/ftc-workado-settlement-ai-detector-false-and-misleading-claims/
- https://advertisinglaw.fkks.com/post/102l358/ftcs-ai-crackdown-continues-workado-ordered-to-drop-unsupported-accuracy-claims
- https://www.hklaw.com/en/insights/publications/2026/08/operation-ai-comply-2-years-later-continued-enforcement
- https://blogs.loc.gov/copyright/2025/02/inside-the-copyright-offices-report-copyright-and-artificial-intelligence-part-2-copyrightability/
- https://www.axios.com/2023/09/06/google-ai-election-ads-disclosure
- https://blog.dubspot.com/ai-music-licensing-explained-2026

Research and industry data
- https://www.iab.com/insights/the-ai-ad-gap-widens/
- https://nielseniq.com/global/en/news-center/2024/niq-research-uncovers-hidden-consumer-attitudes-toward-ai-generated-ads/
- https://www.kantar.com/north-america/industries/technology-and-telecoms/validating-googles-abcd-framework-with-the-power-of-artificial-intelligence
- https://ppc.land/mastering-youtube-advertising-with-the-abcd-framework/
- https://blog.adobe.com/en/publish/2024/11/04/unlock-potential-reels-best-practices-for-creative-success-using-adobe-creative-cloud
- https://motionapp.com/events/2026-creative-strategy-bootcamp/homebase/2026-creative-benchmarks
- https://motionapp.com/library/research/creative-benchmarks-2026/top-hook-tactics
- https://motionapp.com/library/formats/
- https://motionapp.com/library/frameworks/hook-analysis
- https://motionapp.com/library/talk/creative-strategy-explained-the-3-jobs-of-a-hook-bootcamp-week-1-evan-lee-motion/
- https://motionapp.com/library/talk/how-to-script-micro-movie-ads-that-scale-in-2026-step-by-step/
- https://motionapp.com/blog/key-creative-performance-metrics
- https://motionapp.com/glossary
- https://wistia.com/blog/state-of-video-webinar-recap
- https://wistia.com/blog/optimal-video-length
- https://martech.org/41-of-brands-using-ai-for-video-up-from-18-last-year/
- https://www.techsmith.com/blog/what-matters-in-video-right-now/
- https://wyzowl.com/explainer-video-conversion-rate/
- https://digiday.com/media/silent-world-facebook-video/
- https://www.socialmediatoday.com/news/tiktok-shares-new-insights-into-the-importance-of-sound-for-marketing-promo/601569
- https://www.nbcnews.com/world/europe/mcdonalds-ai-generated-christmas-advert-social-media-backlash-rcna248590

Practitioner, agency and vendor sources (lower weight)
- https://www.jonloomer.com/meta-video-ad-length-requirements/
- https://www.jonloomer.com/meta-andromeda-creative-diversification/
- https://www.jonloomer.com/qvt/creative-testing-feature/
- https://www.jonloomer.com/advantage-plus-creative-video-generation-beta/
- https://www.jonloomer.com/?p=37773
- https://www.socialync.io/tools/safe-zones/tiktok
- https://www.socialync.io/tools/safe-zones/youtube-shorts
- https://adkit.so/tools/safe-zones/youtube
- https://www.houseofmarketers.com/guide-to-safe-zones-tiktok-facebook-instagram-stories
- https://stackmatix.com/blog/tiktok-creative-best-practices-2026
- https://nealschaffer.com/tiktok-video-length/
- https://www.cometly.com/post/how-long-should-a-tiktok-ad-be
- https://benly.ai/learn/ad-creative/video-ad-structure-frameworks
- https://adcreate.com/blog/ad-copywriting-formulas-frameworks
- https://claudeskills.info/skills/mike-coulbourn/claude-vibes/scriptwriting-methodology/
- https://help.billo.app/en/articles/8894539-for-creators-hooks-key-to-high-performing-video-ads
- https://zenabm.com/blog/founder-led-linkedin-ads
- https://zenabm.com/blog/linkedin-video-ads-best-practices.md
- https://quickframe.com/blog/linkedin-video-ad-specs
- https://www.tripledart.com/blog/meta-ads-b2b-lead-quality-claude
- https://segwise.ai/blog/meta-andromeda-update-creative-strategy-2026
- https://segwise.ai/blog/tiktok-smart-campaigns-guide-benefits
- https://nikhil.pro/meta-ads-creative-similarity-explained/
- https://admanage.ai/blog/how-many-facebook-ads-should-you-run-at-once
- https://madgicx.com/blog/facebook-creative-scoring
- https://www.opus.pro/blog/ai-slop-aesthetic-12-tells
- https://www.nemovideo.com/blog/why-ai-videos-look-fake-how-to-fix
- https://www.unite.ai/how-brands-can-avoid-ai-slop-in-video-advertising
- https://blog.segmind.com/veo-3-image-to-video-guide/
- https://waywithwords.net/?p=18489
- https://openclip.app/learn/caption-styling
- https://subclip.app/blogs/subtitle-styles-that-convert
- https://blitzcutai.com/blog/best-caption-placement-short-form-video
- https://www.bookwriter.vip/subtitle-reading-speed-checker
- https://www.logicalposition.com/blog/supercharge-your-advertising-with-reels
- https://finance.yahoo.com/sectors/technology/articles/sonic-branding-most-underused-asset-104500993.html
- https://mospace.umsystem.edu/items/3ef128aa-1dc9-4777-b69a-17bd1b1607bb
- https://blckalpaca.at/de/wissen/social-media/social-media-grundlagen-strategie/brand-vs-performance-marketing-95-5-regel.md
- https://goconsensus.com/blog/best-practices-for-saas-product-demos/
- https://thegtmdirectory.com/tools/screen-studio/md
- https://klap.app/blog/conference-video-editing
- https://rainfocus.com/blog/15-points-of-a-great-recap-video/
- https://vimeo.com/de/blog/post/event-recap-video
- https://vidico.com/news/best-product-launch-videos
- https://www.tella.com/best-product-videos/arc-boosts
- https://www.flowjam.com/blog/saas-launch-video
- https://www.moonb.io/blog/product-launch-video
- https://testimonial.to/resources/video-testimonials-for-business
- https://www.soundstripe.com/blogs/tiktok-music-licensing-rules
- https://bgr.com/business/tiktok-rolls-out-new-rules-for-content-generated-by-ai/
- https://www.tbsnews.net/node/847181
- https://wbgsv0a.gigazine.net/gsc_news/en/20241016-youtube-c2pa-captured-with-a-camera
- https://auditsocials.com/blog/google-ads-ai-generated-content-label-policy-2026
- https://www.exchange4media.com/digital-news/meta-aims-to-fully-automate-advertising-with-ai-by-2026-144037.html
- https://petapixel.com/2024/06/20/tiktok-will-have-ads-featuring-ai-generated-versions-of-real-people
- https://tts.ai/voices/kokoro/?lang=ja

AI tool pricing and reviews
- https://www.heygen.com/pricing
- https://www.synthesia.io/pricing
- https://www.arcads.ai/
- https://creatify.ai/blog/heygen-pricing-(2026)-plans-and-what-you-ll-actually-pay
- https://creatify.ai/blog/arcads-pricing-(2026)-plans-credits-and-what-you-ll-actually-pay
- https://creatify.ai/blog/higgsfield-pricing-(2026)-plans-and-what-you-ll-actually-pay
- https://www.eesel.ai/en/blog/arcads-ai-pricing
- https://www.wireflow.ai/blog/creatify-pricing
- https://zeely.ai/blog/creatify-ai-review/
- https://help.captions.ai/docs/project/ad-studio-mirage
- https://help.mirage.app/docs/project/ad-studio
- https://sacra.com/research/mirage
- https://costbench.com/software/ai-video-generators/higgsfield/
- https://icon.com/how-we-help
- https://neuronfeed.com/startups/icon-admaker
- https://admiral.media/ai-characters-vs-ugc-performance-ads/
- https://intercept.moburst.com/ai-avatar-ads-vs-real-creators-which-wins-on-meta/
- https://www.revenuecat.com/blog/growth/ad-generated-ads-ugc
