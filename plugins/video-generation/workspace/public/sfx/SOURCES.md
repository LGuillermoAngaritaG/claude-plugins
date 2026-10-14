# Sound effects: sources

All files are wav, 48 kHz, 16-bit. One-shots are mono with a peak near -6 dBFS. Loops and beds peak near -12 dBFS.
Every recording is Creative Commons 0 (public domain). The licence was read on the page of each item on 2026-10-12.
The recordings were downloaded as the high quality mp3 preview from Freesound, so they went through mp3 once.
Kenney.nl packs were also looked at, but no file from them is used.

| File | Length (s) | What it is | Origin |
|---|---|---|---|
| `tick.wav` | 0.09 | Soft short tick: two quickly fading sine tones (1900 and 3100 Hz) | synthesized with ffmpeg, command below |
| `pop.wav` | 0.20 | Soft small pop: one sine tone that falls from 530 to 250 Hz and fades fast | synthesized with ffmpeg, command below |
| `chime.wav` | 2.00 | Soft single bell on G5 (784 Hz) with three quieter overtones and a light echo | synthesized with ffmpeg, command below |
| `sweep.wav` | 0.80 | Gentle airy sweep: filtered pink noise that moves from low to high. Loudest point about 0.36 s after the start | synthesized with ffmpeg, command below |
| `whoosh.wav` | 0.50 | Faster, stronger whoosh: filtered pink noise, low to high. Loudest point about 0.27 s after the start | synthesized with ffmpeg, command below |
| `pencil-short.wav` | 0.60 | One pencil stroke on paper, cut from a longer recording | Recording: "Draw & Trace - Pencil" by Vrymaa, https://freesound.org/people/Vrymaa/sounds/753216/ . Licence on that page: Creative Commons 0. Edit command below. |
| `pencil-long.wav` | 8.00 | Steady pencil sketching on paper. Pauses between strokes were shortened and the loudest taps softened | Recording: "Draw & Trace - Pencil" by Vrymaa, https://freesound.org/people/Vrymaa/sounds/753216/ . Licence on that page: Creative Commons 0. Edit command below. |
| `paper.wav` | 0.80 | One magazine page turn | Recording: "Page Turn 04" by LilMati, https://freesound.org/people/LilMati/sounds/397551/ . Licence on that page: Creative Commons 0. Edit command below. |
| `boom.wav` | 2.60 | Deep impact: a sine tone falling from 93 to 38 Hz with a short low noise thud and a long fade | synthesized with ffmpeg, command below |
| `hit.wav` | 1.10 | Short dark hit: a low thud, a quiet dissonant low chord and a dull noise burst | synthesized with ffmpeg, command below |
| `riser.wav` | 3.20 | Tension riser: two sine tones gliding up two octaves plus rising noise. It starts from silence and is loudest at the very end | synthesized with ffmpeg, command below |
| `heartbeat.wav` | 7.20 | Slow heartbeat, 50 beats per minute, exactly 6 beats. Loops as it is | synthesized with ffmpeg, command below |
| `key.wav` | 0.16 | One typewriter key strike, the fifth of six in the recording | Recording: "Foley_Object_Typewriter_Keys_&_Return_Mono_NTG4.wav" by Nox_Sound, https://freesound.org/people/Nox_Sound/sounds/550340/ . Licence on that page: Creative Commons 0. Edit command below. |
| `shutter.wav` | 0.33 | Shutter of a Pentax K20D camera | Recording: "Camera shutter (Pentax K20D)" by tnk, https://freesound.org/people/tnk/sounds/538142/ . Licence on that page: Creative Commons 0. Edit command below. |
| `drone.wav` | 48.00 | Dark low bed: steady low tones (41 to 220 Hz) that swell slowly, over quiet low noise. Stereo. Seamless loop | synthesized with ffmpeg, command below |
| `room.wav` | 32.00 | Quiet room tone: soft filtered pink noise. Stereo. Seamless loop | synthesized with ffmpeg, command below |

## Commands

