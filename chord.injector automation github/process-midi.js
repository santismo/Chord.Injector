#!/usr/bin/env node
"use strict";

const fs = require("fs/promises");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);

const ROOT = __dirname;
const INBOX = path.join(ROOT, "Inbox");
const OUTBOX = path.join(ROOT, "Outbox");
const ARCHIVE = path.join(ROOT, "Archive");
const TEMPLATE_PARTS = [path.join(ROOT, "template.part1"), path.join(ROOT, "template.part2")];

const OPTIONS = {
  minNotes: 3,
  ignoreDrums: true,
  preferFlats: true,
  useSlash: true,
  allowExtensions: true,
  emitNC: false,
  gateToNext: true
};

const NOTE_LENGTH_FACTOR = 0.25;
const INCLUDE_SEQU_NOTES = true;
const SEQU_NOTE_OFF_WORD = 0x00010000;

const NOTE_NAMES_SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const NOTE_NAMES_FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

const CHORD_PATTERNS = [
  { name: "7(9,#11,13)", intervals: [0, 2, 4, 6, 7, 9, 10], priority: 7 },
  { name: "m7(9,11,b13)", intervals: [0, 2, 3, 5, 7, 8, 10], priority: 7 },
  { name: "6(9,11)b5", intervals: [0, 2, 4, 5, 6, 9], priority: 6 },
  { name: "m(9,13,b5)", intervals: [0, 2, 3, 6, 9, 10], priority: 6 },
  { name: "aug7(9,11)", intervals: [0, 2, 4, 5, 8, 10], priority: 6 },
  { name: "7(9,b13)sus4", intervals: [0, 2, 5, 7, 8, 10], priority: 6 },
  { name: "m7(9,11)", intervals: [0, 2, 3, 5, 7, 10], priority: 6 },
  { name: "maj7(9)", intervals: [0, 2, 4, 7, 11], priority: 6 },
  { name: "9", intervals: [0, 2, 4, 7, 10], priority: 6 },
  { name: "7(b9)", intervals: [0, 1, 4, 7, 10], priority: 6 },
  { name: "7(#9)", intervals: [0, 3, 4, 7, 10], priority: 6 },
  { name: "7(9)sus4", intervals: [0, 2, 5, 7, 10], priority: 6 },
  { name: "no3(7,9,11,#5)", intervals: [0, 2, 5, 8, 10], priority: 6 },
  { name: "maj7(9)sus4", intervals: [0, 2, 5, 7, 11], priority: 6 },
  { name: "m7b5(13)", intervals: [0, 3, 6, 9, 10], priority: 6 },
  { name: "dim7(b9)", intervals: [0, 1, 3, 6, 9], priority: 6 },
  { name: "maj7", intervals: [0, 4, 7, 11], priority: 5 },
  { name: "7", intervals: [0, 4, 7, 10], priority: 5 },
  { name: "m7", intervals: [0, 3, 7, 10], priority: 5 },
  { name: "6", intervals: [0, 4, 7, 9], priority: 5 },
  { name: "mmaj7", intervals: [0, 3, 7, 11], priority: 5 },
  { name: "(b13)", intervals: [0, 4, 7, 8], priority: 4 },
  { name: "add11", intervals: [0, 4, 5, 7], priority: 4 },
  { name: "(#11)", intervals: [0, 4, 6, 7], priority: 4 },
  { name: "aug", intervals: [0, 4, 8], priority: 4 },
  { name: "dim", intervals: [0, 3, 6], priority: 4 },
  { name: "(b5)", intervals: [0, 4, 6], priority: 4 },
  { name: "no3(b5)", intervals: [0, 6], priority: 4 },
  { name: "sus2", intervals: [0, 2, 7], priority: 4 },
  { name: "sus4", intervals: [0, 5, 7], priority: 4 },
  { name: "", intervals: [0, 4, 7], priority: 4 },
  { name: "m", intervals: [0, 3, 7], priority: 4 },
  { name: "5", intervals: [0, 7], priority: 3 }
];

const ROOT_TO_PC = {
  C: 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  F: 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11
};

const SEQU_DESCRIPTOR_CODES = {
  "7(9,#11,13)": 0xd5060103,
  "6(9,11)b5": 0x65020205,
  "dim7(b9)": 0x4b020308,
  "": 0x9100070f,
  m: 0x8900070f,
  sus2: 0x8500070f,
  sus4: 0xa100070f,
  "5": 0x8100070f,
  "(b5)": 0x5100070f,
  "no3(b5)": 0x4100070f,
  dim: 0x4900070f,
  aug: 0x1101070f,
  "6": 0x9102070f,
  "7": 0x9104070f,
  "9": 0x9504070f,
  maj7: 0x9108070f,
  "7(b9)": 0x9304070f,
  "7(#9)": 0x9904070f,
  "maj7(9)": 0x9508070f,
  add11: 0xb100070f,
  "(#11)": 0xd100070f,
  "(b13)": 0x9101070f,
  mmaj7: 0x8908070f,
  m7: 0x8904070f,
  "m7(9,11)": 0xcd04070f,
  "aug7(9,11)": 0x3505070f,
  "7(9,b13)sus4": 0xa505070f,
  "m(9,13,b5)": 0x4d06070f,
  "7(9)sus4": 0xa504070f,
  "no3(7,9,11,#5)": 0x2505070f,
  "m7(9,11,b13)": 0xad05070f,
  "m7b5(13)": 0x4906070f,
  "maj7(9)sus4": 0xa508070f
};

const SEQU_SLASH_CODES = {
  "": 0x91000103
};

const SEQU_INTERVALS = {
  "7(9,#11,13)": [0, 2, 4, 6, 7, 9, 10],
  "6(9,11)b5": [0, 2, 4, 5, 6, 9],
  "dim7(b9)": [0, 1, 3, 6, 9],
  "": [0, 4, 7],
  m: [0, 3, 7],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  "5": [0, 7],
  "(b5)": [0, 4, 6],
  "no3(b5)": [0, 6],
  dim: [0, 3, 6],
  aug: [0, 4, 8],
  "6": [0, 4, 7, 9],
  "7": [0, 4, 7, 10],
  "9": [0, 2, 4, 7, 10],
  maj7: [0, 4, 7, 11],
  "7(b9)": [0, 1, 4, 7, 10],
  "7(#9)": [0, 3, 4, 7, 10],
  "maj7(9)": [0, 2, 4, 7, 11],
  add11: [0, 4, 5, 7],
  "(#11)": [0, 4, 6, 7],
  "(b13)": [0, 4, 7, 8],
  mmaj7: [0, 3, 7, 11],
  m7: [0, 3, 7, 10],
  "m7(9,11)": [0, 2, 3, 5, 7, 10],
  "aug7(9,11)": [0, 2, 4, 5, 8, 10],
  "7(9,b13)sus4": [0, 2, 5, 7, 8, 10],
  "m(9,13,b5)": [0, 2, 3, 6, 9, 10],
  "7(9)sus4": [0, 2, 5, 7, 10],
  "no3(7,9,11,#5)": [0, 2, 5, 8, 10],
  "m7(9,11,b13)": [0, 2, 3, 5, 7, 8, 10],
  "m7b5(13)": [0, 3, 6, 9, 10],
  "maj7(9)sus4": [0, 2, 5, 7, 11]
};

