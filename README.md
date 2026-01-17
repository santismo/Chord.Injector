# Chord.Injector

## What this does
Chord.Injector listens to MIDI coming from Logic Pro (or converts an uploaded MIDI file), detects chords, injects Logic Pro chord-track metadata into an AIFF container, and exports an `.aif` you can drag back into Logic to see your chords on the Chord Track..

The exported AIFF contains:
- A Sequ chunk with chord-track events for Logic.
- A `.mid` chunk with the MIDI you captured or uploaded.

https://santismo.github.io/Chord.Injector/

## Workflow (Logic Pro)
1. Create an IAC/virtual MIDI bus in Audio MIDI Setup.
2. In Logic, set your track’s MIDI output to the IAC bus (or the Logic virtual output you want to monitor).
3. Open the web page and click `Enable MIDI`, then select the Logic output bus.
4. Click `Start Listening`, press play in Logic, then stop playback.
5. Click `Done Listening` to build the AIFF.
6. Click `Download AIFF`.
7. Drag the AIFF into Logic:
   - Drop on a MIDI instrument track to create a region that includes the MIDI.
   - The chord track will read the embedded chord data from the AIFF.

## Workflow (MIDI file)
1. Click `Choose MIDI file` and select your `.mid`.
2. Click `Convert MIDI to AIFF`.
3. Drag the AIFF into Logic as above.

## Notes
- In block-chord mode, enable `Hold block chords until next chord` to gate the chord lengths cleanly.
- `Preserve original MIDI notes` keeps the captured MIDI instead of generating block chords.(still experimental)