Each sound was made in two steps. The first command makes the sound as a temporary file (`stage1.wav`).
The second command sets the peak level and writes the final file. ffmpeg version 8.1.2.
For recordings, the input file is the downloaded preview, named `<item id>_<author>.mp3`.

### tick.wav

```sh
ffmpeg -f lavfi -i "aevalsrc='0.8*sin(2*PI*1900*t)*exp(-t*85)+0.3*sin(2*PI*3100*t)*exp(-t*130)':d=0.09:s=48000,lowpass=f=6000,afade=t=in:d=0.002,afade=t=out:st=0.06:d=0.03" -ar 48000 -c:a pcm_f32le stage1.wav
ffmpeg -i stage1.wav -af "volume=-4.619368dB" -ar 48000 -ac 1 -c:a pcm_s16le tick.wav
```

### pop.wav

```sh
ffmpeg -f lavfi -i "aevalsrc='sin(2*PI*(250*t+280/40*(1-exp(-40*t))))*exp(-t*30)':d=0.2:s=48000,lowpass=f=2500,afade=t=in:d=0.003,afade=t=out:st=0.14:d=0.06" -ar 48000 -c:a pcm_f32le stage1.wav
ffmpeg -i stage1.wav -af "volume=-5.101622dB" -ar 48000 -ac 1 -c:a pcm_s16le pop.wav
```

### chime.wav

```sh
ffmpeg -f lavfi -i "aevalsrc='0.55*sin(2*PI*784*t)*exp(-2.4*t)+0.3*sin(2*PI*786.2*t)*exp(-2.4*t)+0.25*sin(2*PI*1568*t)*exp(-4*t)+0.1*sin(2*PI*2352*t)*exp(-6.5*t)+0.06*sin(2*PI*3136*t)*exp(-9*t)':d=2:s=48000,aecho=0.8:0.6:60|110:0.22|0.12,lowpass=f=7000,afade=t=in:d=0.004,afade=t=out:st=1.3:d=0.7,atrim=0:2" -ar 48000 -c:a pcm_f32le stage1.wav
ffmpeg -i stage1.wav -af "volume=-.276523dB" -ar 48000 -ac 1 -c:a pcm_s16le chime.wav
```

### sweep.wav

```sh
ffmpeg -filter_complex "anoisesrc=c=pink:d=0.8:r=48000:a=1:seed=11,asplit=3[a][b][c];[a]bandpass=f=450:t=o:w=1.4[a1];[b]bandpass=f=950:t=o:w=1.4[b1];[c]bandpass=f=2000:t=o:w=1.4[c1];aevalsrc='exp(-pow((t-0.30)/0.16,2))':d=0.8:s=48000[e1];aevalsrc='0.9*exp(-pow((t-0.40)/0.15,2))':d=0.8:s=48000[e2];aevalsrc='0.6*exp(-pow((t-0.50)/0.14,2))':d=0.8:s=48000[e3];[a1][e1]amultiply[x1];[b1][e2]amultiply[x2];[c1][e3]amultiply[x3];[x1][x2][x3]amix=inputs=3:normalize=0,lowpass=f=5000,afade=t=in:d=0.005,afade=t=out:st=0.7:d=0.1" -ar 48000 -c:a pcm_f32le stage1.wav
ffmpeg -i stage1.wav -af "volume=2.239937dB" -ar 48000 -ac 1 -c:a pcm_s16le sweep.wav
```

### whoosh.wav

```sh
ffmpeg -filter_complex "anoisesrc=c=pink:d=0.5:r=48000:a=1:seed=23,asplit=4[a][b][c][d];[a]bandpass=f=300:t=o:w=1.5[a1];[b]bandpass=f=800:t=o:w=1.5[b1];[c]bandpass=f=2200:t=o:w=1.5[c1];[d]bandpass=f=5000:t=o:w=1.5[d1];aevalsrc='0.8*exp(-pow((t-0.16)/0.09,2))':d=0.5:s=48000[e1];aevalsrc='exp(-pow((t-0.22)/0.08,2))':d=0.5:s=48000[e2];aevalsrc='exp(-pow((t-0.27)/0.07,2))':d=0.5:s=48000[e3];aevalsrc='0.7*exp(-pow((t-0.31)/0.07,2))':d=0.5:s=48000[e4];[a1][e1]amultiply[x1];[b1][e2]amultiply[x2];[c1][e3]amultiply[x3];[d1][e4]amultiply[x4];[x1][x2][x3][x4]amix=inputs=4:normalize=0,lowpass=f=8000,afade=t=in:d=0.004,afade=t=out:st=0.42:d=0.08" -ar 48000 -c:a pcm_f32le stage1.wav
ffmpeg -i stage1.wav -af "volume=2.508536dB" -ar 48000 -ac 1 -c:a pcm_s16le whoosh.wav
```