const DESCRIPTOR_PREFIX_OVERRIDES = {
  "6(9,11)b5": 0x03
};

let templateAiffBuffer = null;
let templateSequInfo = null;

function readVarLen(view, offset) {
  let value = 0;
  let i = 0;
  while (true) {
    const byte = view.getUint8(offset + i);
    value = (value << 7) | (byte & 0x7f);
    i += 1;
    if (!(byte & 0x80)) break;
    if (i > 4) throw new Error("Invalid varlen");
  }
  return { value, length: i };
}

function writeVarLen(value) {
  const bytes = [value & 0x7f];
  let v = value >>> 7;
  while (v > 0) {
    bytes.unshift((v & 0x7f) | 0x80);
    v >>>= 7;
  }
  return bytes;
}

function parseMidiNoteEvents(buffer, options) {
  const view = new DataView(buffer);
  let offset = 0;

  function readStr(len) {
    let s = "";
    for (let i = 0; i < len; i++) {
      s += String.fromCharCode(view.getUint8(offset + i));
    }
    offset += len;
    return s;
  }

  function readU32() {
    const v = view.getUint32(offset, false);
    offset += 4;
    return v;
  }

  function readU16() {
    const v = view.getUint16(offset, false);
    offset += 2;
    return v;
  }

  if (readStr(4) !== "MThd") {
    throw new Error("Not a MIDI file");
  }
  const headerLen = readU32();
  const format = readU16();
  const numTracks = readU16();
  const division = readU16();
  if (division & 0x8000) {
    throw new Error("SMPTE time format is not supported.");
  }
  offset += Math.max(0, headerLen - 6);

  const noteEvents = [];

  for (let t = 0; t < numTracks; t++) {
    const chunkId = readStr(4);
    if (chunkId !== "MTrk") {
      throw new Error("Missing MTrk chunk");
    }
    const trackLen = readU32();
    const trackEnd = offset + trackLen;
    let absTicks = 0;
    let runningStatus = null;

    while (offset < trackEnd) {
      const deltaInfo = readVarLen(view, offset);
      offset += deltaInfo.length;
      absTicks += deltaInfo.value;

      const statusByte = view.getUint8(offset);
      let status;
      if (statusByte < 0x80) {
        if (runningStatus === null) {
          throw new Error("Running status without prior status");
        }
        status = runningStatus;
        offset += 1;
      } else {
        status = statusByte;
        offset += 1;
        if (status < 0xf0) {
          runningStatus = status;
        } else {
          runningStatus = null;
        }
      }

      if (status === 0xff) {
        offset += 1;
        const lenInfo = readVarLen(view, offset);
        offset += lenInfo.length + lenInfo.value;
        continue;
      }

      if (status === 0xf0 || status === 0xf7) {
        const lenInfo = readVarLen(view, offset);
        offset += lenInfo.length + lenInfo.value;
        continue;
      }

      const messageType = status & 0xf0;
      const dataLen = messageType === 0xc0 || messageType === 0xd0 ? 1 : 2;
      const channel = status & 0x0f;
      let data0;
      let data1 = 0;

      if (statusByte < 0x80) {
        data0 = statusByte;
      } else {
        data0 = view.getUint8(offset);
        offset += 1;
      }

      if (dataLen === 2) {
        data1 = view.getUint8(offset);
        offset += 1;
      }

      if (messageType === 0x90 || messageType === 0x80) {
        if (!(options.ignoreDrums && channel === 9)) {
          const velocity = data1 || 0;
          const isOn = messageType === 0x90 && velocity > 0;
          const isOff = messageType === 0x80 || (messageType === 0x90 && velocity === 0);
          if (isOn || isOff) {
            noteEvents.push({ tick: absTicks, note: data0, on: isOn, channel, velocity: data1 });
          }
        }
      }
    }
  }

  noteEvents.sort((a, b) => {
    if (a.tick !== b.tick) return a.tick - b.tick;
    if (a.on === b.on) return 0;
    return a.on ? -1 : 1;
  });

  return { noteEvents, ppq: division, format, numTracks };
}

function parseMidiTiming(midiBytes) {
  const buffer = midiBytes instanceof Uint8Array
    ? midiBytes.buffer.slice(midiBytes.byteOffset, midiBytes.byteOffset + midiBytes.byteLength)
    : midiBytes;
  const view = new DataView(buffer);
  let offset = 0;

  function readStr(len) {
    let s = "";
    for (let i = 0; i < len; i++) {
      s += String.fromCharCode(view.getUint8(offset + i));
    }
    offset += len;
    return s;
  }

  function readU32() {
    const v = view.getUint32(offset, false);
    offset += 4;
    return v;
  }

  function readU16() {
    const v = view.getUint16(offset, false);
    offset += 2;
    return v;
  }

  if (readStr(4) !== "MThd") {
    throw new Error("Not a MIDI file");
  }
  const headerLen = readU32();
  readU16();
  const numTracks = readU16();
  const division = readU16();
  if (division & 0x8000) {
    throw new Error("SMPTE time format is not supported.");
  }
  offset += Math.max(0, headerLen - 6);

  const tempos = [];
  let lastTick = 0;

  for (let t = 0; t < numTracks; t++) {
    if (readStr(4) !== "MTrk") {
      throw new Error("Invalid MIDI track header");
    }
    const trackLen = readU32();
    const trackEnd = offset + trackLen;
    let absTicks = 0;
    let runningStatus = null;

    while (offset < trackEnd) {
      const { value: delta, length } = readVarLen(view, offset);
      offset += length;
      absTicks += delta;
      let statusByte = view.getUint8(offset);
      if (statusByte < 0x80 && runningStatus !== null) {
        statusByte = runningStatus;
      } else {
        offset += 1;
        runningStatus = statusByte < 0xf0 ? statusByte : null;
      }

      if (statusByte === 0xff) {
        const metaType = view.getUint8(offset);
        offset += 1;
        const metaLen = readVarLen(view, offset);
        offset += metaLen.length;
        if (metaType === 0x51 && metaLen.value === 3) {
          const tempo = (view.getUint8(offset) << 16) | (view.getUint8(offset + 1) << 8) | view.getUint8(offset + 2);
          tempos.push({ tick: absTicks, tempo });
        }
        offset += metaLen.value;
        continue;
      }

      if (statusByte === 0xf0 || statusByte === 0xf7) {
        const sysLen = readVarLen(view, offset);
        offset += sysLen.length + sysLen.value;
        continue;
      }

      const type = statusByte & 0xf0;
      if (type === 0xc0 || type === 0xd0) {
        offset += 1;
      } else {
        offset += 2;
      }
    }

    if (absTicks > lastTick) lastTick = absTicks;
  }

  tempos.sort((a, b) => a.tick - b.tick);
  return { ppq: division, tempos, lastTick };
}

