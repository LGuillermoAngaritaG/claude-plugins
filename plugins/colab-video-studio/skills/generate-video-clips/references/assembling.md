# From clips to a finished video

Lessons from making a narrated ad out of generated clips. Read this before planning any video that has more than one clip.

## Let the model film, and draw the rest in code

The video model is good at believable people and places. It is bad at screens, text, logos and anything that must be exact.

- Ask the model only for generic footage: a person in a meeting, walking, reading, listening. Do not ask it to show a product, an app, a screen with content, or a caption.
- Draw every screen, interface, chart, caption and logo in code and lay it over the clip. Remotion (React) works well; any HTML or canvas renderer does. Text drawn this way is sharp, correct and easy to change without a GPU.
- Copy the look of the real product from its own screenshots or recordings: colours, borders, fonts, labels. Check the repository for them before inventing a look.
- Compose the start pictures for the overlay. Keep the subject in the upper half of the frame when a card will cover the lower half. Show laptops and phones from behind, so no invented screen is visible.
- Invented names, numbers and dates in a drawn screen are fine for a demo. Say that they are invented.

## Keep people and places the same

Text alone never gives the same face twice, in the image model or in the video model.

1. Make one reference picture of each recurring person, in the main location.
2. Make every scene's start picture from that reference: tell the image model to attach the reference file and keep the same person, clothes and room. Use a second reference for a second recurring person.
3. Animate each start picture with image-to-video. The clip keeps the person, the clothes and the room of its picture.
4. Show the user a sheet of all start pictures in story order and get approval before any GPU time.

## Prompts that give clean clips

- One small, slow action per clip: a nod, a blink, a sip, one page turned. Fast hand or object movement melts (flipped pages turned into a blob).
- Keep the mouth closed unless the clip's own sound is the speech. Moving lips under a narrator's voice look wrong.
- Ask for a locked-off camera. The model still drifts in a little. Never ask for a push-in or a zoom: it overdoes it and ends on an uncanny close-up.
- Describe only what changes from the start picture. Do not describe the person or the room again.

## Check clips properly

- Look at six large frames from every clip (about 300 pixels wide each), spread from the first to the last frame. Three small frames per clip missed a melting notebook, a wide-eyed stare and moving lips.
- Keep the server up until every clip is checked, and redo the bad ones in the same session. Then kill it.
- Never tell the user a clip is good from a thumbnail sheet.

## Pacing

- A scene lasts as long as its voice line plus about one second, not as long as its clip. Cut clips short. A fixed 5 second scene under a 2 second line leaves dead air and feels slow.
- A scene with a drawn screen lasts until its animation has finished, usually a little over 4 seconds. Make the animation fast enough for that.
- Plan the length from the words: a calm narrator speaks about 2.5 to 3 words per second. For a target length, write enough words; do not stretch scenes.
- Render the voice first and measure every line before fixing scene lengths.
- After the cut, look for silences longer than about 1.5 seconds with `ffmpeg -af silencedetect` and close them.
- Avoid a single-word sentence at the end of a line ("... appears. Live."). The voice model reads it oddly. If one slips through, cut the line at the pause before it.

## Sound

- Generated speech comes out quiet. Raise the voice (about +9 dB with a limiter) before mixing.
- Put the music about 20 dB under the voice. Measure it: compare the level in a gap between lines with the level during a line. A bed mixed "by feel" came out as loud as the voice.
- Keep each clip's own generated sound very low or drop it.
- You cannot hear the result. Report levels as measured, and ask the user to judge the mix.

## Order of work

1. Script: scenes, one voice line each, and what is drawn over each scene.
2. Reference pictures, then all start pictures. User approves.
3. One GPU session: voice and music first (minutes), then the clips. Check, redo, kill.
4. Cut with the overlays, measure pacing and sound, send.
5. Make one video completely before starting a batch of similar ones. The first one always changes the recipe.