### pencil-short.wav

```sh
ffmpeg -ss 19.40 -t 1.00 -i 753216_Vrymaa.mp3 -af "highpass=f=90,silenceremove=start_periods=1:start_threshold=-50dB,atrim=0:0.60,afade=t=in:d=0.004,afade=t=out:st=0.52:d=0.08" -ar 48000 -c:a pcm_f32le stage1.wav
ffmpeg -i stage1.wav -af "volume=16.041197dB" -ar 48000 -ac 1 -c:a pcm_s16le pencil-short.wav
```

### pencil-long.wav

```sh
ffmpeg -ss 52.0 -t 11.6 -i 753216_Vrymaa.mp3 -af "highpass=f=90,silenceremove=start_periods=1:start_threshold=-50dB:stop_periods=-1:stop_duration=0.12:stop_silence=0.08:stop_threshold=-50dB,atrim=0:8,volume=10dB,alimiter=limit=0.25:attack=1:release=30:level=disabled,afade=t=in:d=0.004,afade=t=out:st=7.85:d=0.15" -ar 48000 -c:a pcm_f32le stage1.wav
ffmpeg -i stage1.wav -af "volume=.041200dB" -ar 48000 -ac 1 -c:a pcm_s16le pencil-long.wav
```

### paper.wav

```sh
ffmpeg -i 397551_LilMati.mp3 -af "pan=mono|c0=0.5*c0+0.5*c1,highpass=f=90,silenceremove=start_periods=1:start_threshold=-45dB,atrim=0:0.80,afade=t=in:d=0.004,afade=t=out:st=0.70:d=0.10" -ar 48000 -c:a pcm_f32le stage1.wav
ffmpeg -i stage1.wav -af "volume=4.238333dB" -ar 48000 -ac 1 -c:a pcm_s16le paper.wav
```

### boom.wav

```sh
ffmpeg -filter_complex "aevalsrc='st(0,2*PI*(38*t+55/9*(1-exp(-9*t))));(sin(ld(0))+0.3*sin(2*ld(0))*exp(-1.5*t)+0.1*sin(3*ld(0))*exp(-3*t))*exp(-1.7*t)*(1-exp(-t*300))':d=2.6:s=48000[s];anoisesrc=c=brown:d=2.6:r=48000:a=1:seed=5,lowpass=f=350[n];aevalsrc='0.4*exp(-11*t)':d=2.6:s=48000[e];[n][e]amultiply[nb];[s][nb]amix=inputs=2:normalize=0,aecho=0.8:0.7:105|184|263:0.2|0.14|0.09,lowpass=f=700,afade=t=out:st=1.7:d=0.9,atrim=0:2.6" -ar 48000 -c:a pcm_f32le stage1.wav
ffmpeg -i stage1.wav -af "volume=-2.051786dB" -ar 48000 -ac 1 -c:a pcm_s16le boom.wav
```

### hit.wav