function getMidiDurationSeconds(midiBytes) {
  const timing = parseMidiTiming(midiBytes);
  const ppq = timing.ppq;
  const lastTick = timing.lastTick;
  const tempos = timing.tempos.length ? timing.tempos : [{ tick: 0, tempo: 500000 }];
  let tempo = 500000;
  let timeSec = 0;
  let prevTick = 0;
  tempos.forEach((entry) => {
    if (entry.tick > prevTick) {
      timeSec += ((entry.tick - prevTick) / ppq) * (tempo / 1000000);
      prevTick = entry.tick;
    }
    tempo = entry.tempo;
  });
  if (lastTick > prevTick) {
    timeSec += ((lastTick - prevTick) / ppq) * (tempo / 1000000);
  }
  return timeSec;
}

function getMidiBeatCount(midiBytes) {
  const timing = parseMidiTiming(midiBytes);
  if (!timing.ppq) return 1;
  const beats = timing.lastTick / timing.ppq;
  return Math.max(1, Math.ceil(beats));
}

function getChordTicks(chords) {
  if (!Array.isArray(chords)) return [];
  return chords
    .map((ch) => (ch && Number.isFinite(ch.tick) ? Math.max(0, Math.round(ch.tick)) : null))
    .filter((tick) => tick !== null);
}

function normalizeChordTicks(chordTicks) {
  if (!Array.isArray(chordTicks) || !chordTicks.length) return null;
  const sorted = chordTicks.slice().sort((a, b) => a - b);
  const unique = [];
  sorted.forEach((tick) => {
    if (!unique.length || unique[unique.length - 1] !== tick) {
      unique.push(tick);
    }
  });
  return unique.length > 1 ? unique : null;
}

function getNextChordTick(tick, chordTicks) {
  if (!chordTicks || chordTicks.length < 2) return null;
  let left = 0;
  let right = chordTicks.length - 1;
  let result = null;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const value = chordTicks[mid];
    if (value > tick) {
      result = value;
      right = mid - 1;
    } else {
      left = mid + 1;
    }
  }
  return result;
}

