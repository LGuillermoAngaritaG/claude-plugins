# Shorts

YouTube Shorts made from scratch on your Mac: upright 1080 x 1920, 45 to 60 seconds, one idea each.

## Skills

| Skill | Makes |
|---|---|
| `short-video` | A batch of Shorts for one of your channels or any topic. It picks the look of each idea, gets one approval of the idea list, builds every Short with no other stop, writes its title, description and sources, and uploads it as private. |
| `sketch-video` | The hand-drawn look: ink drawings on paper that draw themselves while the voice explains. |
| `story-video` | The story look: painted pictures with a slow camera, captions and a sound bed; crime stories first. |

The explainer look (3D cutaways, Codex pictures, Colab AI clips, 2D animation) comes from the `video-generation`
plugin's explainer guides.

Ask in plain words: "five Shorts for Cell to Cure", "a week of Shorts on money habits", "a 45 second sketch Short on
how a vaccine works".

## How it works

This plugin has no engine of its own. It runs on the `video-generation` plugin (a dependency): its workspace, voice
step, looks, checks, render, `publish.py` and `upload.py`. `scripts/video-plugin.sh` finds that plugin's folder,
beside this one in a checkout of the marketplace or from Claude Code's install record.

The engine knows a Short made on its own: `check.py` holds it to 45 to 60 seconds once it is voiced, `publish.py`
writes a Shorts description with no long video to link, and `upload.py` sends it as a Short.

## Needs

- The `video-generation` plugin and a workspace made by its `scripts/workspace.sh`.
- `SPEECHIFY_API_KEY` in your shell for the channels' Speechify voices.
- `PEXELS_API_KEY` or `PIXABAY_API_KEY` in your shell for stock footage (free keys); YouTube excerpts run `yt-dlp` through `uvx`.
- `atelier` with Codex for pictures; Colab for AI clips; your own YouTube uploader for uploads.