```sh
ffmpeg -filter_complex "aevalsrc='st(0,2*PI*(46*t+40/14*(1-exp(-14*t))));sin(ld(0))*exp(-5*t)*(1-exp(-t*400))+(0.22*sin(2*PI*110*t)+0.2*sin(2*PI*116.5*t)+0.14*sin(2*PI*155.6*t)+0.06*sin(2*PI*311.1*t))*exp(-3.5*t)*(1-exp(-t*200))':d=1.1:s=48000[s];anoisesrc=c=pink:d=1.1:r=48000:a=1:seed=7,bandpass=f=500:t=o:w=2.5[n];aevalsrc='0.6*exp(-22*t)':d=1.1:s=48000[e];[n][e]amultiply[nb];[s][nb]amix=inputs=2:normalize=0,aecho=0.8:0.6:70|130:0.2|0.1,lowpass=f=3000,afade=t=out:st=0.7:d=0.4,atrim=0:1.1" -ar 48000 -c:a pcm_f32le stage1.wav
ffmpeg -i stage1.wav -af "volume=-1.244663dB" -ar 48000 -ac 1 -c:a pcm_s16le hit.wav
```

### riser.wav

```sh
ffmpeg -filter_complex "aevalsrc='st(0,2*PI*110*(exp(0.43322*t)-1)/0.43322);(0.5*sin(ld(0))+0.4*sin(1.012*ld(0))+0.15*sin(2*ld(0)))*pow(t/3.2,2)':d=3.2:s=48000[s];anoisesrc=c=pink:d=3.2:r=48000:a=1:seed=31,asplit=3[a][b][c];[a]bandpass=f=350:t=o:w=1.5[a1];[b]bandpass=f=1200:t=o:w=1.5[b1];[c]bandpass=f=3500:t=o:w=1.5[c1];aevalsrc='0.9*pow(t/3.2,1.5)':d=3.2:s=48000[e1];aevalsrc='0.9*pow(t/3.2,3)':d=3.2:s=48000[e2];aevalsrc='0.7*pow(t/3.2,6)':d=3.2:s=48000[e3];[a1][e1]amultiply[x1];[b1][e2]amultiply[x2];[c1][e3]amultiply[x3];[s][x1][x2][x3]amix=inputs=4:normalize=0,lowpass=f=7000,afade=t=out:st=3.185:d=0.015" -ar 48000 -c:a pcm_f32le stage1.wav
ffmpeg -i stage1.wav -af "volume=-7.854606dB" -ar 48000 -ac 1 -c:a pcm_s16le riser.wav
```

### heartbeat.wav

```sh
ffmpeg -f lavfi -i "aevalsrc='st(0,mod(t,1.2));st(1,ld(0)-0.32);st(2,2*PI*(46*ld(0)+26/22*(1-exp(-22*ld(0)))));st(3,2*PI*(56*ld(1)+26/26*(1-exp(-26*ld(1)))));(sin(ld(2))+0.5*sin(2*ld(2))+0.3*sin(3*ld(2))+0.15*sin(4*ld(2)))*exp(-16*ld(0))*(1-exp(-250*ld(0)))+gt(ld(1),0)*0.65*(sin(ld(3))+0.5*sin(2*ld(3))+0.3*sin(3*ld(3))+0.15*sin(4*ld(3)))*exp(-20*max(ld(1),0))*(1-exp(-250*max(ld(1),0)))':d=7.2:s=48000,lowpass=f=320" -ar 48000 -c:a pcm_f32le stage1.wav
ffmpeg -i stage1.wav -af "volume=-12.739020dB" -ar 48000 -ac 1 -c:a pcm_s16le heartbeat.wav
```

### key.wav

```sh
ffmpeg -ss 4.50 -t 0.70 -i 550340_Nox_Sound.mp3 -af "atrim=0.072:0.232,asetpts=PTS-STARTPTS,afade=t=in:d=0.002,afade=t=out:st=0.11:d=0.05" -ar 48000 -c:a pcm_f32le stage1.wav
ffmpeg -i stage1.wav -af "volume=-3.008950dB" -ar 48000 -ac 1 -c:a pcm_s16le key.wav
```

### shutter.wav

```sh
ffmpeg -i 538142_tnk.mp3 -af "pan=mono|c0=0.5*c0+0.5*c1,silenceremove=start_periods=1:start_threshold=-40dB,atrim=0:0.33,afade=t=in:d=0.002,afade=t=out:st=0.28:d=0.05" -ar 48000 -c:a pcm_f32le stage1.wav
ffmpeg -i stage1.wav -af "volume=-1.428363dB" -ar 48000 -ac 1 -c:a pcm_s16le shutter.wav
```

