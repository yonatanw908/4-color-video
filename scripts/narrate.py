"""Render one scene's narration with kokoro-onnx.

Usage: python scripts/narrate.py <scene-number> "<text>" [speed]
Writes four-color-video/public/audio/sceneNN.wav and prints its duration.
"""
import pathlib, sys
import soundfile as sf
from kokoro_onnx import Kokoro

VOICE = "af_bella"
root = pathlib.Path(__file__).resolve().parent.parent
k = root / "kokoro-onnx"
num, text = int(sys.argv[1]), sys.argv[2]
speed = float(sys.argv[3]) if len(sys.argv) > 3 else 1.0
kokoro = Kokoro(str(k / "kokoro-v1.0.onnx"), str(k / "voices-v1.0.bin"))
samples, sr = kokoro.create(text, voice=VOICE, speed=speed, lang="en-us")
out = root / "four-color-video" / "public" / "audio" / f"scene{num:02d}.wav"
out.parent.mkdir(parents=True, exist_ok=True)
sf.write(out, samples, sr)
print(f"{out.name} {len(samples)/sr:.2f}s voice={VOICE} speed={speed}")