function parseChordName(name) {
  if (!name || name === "N.C.") return null;
  const parts = name.split("/");
  const base = parts[0];
  const match = base.match(/^([A-G])([b#]?)(.*)$/);
  if (!match) return null;
  const rootName = match[1] + match[2];
  const qualityText = match[3] || "";
  const rootPc = ROOT_TO_PC[rootName];
  if (rootPc === undefined) return null;
  const quality = normalizeQuality(qualityText);
  if (!quality && quality !== "") return null;
  let bassPc = null;
  if (parts.length > 1 && parts[1]) {
    const bassMatch = parts[1].match(/^([A-G])([b#]?)$/);
    if (bassMatch) {
      const bassName = bassMatch[1] + bassMatch[2];
      if (ROOT_TO_PC[bassName] !== undefined) {
        bassPc = ROOT_TO_PC[bassName];
      }
    }
  }
  return { rootPc, quality, bassPc };
}

function normalizeQuality(qualityText) {
  const text = (qualityText || "").toLowerCase().replace(/\s+/g, "");
  if (!text) return "";
  const parenMatch = text.match(/\(([^)]+)\)/);
  const parenTokens = parenMatch ? parenMatch[1].split(",") : [];
  const baseText = parenMatch ? text.replace(/\([^)]*\)/, "") : text;
  if (text === "maj") return "";
  if (text === "min" || text === "minor") return "m";
  if (text === "5") return "5";
  if (text.startsWith("no3(")) {
    if (text.includes("7,9,11,#5")) return "no3(7,9,11,#5)";
    if (text.includes("b5")) return "no3(b5)";
  }
  if (text.startsWith("7(") && baseText.includes("sus4")) {
    if (parenTokens.includes("9") && parenTokens.includes("b13")) return "7(9,b13)sus4";
    if (parenTokens.includes("9")) return "7(9)sus4";
  }
  if (text.startsWith("7(")) {
    if (parenTokens.includes("9") && parenTokens.includes("#11") && parenTokens.includes("13")) {
      return "7(9,#11,13)";
    }
  }
  if (text.startsWith("m7(")) {
    if (text.includes("9,11,b13")) return "m7(9,11,b13)";
    if (text.includes("9,11") || text.includes("9,#11")) return "m7(9,11)";
  }
  if (text.startsWith("m(") && text.includes("9,13,b5")) return "m(9,13,b5)";
  if (text.startsWith("aug7") && text.includes("9,11")) return "aug7(9,11)";
  if (text.startsWith("maj7") && text.includes("9") && text.includes("sus4")) {
    return "maj7(9)sus4";
  }
  if (text.startsWith("maj7") && text.includes("9")) return "maj7(9)";
  if (text.includes("7,9,b13") && text.includes("sus4")) return "7(9,b13)sus4";
  if (text.includes("7,9") && text.includes("sus4")) return "7(9)sus4";
  if (text.includes("7,9,#11,13") || (text.includes("13") && text.includes("#11") && text.includes("7"))) {
    return "7(9,#11,13)";
  }
  if (text.startsWith("6(") && text.includes("9,11") && text.includes("b5")) {
    return "6(9,11)b5";
  }
  if (text.startsWith("dim7") && text.includes("b9")) return "dim7(b9)";
  if (text.startsWith("m7b5") && text.includes("13")) return "m7b5(13)";
  if (text.startsWith("mmaj7")) return "mmaj7";
  if (text === "(b5)" || text === "b5") return "(b5)";
  if (text === "(#11)" || text === "#11") return "(#11)";
  if (text === "(b13)" || text === "b13") return "(b13)";
  if (text.startsWith("add11")) return "add11";
  if (text.startsWith("7(") && text.includes("b9")) return "7(b9)";
  if (text.startsWith("7(") && text.includes("#9")) return "7(#9)";
  if (text === "7b9") return "7(b9)";
  if (text === "7#9") return "7(#9)";
  if (text.startsWith("maj7")) return "maj7";
  if (text === "7") return "7";
  if (text === "9") return "9";
  if (text === "6") return "6";
  if (text.startsWith("sus2")) return "sus2";
  if (text.startsWith("sus4")) return "sus4";
  if (text.startsWith("dim")) return "dim";
  if (text.startsWith("aug")) return "aug";
  if (text.startsWith("m7")) return "m7";
  if (text === "m") return "m";
  if (text.startsWith("m")) return "m";
  return "";
}

function buildChordNotes(rootPc, quality, bassPc = null) {
  const intervals = SEQU_INTERVALS[quality] || SEQU_INTERVALS[""];
  const lowRoot = (rootPc >= 7 ? 36 : 48) + rootPc;
  const notes = [];
  if (bassPc !== null && bassPc !== rootPc) {
    let lowBass = (bassPc >= 7 ? 36 : 48) + bassPc;
    if (lowBass >= lowRoot) {
      lowBass -= 12;
    }
    notes.push(lowBass);
  }
  notes.push(lowRoot);
  intervals.forEach((interval) => {
    notes.push(lowRoot + 12 + interval);
  });
  return Array.from(new Set(notes)).filter((n) => n >= 0 && n <= 127);
}

function makeSequRecord(w0, w1, w2, w3) {
  return [w0 >>> 0, w1 >>> 0, w2 >>> 0, w3 >>> 0];
}

function writeUint32BE(view, offset, value) {
  view.setUint32(offset, value >>> 0, false);
}

function readFourCC(view, offset) {
  return String.fromCharCode(
    view.getUint8(offset),
    view.getUint8(offset + 1),
    view.getUint8(offset + 2),
    view.getUint8(offset + 3)
  );
}

function readExtended80(view, offset) {
  const rawExp = view.getUint16(offset, false);
  const hiMant = view.getUint32(offset + 2, false);
  const loMant = view.getUint32(offset + 6, false);
  if (rawExp === 0 && hiMant === 0 && loMant === 0) return 0;
  const sign = rawExp & 0x8000 ? -1 : 1;
  const exp = (rawExp & 0x7fff) - 16383;
  const mant = hiMant * Math.pow(2, -31) + loMant * Math.pow(2, -63);
  return sign * mant * Math.pow(2, exp);
}

function parseAiffChunks(buffer) {
  const view = new DataView(buffer);
  const chunks = [];
  let offset = 12;
  while (offset + 8 <= buffer.byteLength) {
    const id = readFourCC(view, offset);
    const size = view.getUint32(offset + 4, false);
    const dataStart = offset + 8;
    const dataEnd = dataStart + size;
    chunks.push({ id, size, dataStart, dataEnd });
    offset = dataEnd + (size % 2);
  }
  return chunks;
}

function parseSequInfo(sequBytes) {
  const view = new DataView(sequBytes.buffer, sequBytes.byteOffset, sequBytes.byteLength);
  const signature = readFourCC(view, 0);
  if (signature !== "qSvE") {
    throw new Error("Unexpected Sequ signature: " + signature);
  }
  const recordCount = Math.floor((sequBytes.length - 4) / 16);
  const records = [];
  for (let i = 0; i < recordCount; i++) {
    const base = 4 + i * 16;
    const w0 = view.getUint32(base, false);
    const w1 = view.getUint32(base + 4, false);
    const w2 = view.getUint32(base + 8, false);
    const w3 = view.getUint32(base + 12, false);
    records.push({ w0, w1, w2, w3 });
  }
  const headerRecords = records.slice(0, 2).map((rec) => [rec.w0, rec.w1, rec.w2, rec.w3]);
  const posValues = [];
  const descriptorPairs = [];
  let currentPos = null;

  records.forEach((rec) => {
    if (rec.w0 === 0x32000000) {
      const rawPos = rec.w1 >>> 16;
      const cleanPos = rawPos & 0x7fff;
      currentPos = cleanPos;
      posValues.push(cleanPos);
    }
    if ((rec.w1 & 0xff) === 0xb2 && currentPos !== null) {
      descriptorPairs.push({ pos: currentPos, time: rec.w3, code: rec.w0 });
    }
  });

  let posBase = 0x96;
  let posStep = null;
  if (descriptorPairs.length) {
    posBase = descriptorPairs[0].pos;
    const diffCounts = new Map();
    for (let i = 1; i < descriptorPairs.length; i++) {
      const diff = descriptorPairs[i].pos - descriptorPairs[i - 1].pos;
      if (diff > 0) {
        diffCounts.set(diff, (diffCounts.get(diff) || 0) + 1);
      }
    }
    if (diffCounts.size) {
      let bestDiff = null;
      let bestCount = -1;
      diffCounts.forEach((count, diff) => {
        if (count > bestCount) {
          bestCount = count;
          bestDiff = diff;
        }
      });
      posStep = bestDiff;
    }
  } else if (posValues.length) {
    const uniquePos = Array.from(new Set(posValues)).sort((a, b) => a - b);
    posBase = uniquePos[0];
    for (let i = 1; i < uniquePos.length; i++) {
      const diff = uniquePos[i] - uniquePos[i - 1];
      if (diff > 0 && (posStep === null || diff < posStep)) {
        posStep = diff;
      }
    }
  }
  if (!posStep) posStep = 0x0f;

  let timeBase = 0x8020b50a;
  let timeScale = 0;
  if (descriptorPairs.length) {
    timeBase = descriptorPairs[0].time;
    const basePos = descriptorPairs[0].pos;
    const next = descriptorPairs.find((pair) => pair.time !== timeBase && pair.pos !== basePos);
    if (next) {
      timeScale = (next.time - timeBase) / (next.pos - basePos);
    }
  }
  const timeCountsByCode = new Map();
  descriptorPairs.forEach((pair) => {
    if (!timeCountsByCode.has(pair.code)) {
      timeCountsByCode.set(pair.code, new Map());
    }
    const codeMap = timeCountsByCode.get(pair.code);
    codeMap.set(pair.time, (codeMap.get(pair.time) || 0) + 1);
  });
  const descriptorTimeByCode = new Map();
  const descriptorTimeStable = new Set();
  timeCountsByCode.forEach((timeMap, code) => {
    let bestTime = null;
    let bestCount = -1;
    timeMap.forEach((count, time) => {
      if (count > bestCount) {
        bestCount = count;
        bestTime = time;
      }
    });
    if (bestTime !== null) {
      descriptorTimeByCode.set(code, bestTime);
      if (timeMap.size === 1) {
        descriptorTimeStable.add(code);
      }
    }
  });
  return {
    headerRecords,
    posBase,
    posStep,
    timeBase,
    timeScale,
    descriptorTimeByCode,
    descriptorTimeStable,
    maxRecords: recordCount
  };
}

function buildSequNoteRecordsFromMidi(noteEvents, sequInfo, ppq) {
  if (!Array.isArray(noteEvents) || !noteEvents.length) return [];
  const ticksPerPos = (4 * ppq) / sequInfo.posStep;
  const events = noteEvents
    .map((ev, idx) => ({ ...ev, order: idx }))
    .sort((a, b) => (a.tick !== b.tick ? a.tick - b.tick : (a.on === b.on ? a.order - b.order : a.on ? -1 : 1)));
  const stacks = new Map();
  const pairs = [];
  events.forEach((event) => {
    const key = `${event.channel ?? 0}-${event.note}`;
    if (event.on) {
      if (!stacks.has(key)) stacks.set(key, []);
      stacks.get(key).push(event.tick);
    } else {
      const stack = stacks.get(key);
      if (stack && stack.length) {
        const onTick = stack.pop();
        pairs.push({ onTick, offTick: event.tick, note: event.note });
      }
    }
  });
  pairs.sort((a, b) => a.onTick - b.onTick);
  const records = [];
  pairs.forEach((pair) => {
    const posOn = sequInfo.posBase + Math.round(pair.onTick / ticksPerPos);
    const posVal = ((posOn & 0xffff) << 16) >>> 0;
    const durationTicks = Math.max(1, pair.offTick - pair.onTick);
    const durationPos = Math.max(1, Math.round(durationTicks / ticksPerPos));
    const durationWord = (Math.min(durationPos, 0x7fff) & 0xffff) << 16;
    const noteWord = ((pair.note & 0x7f) << 24) | 0x80;
    records.push(makeSequRecord(0x90000000, posVal, 0x00009264, noteWord));
    records.push(makeSequRecord(0x40000000, 0x00000089, 0x00000000, durationWord >>> 0));
  });
  return records;
}

function buildSequChunk(chords, sequInfo, ppq, includeNotes, noteEvents, gateToNext, endTick) {
  const records = [];
  records.push(...sequInfo.headerRecords);
  const ticksPerPos = (4 * ppq) / sequInfo.posStep;
  let encodedCount = 0;
  const useSequNotes = typeof includeNotes === "boolean" ? includeNotes : INCLUDE_SEQU_NOTES;
  const sortedChords = Array.isArray(chords)
    ? chords
        .filter((ch) => ch && Number.isFinite(ch.tick))
        .slice()
        .sort((a, b) => a.tick - b.tick)
    : [];
  const chordPositions = sortedChords.map((chord) => ({
    chord,
    posClean: sequInfo.posBase + Math.round(chord.tick / ticksPerPos)
  }));
  let noteRecords = null;
  if (useSequNotes && Array.isArray(noteEvents) && noteEvents.length) {
    noteRecords = buildSequNoteRecordsFromMidi(noteEvents, sequInfo, ppq);
    const maxRecords = sequInfo.maxRecords || Number.POSITIVE_INFINITY;
    const estimated =
      sequInfo.headerRecords.length +
      chords.length * 4 +
      (noteRecords.length || 0) +
      1;
    if (estimated > maxRecords) {
      noteRecords = null;
    }
  }

  const endPos = Number.isFinite(endTick)
    ? sequInfo.posBase + Math.round(endTick / ticksPerPos)
    : null;

  chordPositions.forEach((entry, index) => {
    const chord = entry.chord;
    const parsed = parseChordName(chord.name);
    if (!parsed) return;
    encodedCount += 1;
    const baseDescriptor = SEQU_DESCRIPTOR_CODES[parsed.quality] || SEQU_DESCRIPTOR_CODES[""];
    const hasSlash = parsed.bassPc !== null && parsed.bassPc !== parsed.rootPc;
    const descriptor = hasSlash
      ? (SEQU_SLASH_CODES[parsed.quality] || baseDescriptor)
      : baseDescriptor;
    const prefix = DESCRIPTOR_PREFIX_OVERRIDES[parsed.quality] ?? 0x02;
    const posClean = entry.posClean;
    const posFlag = prefix === 0x03 ? 0x8000 : 0;
    const posVal = ((posClean | posFlag) & 0xffff) << 16;
    let timeWord = Math.round(
      sequInfo.timeBase + (posClean - sequInfo.posBase) * sequInfo.timeScale
    );
    if (sequInfo.descriptorTimeByCode && sequInfo.descriptorTimeByCode.has(descriptor)) {
      timeWord = sequInfo.descriptorTimeByCode.get(descriptor);
    } else {
      timeWord = sequInfo.timeBase;
    }
    const descriptorWord = (prefix << 24) | (parsed.rootPc << 16) | 0x00b2;

    records.push(makeSequRecord(0x32000000, posVal, 0x00000000, 0x07000001));
    records.push(makeSequRecord(0x00000000, 0x00000088, 0x00000000, 0x00000000));
    records.push(makeSequRecord(0x70000000, posVal, 0x00000000, 0x67000001));
    records.push(makeSequRecord(descriptor, descriptorWord, 0x00000000, timeWord));

    if (useSequNotes && !noteRecords) {
      const notes = buildChordNotes(parsed.rootPc, parsed.quality, parsed.bassPc);
      let durationWord = SEQU_NOTE_OFF_WORD;
      if (gateToNext) {
        let nextPos = null;
        if (index + 1 < chordPositions.length) {
          nextPos = chordPositions[index + 1].posClean;
        } else if (Number.isFinite(endPos) && endPos > posClean) {
          nextPos = endPos;
        }
        if (Number.isFinite(nextPos) && nextPos > posClean) {
          const durationPos = Math.max(1, nextPos - posClean);
          durationWord = (Math.min(durationPos, 0x7fff) & 0xffff) << 16;
        }
      }
      notes.forEach((note) => {
        const noteWord = ((note & 0x7f) << 24) | 0x80;
        records.push(makeSequRecord(0x90000000, posVal, 0x00009264, noteWord));
        records.push(makeSequRecord(0x40000000, 0x00000089, 0x00000000, durationWord));
      });
    }
  });

  if (noteRecords) {
    records.push(...noteRecords);
  }

  records.push(makeSequRecord(0xf1000000, 0xffffff3f, 0x00000000, 0x00000000));

  const out = new Uint8Array(4 + records.length * 16);
  out.set([0x71, 0x53, 0x76, 0x45], 0);
  const view = new DataView(out.buffer);
  records.forEach((record, idx) => {
    const base = 4 + idx * 16;
    writeUint32BE(view, base, record[0]);
    writeUint32BE(view, base + 4, record[1]);
    writeUint32BE(view, base + 8, record[2]);
    writeUint32BE(view, base + 12, record[3]);
  });
  return { bytes: out, encodedCount };
}

function buildAiffWithSequ(templateBuffer, sequBytes, midiBytes) {
  const view = new DataView(templateBuffer);
  const formType = readFourCC(view, 8);
  if (formType !== "AIFF") {
    throw new Error("Template is not AIFF.");
  }
  const chunks = parseAiffChunks(templateBuffer);
  const out = new Uint8Array(templateBuffer.slice(0));
  const midiData = midiBytes
    ? (midiBytes instanceof Uint8Array ? midiBytes : new Uint8Array(midiBytes))
    : null;

  const sequChunk = chunks.find((chunk) => chunk.id === "Sequ");
  if (!sequChunk) {
    throw new Error("Template Sequ chunk not found.");
  }
  if (sequBytes.length > sequChunk.size) {
    throw new Error("Sequ data exceeds template chunk size.");
  }
  out.set(sequBytes, sequChunk.dataStart);
  out.fill(0, sequChunk.dataStart + sequBytes.length, sequChunk.dataEnd);

  if (midiData) {
    const midiChunk = chunks.find((chunk) => chunk.id === ".mid");
    if (!midiChunk) {
      throw new Error("Template MIDI chunk not found.");
    }
    if (midiData.length > midiChunk.size) {
      throw new Error("MIDI data exceeds template chunk size.");
    }
    out.set(midiData, midiChunk.dataStart);
    out.fill(0, midiChunk.dataStart + midiData.length, midiChunk.dataEnd);
  }

  if (midiData) {
    return trimAiffToMidi(out, chunks, midiData);
  }
  return out;
}

function trimAiffToMidi(outBytes, chunks, midiData) {
  const buffer = outBytes.buffer.slice(outBytes.byteOffset, outBytes.byteOffset + outBytes.byteLength);
  const view = new DataView(buffer);
  const commChunk = chunks.find((chunk) => chunk.id === "COMM");
  const ssndChunk = chunks.find((chunk) => chunk.id === "SSND");
  const bascChunk = chunks.find((chunk) => chunk.id === "basc");
  if (!commChunk || !ssndChunk) {
    return outBytes;
  }
  if (ssndChunk.dataEnd !== buffer.byteLength) {
    return outBytes;
  }
  const numChannels = view.getUint16(commChunk.dataStart, false);
  const sampleFramesOffset = commChunk.dataStart + 2;
  const sampleSize = view.getUint16(commChunk.dataStart + 6, false);
  const sampleRate = readExtended80(view, commChunk.dataStart + 8);
  if (!sampleRate || !numChannels || !sampleSize) {
    return outBytes;
  }

  let durationSeconds = 0;
  try {
    durationSeconds = getMidiDurationSeconds(midiData);
  } catch (err) {
    return outBytes;
  }
  durationSeconds = Math.max(0, durationSeconds + 0.05);

  const bytesPerSample = Math.max(1, Math.ceil(sampleSize / 8));
  const bytesPerFrame = bytesPerSample * numChannels;
  let targetFrames = Math.max(1, Math.ceil(durationSeconds * sampleRate));
  let targetDataBytes = targetFrames * bytesPerFrame;

  const offset = view.getUint32(ssndChunk.dataStart, false);
  const availableDataBytes = ssndChunk.size - 8 - offset;
  if (availableDataBytes <= 0) {
    return outBytes;
  }
  if (targetDataBytes > availableDataBytes) {
    targetDataBytes = availableDataBytes;
    targetFrames = Math.floor(targetDataBytes / bytesPerFrame);
  }
  const newSsndSize = 8 + offset + targetDataBytes;
  const newFileLength = ssndChunk.dataStart + newSsndSize;

  view.setUint32(sampleFramesOffset, targetFrames >>> 0, false);
  view.setUint32(ssndChunk.dataStart - 4, newSsndSize >>> 0, false);
  view.setUint32(4, newFileLength - 8, false);

  if (bascChunk && bascChunk.size >= 8) {
    const beatCount = getMidiBeatCount(midiData);
    view.setUint32(bascChunk.dataStart + 4, beatCount >>> 0, false);
  }

  return new Uint8Array(buffer.slice(0, newFileLength));
}

function validateAiffMidi(bytes) {
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const chunks = parseAiffChunks(buffer);
  const midiChunk = chunks.find((chunk) => chunk.id === ".mid");
  if (!midiChunk) {
    throw new Error("Output AIFF is missing embedded MIDI.");
  }
  const midiData = new Uint8Array(buffer.slice(midiChunk.dataStart, midiChunk.dataEnd));
  if (!isMidiBytes(midiData)) {
    throw new Error("Embedded MIDI chunk is invalid.");
  }
}

function isMidiBytes(data) {
  if (!data) return false;
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  if (bytes.length < 4) return false;
  return bytes[0] === 0x4d && bytes[1] === 0x54 && bytes[2] === 0x68 && bytes[3] === 0x64;
}

function identifyChord(activeNotes, options) {
  if (!activeNotes.length) return null;
  const pcSet = new Set(activeNotes.map((n) => n % 12));
  const uniquePcs = Array.from(pcSet).sort((a, b) => a - b);
  if (uniquePcs.length < options.minNotes) return null;
  let best = null;

  for (let root = 0; root < 12; root++) {
    const intervals = uniquePcs.map((pc) => (pc - root + 12) % 12).sort((a, b) => a - b);
    const intervalSet = new Set(intervals);
    for (const pattern of CHORD_PATTERNS) {
      const patternSet = new Set(pattern.intervals);
      let matches = true;
      patternSet.forEach((val) => {
        if (!intervalSet.has(val)) matches = false;
      });
      if (!matches) continue;
      const extraCount = intervalSet.size - patternSet.size;
      if (!options.allowExtensions && extraCount > 0) continue;
      let score = pattern.priority * 10 - extraCount;
      if (!pcSet.has(root)) score -= 2;
      if (!best || score > best.score) {
        best = { root, pattern, score };
      }
    }
  }

  if (!best) return null;
  const names = options.preferFlats ? NOTE_NAMES_FLAT : NOTE_NAMES_SHARP;
  let name = names[best.root] + best.pattern.name;
  if (options.useSlash && activeNotes.length > 0) {
    const bassPc = activeNotes[0] % 12;
    if (bassPc !== best.root) {
      name += "/" + names[bassPc];
    }
  }
  return name;
}

function mergeDuplicateChords(chords) {
  if (!chords.length) return chords;
  const merged = [chords[0]];
  for (let i = 1; i < chords.length; i++) {
    const prev = merged[merged.length - 1];
    const current = chords[i];
    if (prev.name === current.name) continue;
    merged.push(current);
  }
  return merged;
}

function getLastNoteTick(noteEvents) {
  if (!Array.isArray(noteEvents) || !noteEvents.length) return null;
  let last = null;
  noteEvents.forEach((event) => {
    if (event && typeof event.tick === "number") {
      if (last === null || event.tick > last) last = event.tick;
    }
  });
  return last;
}

function getTrimTickFromEvents(events) {
  let lastNoteOn = null;
  let lastNoteOff = null;
  let lastAny = null;
  events.forEach((event) => {
    if (event && typeof event.tick === "number") {
      if (!isEndOfTrackEvent(event)) {
        if (lastAny === null || event.tick > lastAny) lastAny = event.tick;
      }
      if (event.isNote) {
        if (event.isOn) {
          if (lastNoteOn === null || event.tick > lastNoteOn) lastNoteOn = event.tick;
        } else {
          if (lastNoteOff === null || event.tick > lastNoteOff) lastNoteOff = event.tick;
        }
      }
    }
  });
  if (lastNoteOff !== null) return lastNoteOff;
  if (lastNoteOn !== null) return lastNoteOn;
  return lastAny;
}

function isEndOfTrackEvent(event) {
  return !!(
    event &&
    event.bytes &&
    event.bytes.length === 3 &&
    event.bytes[0] === 0xff &&
    event.bytes[1] === 0x2f
  );
}

function shortenMidiNotes(midiBytes, factor, chordTicks, gateMode, forceEndTick) {
  const bytes = midiBytes instanceof Uint8Array ? midiBytes : new Uint8Array(midiBytes);
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const view = new DataView(buffer);
  let offset = 0;
  const gateTicks = normalizeChordTicks(chordTicks);

  function readStr(len) {
    let s = "";
    for (let i = 0; i < len; i++) {
      s += String.fromCharCode(view.getUint8(offset + i));
    }
    offset += len;
    return s;
  }

  function readU32() {
    const v = view.getUint32(offset, false);
    offset += 4;
    return v;
  }

  function readU16() {
    const v = view.getUint16(offset, false);
    offset += 2;
    return v;
  }

  if (readStr(4) !== "MThd") {
    throw new Error("Not a MIDI file");
  }
  const headerLen = readU32();
  const format = readU16();
  const numTracks = readU16();
  const division = readU16();
  if (division & 0x8000) {
    throw new Error("SMPTE time format is not supported.");
  }
  offset += Math.max(0, headerLen - 6);

  const tracks = [];

  for (let t = 0; t < numTracks; t++) {
    if (readStr(4) !== "MTrk") {
      throw new Error("Invalid MIDI track header");
    }
    const trackLen = readU32();
    const trackEnd = offset + trackLen;
    let absTicks = 0;
    let runningStatus = null;
    let order = 0;
    const events = [];

    while (offset < trackEnd) {
      const { value: delta, length } = readVarLen(view, offset);
      offset += length;
      absTicks += delta;
      let statusByte = view.getUint8(offset);
      if (statusByte < 0x80 && runningStatus !== null) {
        statusByte = runningStatus;
      } else {
        offset += 1;
        runningStatus = statusByte;
      }

      if (statusByte === 0xff) {
        const metaType = view.getUint8(offset);
        offset += 1;
        const metaLen = readVarLen(view, offset);
        offset += metaLen.length;
        const data = new Uint8Array(buffer.slice(offset, offset + metaLen.value));
        offset += metaLen.value;
        const bytesOut = [
          0xff,
          metaType,
          ...writeVarLen(metaLen.value),
          ...Array.from(data)
        ];
        events.push({ tick: absTicks, order: order++, bytes: bytesOut });
        continue;
      }

      if (statusByte === 0xf0 || statusByte === 0xf7) {
        const sysLen = readVarLen(view, offset);
        offset += sysLen.length;
        const data = new Uint8Array(buffer.slice(offset, offset + sysLen.value));
        offset += sysLen.value;
        const bytesOut = [statusByte, ...writeVarLen(sysLen.value), ...Array.from(data)];
        events.push({ tick: absTicks, order: order++, bytes: bytesOut });
        continue;
      }

      const type = statusByte & 0xf0;
      const channel = statusByte & 0x0f;
      if (type === 0xc0 || type === 0xd0) {
        const data0 = view.getUint8(offset);
        offset += 1;
        events.push({
          tick: absTicks,
          order: order++,
          bytes: [statusByte, data0 & 0x7f]
        });
        continue;
      }

      const data0 = view.getUint8(offset);
      const data1 = view.getUint8(offset + 1);
      offset += 2;
      const bytesOut = [statusByte, data0 & 0x7f, data1 & 0x7f];
      const isNote = type === 0x90 || type === 0x80;
      const isOn = type === 0x90 && data1 > 0;
      events.push({
        tick: absTicks,
        order: order++,
        bytes: bytesOut,
        note: isNote ? data0 : null,
        channel: isNote ? channel : null,
        isOn: isNote ? isOn : null,
        isNote
      });
    }

    const stacks = new Map();
    events.forEach((event) => {
      if (!event.isNote) return;
      const key = `${event.channel}-${event.note}`;
      if (event.isOn) {
        if (!stacks.has(key)) stacks.set(key, []);
        stacks.get(key).push(event.tick);
      } else {
        const stack = stacks.get(key);
        if (stack && stack.length) {
          const onTick = stack.pop();
          const duration = event.tick - onTick;
          if (duration > 0) {
            const newDuration = Math.max(1, Math.round(duration * factor));
            let offTick = onTick + newDuration;
            if (gateTicks) {
              const gateTick = getNextChordTick(onTick, gateTicks);
              if (gateTick !== null && gateTick > onTick) {
                const clampTick = Math.max(onTick + 1, gateTick - 1);
                if (gateMode === "toNext") {
                  offTick = clampTick;
                } else {
                  const span = gateTick - onTick;
                  const spanDuration = Math.max(1, Math.round(span * factor));
                  offTick = Math.min(onTick + spanDuration, offTick, clampTick);
                }
              }
            }
            event.tick = offTick;
          }
        }
      }
    });

    let trimTick = getTrimTickFromEvents(events);
    const endEvents = events.filter(isEndOfTrackEvent);
    let activeEvents = events.filter((event) => !isEndOfTrackEvent(event));
    if (trimTick !== null) {
      activeEvents = activeEvents.filter((event) => event.tick <= trimTick);
    }
    activeEvents.sort((a, b) => (a.tick !== b.tick ? a.tick - b.tick : a.order - b.order));
    let maxTick = trimTick !== null ? trimTick : (activeEvents.length ? activeEvents[activeEvents.length - 1].tick : 0);
    if (Number.isFinite(forceEndTick) && forceEndTick > maxTick) {
      maxTick = Math.round(forceEndTick);
      trimTick = maxTick;
    }
    if (!endEvents.length) {
      endEvents.push({ tick: maxTick, order: Number.MAX_SAFE_INTEGER, bytes: [0xff, 0x2f, 0x00] });
    } else {
      endEvents.forEach((event, idx) => {
        event.tick = maxTick;
        event.order = Number.MAX_SAFE_INTEGER + idx;
      });
    }
    const finalEvents = activeEvents.concat(endEvents);

    let lastTick = 0;
    const trackBytes = [];
    finalEvents.forEach((event) => {
      const delta = Math.max(0, event.tick - lastTick);
      trackBytes.push(...writeVarLen(delta), ...event.bytes);
      lastTick = event.tick;
    });
    tracks.push(Uint8Array.from(trackBytes));
  }

  const totalLength = 14 + tracks.reduce((sum, track) => sum + 8 + track.length, 0);
  const out = new Uint8Array(totalLength);
  const outView = new DataView(out.buffer);
  out.set([0x4d, 0x54, 0x68, 0x64], 0);
  writeUint32BE(outView, 4, 6);
  out[8] = (format >> 8) & 0xff;
  out[9] = format & 0xff;
  out[10] = (numTracks >> 8) & 0xff;
  out[11] = numTracks & 0xff;
  out[12] = (division >> 8) & 0xff;
  out[13] = division & 0xff;
  let cursor = 14;
  tracks.forEach((track) => {
    out.set([0x4d, 0x54, 0x72, 0x6b], cursor);
    writeUint32BE(outView, cursor + 4, track.length);
    out.set(track, cursor + 8);
    cursor += 8 + track.length;
  });
  return out;
}

function getChordWindowTicks(ppq) {
  return Math.max(1, Math.round(ppq * 0.75));
}

function buildOutputNames(chords) {
  const names = chords.length ? chords.map((chord) => chord.name) : ["no-chords"];
  const raw = names.join(",");
  const cleaned = raw
    .replace(/\s+/g, "")
    .replace(/[\\/]+/g, "-")
    .replace(/[^a-z0-9,#b\-_.]/gi, "");
  const base = cleaned || "chords";
  return { displayName: raw || "chords", downloadName: base + ".chords.aif" };
}

function detectChords(noteEvents, options, windowTicks) {
  const activeCounts = new Map();
  let idx = 0;
  let lastChord = null;
  const chords = [];
  const windowSpan = Math.max(1, Math.round(windowTicks || 1));
  let windowStart = null;
  let windowEnd = null;
  let windowHadNoteOn = false;

  const finalizeWindow = () => {
    if (windowStart === null || !windowHadNoteOn) return;
    const activeNotes = Array.from(activeCounts.keys()).sort((a, b) => a - b);
    const chordName = identifyChord(activeNotes, options);
    if (chordName !== lastChord && (chordName || options.emitNC)) {
      chords.push({ tick: windowStart, name: chordName || "N.C." });
      lastChord = chordName;
    }
  };

  while (idx < noteEvents.length) {
    const tick = noteEvents[idx].tick;

    if (windowStart !== null && tick > windowEnd) {
      finalizeWindow();
      windowStart = null;
      windowEnd = null;
      windowHadNoteOn = false;
    }

    let tickHadNoteOn = false;
    while (idx < noteEvents.length && noteEvents[idx].tick === tick) {
      const ev = noteEvents[idx];
      const current = activeCounts.get(ev.note) || 0;
      if (ev.on) {
        activeCounts.set(ev.note, current + 1);
        tickHadNoteOn = true;
      } else if (current > 1) {
        activeCounts.set(ev.note, current - 1);
      } else {
        activeCounts.delete(ev.note);
      }
      idx += 1;
    }

    if (windowStart === null) {
      if (tickHadNoteOn) {
        windowStart = tick;
        windowEnd = tick + windowSpan;
        windowHadNoteOn = true;
      }
    } else if (tickHadNoteOn) {
      windowHadNoteOn = true;
    }
  }

  finalizeWindow();
  return chords;
}

function mergeDuplicateChords(chords) {
  if (!chords.length) return chords;
  const merged = [chords[0]];
  for (let i = 1; i < chords.length; i++) {
    const prev = merged[merged.length - 1];
    const current = chords[i];
    if (prev.name === current.name) continue;
    merged.push(current);
  }
  return merged;
}

async function loadTemplateAiff() {
  if (templateAiffBuffer && templateSequInfo) return;
  const parts = await Promise.all(TEMPLATE_PARTS.map((p) => fs.readFile(p)));
  const totalLength = parts.reduce((sum, buf) => sum + buf.byteLength, 0);
  const merged = new Uint8Array(totalLength);
  let offset = 0;
  parts.forEach((buf) => {
    merged.set(new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength), offset);
    offset += buf.byteLength;
  });
  templateAiffBuffer = merged.buffer;
  const chunks = parseAiffChunks(templateAiffBuffer);
  const sequChunk = chunks.find((chunk) => chunk.id === "Sequ");
  if (!sequChunk) {
    throw new Error("Sequ chunk not found in template AIFF.");
  }
  const sequBytes = new Uint8Array(
    templateAiffBuffer.slice(sequChunk.dataStart, sequChunk.dataEnd)
  );
  templateSequInfo = parseSequInfo(sequBytes);
}

async function buildAiffFromChords(chords, ppq, midiBytes, includeSequNotes, noteEvents, gateToNext) {
  await loadTemplateAiff();
  if (!templateAiffBuffer || !templateSequInfo) {
    throw new Error("Template AIFF is not loaded.");
  }
  let endTick = null;
  if (gateToNext && midiBytes) {
    try {
      endTick = parseMidiTiming(midiBytes).lastTick;
    } catch (err) {
      endTick = null;
    }
  }
  const sequResult = buildSequChunk(
    chords,
    templateSequInfo,
    ppq,
    includeSequNotes,
    noteEvents,
    gateToNext,
    endTick
  );
  if (!sequResult.encodedCount) {
    throw new Error("No supported chords detected for AIFF encoding.");
  }
  if (midiBytes && !isMidiBytes(midiBytes)) {
    throw new Error("Embedded MIDI is invalid.");
  }
  const outputBytes = buildAiffWithSequ(templateAiffBuffer, sequResult.bytes, midiBytes);
  if (midiBytes) {
    validateAiffMidi(outputBytes);
  }
  return { outputBytes, encodedCount: sequResult.encodedCount };
}

async function ensureDirs() {
  await fs.mkdir(INBOX, { recursive: true });
  await fs.mkdir(OUTBOX, { recursive: true });
  await fs.mkdir(ARCHIVE, { recursive: true });
}

async function waitForStableFile(filePath, attempts = 5, delayMs = 400) {
  let lastSize = -1;
  for (let i = 0; i < attempts; i++) {
    const stat = await fs.stat(filePath);
    if (stat.size === lastSize) return;
    lastSize = stat.size;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}

async function revealInFinder(filePath) {
  try {
    await execFileAsync("open", ["-R", filePath]);
  } catch (err) {
    console.warn("Failed to reveal in Finder:", err.message);
  }
}

async function processMidiFile(filePath) {
  await waitForStableFile(filePath);
  const buffer = await fs.readFile(filePath);
  const midiInfo = parseMidiNoteEvents(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength), OPTIONS);
  const windowTicks = getChordWindowTicks(midiInfo.ppq);
  const chords = detectChords(midiInfo.noteEvents, OPTIONS, windowTicks);
  const rawMidiBytes = new Uint8Array(buffer);
  const originalEndTick = getLastNoteTick(midiInfo.noteEvents);
  const midiBytes = shortenMidiNotes(
    rawMidiBytes,
    NOTE_LENGTH_FACTOR,
    getChordTicks(chords),
    OPTIONS.gateToNext ? "toNext" : null,
    originalEndTick
  );
  const includeSequNotes = true;
  const aiffResult = await buildAiffFromChords(
    chords,
    midiInfo.ppq,
    midiBytes,
    includeSequNotes,
    null,
    OPTIONS.gateToNext
  );
  const outName = buildOutputNames(chords).downloadName;
  const outPath = path.join(OUTBOX, outName);
  const archivePath = path.join(ARCHIVE, outName);
  try {
    await fs.access(outPath);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const archivedName = outName.replace(/\.aif$/i, `.${stamp}.aif`);
    await fs.rename(outPath, path.join(ARCHIVE, archivedName));
  } catch (err) {
    // ok if file doesn't exist
  }
  await fs.writeFile(outPath, Buffer.from(aiffResult.outputBytes));
  await fs.unlink(filePath);
  await revealInFinder(outPath);
}

let isProcessing = false;

async function scanInbox() {
  if (isProcessing) return;
  isProcessing = true;
  try {
    const entries = await fs.readdir(INBOX, { withFileTypes: true });
    const midiFiles = entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((name) => name.toLowerCase().endsWith(".mid") || name.toLowerCase().endsWith(".midi"))
      .sort();

    for (const name of midiFiles) {
      const filePath = path.join(INBOX, name);
      try {
        console.log("Processing:", name);
        await processMidiFile(filePath);
        console.log("Done:", name);
      } catch (err) {
        console.error("Failed:", name, err.message);
      }
    }
  } finally {
    isProcessing = false;
  }
}

async function runWatcher() {
  await ensureDirs();
  await loadTemplateAiff();
  console.log("Watching for MIDI in:", INBOX);
  setInterval(scanInbox, 1500);
}

runWatcher().catch((err) => {
  console.error("Watcher error:", err.message);
  process.exit(1);
});