### drone.wav

```sh
ffmpeg -filter_complex "aevalsrc='0.5*sin(2*PI*55*t)*(0.75+0.25*sin(2*PI*t/24))+0.35*sin(2*PI*41.25*t)*(0.7+0.3*sin(2*PI*t/16+2))+0.3*sin(2*PI*82.5*t)*(0.6+0.4*sin(2*PI*t/16+1))+0.18*sin(2*PI*110*t)*(0.5+0.5*sin(2*PI*t/12))+0.05*sin(2*PI*130.8125*t)*(0.5+0.5*sin(2*PI*t/24+3))+0.08*sin(2*PI*165*t)*(0.5+0.5*sin(2*PI*t/48+1))+0.04*sin(2*PI*220*t)*(0.5+0.5*sin(2*PI*t/16+4))|0.5*sin(2*PI*55.0625*t)*(0.75+0.25*sin(2*PI*t/24+1.5))+0.35*sin(2*PI*41.25*t+1)*(0.7+0.3*sin(2*PI*t/16+3.5))+0.3*sin(2*PI*82.5625*t)*(0.6+0.4*sin(2*PI*t/16+2.5))+0.18*sin(2*PI*110*t+2)*(0.5+0.5*sin(2*PI*t/12+1.5))+0.05*sin(2*PI*130.8125*t+1)*(0.5+0.5*sin(2*PI*t/24+4.5))+0.08*sin(2*PI*165*t+2)*(0.5+0.5*sin(2*PI*t/48+2.5))+0.04*sin(2*PI*220*t+1)*(0.5+0.5*sin(2*PI*t/16+5.5))':d=48:s=48000:c=stereo[t];anoisesrc=c=brown:d=52:r=48000:a=1:seed=41,lowpass=f=180,lowpass=f=180[nl];anoisesrc=c=brown:d=52:r=48000:a=1:seed=42,lowpass=f=180,lowpass=f=180[nr];[nl][nr]join=inputs=2:channel_layout=stereo,volume=0.5,asplit[na][nb];[na]atrim=0:48,afade=t=in:d=4:curve=qsin[n1];[nb]atrim=48:52,asetpts=PTS-STARTPTS,afade=t=out:d=4:curve=qsin[n2];[t][n1][n2]amix=inputs=3:normalize=0:duration=first" -ar 48000 -c:a pcm_f32le stage1.wav
ffmpeg -i stage1.wav -af "volume=-13.900485dB" -ar 48000 -ac 2 -c:a pcm_s16le drone.wav
```

### room.wav

```sh
ffmpeg -filter_complex "anoisesrc=c=pink:d=35:r=48000:a=1:seed=51,highpass=f=70,lowpass=f=1800,lowpass=f=4000[nl];anoisesrc=c=pink:d=35:r=48000:a=1:seed=52,highpass=f=70,lowpass=f=1800,lowpass=f=4000[nr];[nl][nr]join=inputs=2:channel_layout=stereo,asplit[na][nb];[na]atrim=0:32,afade=t=in:d=3:curve=qsin[n1];[nb]atrim=32:35,asetpts=PTS-STARTPTS,afade=t=out:d=3:curve=qsin[n2];[n1][n2]amix=inputs=2:normalize=0:duration=first" -ar 48000 -c:a pcm_f32le stage1.wav
ffmpeg -i stage1.wav -af "volume=-6.916611dB" -ar 48000 -ac 2 -c:a pcm_s16le room.wav
```

## Loops

- `heartbeat.wav`: 6 beats of 1.2 s. The sound is silent at the end of each beat, so it loops with no crossfade.
- `drone.wav`: every tone and every slow swell fits a whole number of times into 48 s. The noise layer is 52 s long and its last 4 s are crossfaded over its first 4 s.
- `room.wav`: 35 s of noise, the last 3 s crossfaded over the first 3 s.
- `pencil-long.wav` is not a seamless loop. It has a short fade at both ends.
