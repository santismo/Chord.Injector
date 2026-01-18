# Chord.Injector Automation (GitHub Package)

## One-line install (edit the URL placeholders)
```bash
curl -L "https://github.com/santismo/Chord.Injector/archive/refs/heads/main.zip" -o chord-injector.zip \
  && unzip -q chord-injector.zip \
  && cd "Chord.Injector-main/chord.injector automation github" \
  && bash ./install.sh
```
`install.sh` copies the folder into `~/Downloads/Chord.Injector Automation` and opens it in Finder.

## First-time setup (manual)
1) Right-click the `chord.injector automation github` folder and choose **Open in Terminal**.
2) Run:
```bash
bash ./install.sh
```
3) Start the listener:
```bash
node ./process-midi.js
```

## Workflow
- Export a MIDI file from Logic into `Inbox/`.
- The converted `.chords.aif` appears in `Outbox/` and Finder will reveal it.
- Old outputs with the same name are moved to `Archive/`.

## Folder layout
```
chord.injector automation github/
├─ Inbox/            # Drop MIDI files here
├─ Outbox/           # Output AIFF files appear here
├─ Archive/          # Older outputs moved here if name matches
├─ process-midi.js   # Watcher/converter script
├─ template.part1    # AIFF template chunk 1
├─ template.part2    # AIFF template chunk 2
├─ configure-launchagent.sh
├─ com.chord.injector.watch.plist
├─ install.sh
└─ README.md
```

## Optional: run at login
`install.sh` creates `com.chord.injector.watch.local.plist` with your absolute paths.
```bash
cp ./com.chord.injector.watch.local.plist ~/Library/LaunchAgents/com.chord.injector.watch.plist
launchctl load ~/Library/LaunchAgents/com.chord.injector.watch.plist
```
