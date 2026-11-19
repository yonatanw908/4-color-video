"""Generate narration.wav with kokoro-onnx (model files live in ../kokoro-onnx)."""
import pathlib, sys
import soundfile as sf
from kokoro_onnx import Kokoro

root = pathlib.Path(__file__).resolve().parent.parent
k = root / "kokoro-onnx"
text = "Any map can be colored with just four colors, so that no two neighbors match."
speed = float(sys.argv[1]) if len(sys.argv) > 1 else 1.0
kokoro = Kokoro(str(k / "kokoro-v1.0.onnx"), str(k / "voices-v1.0.bin"))
samples, sr = kokoro.create(text, voice="af_sarah", speed=speed, lang="en-us")
out = root / "narration.wav"
sf.write(out, samples, sr)
print(f"{out} {len(samples)/sr:.2f}s @ {sr}Hz speed={speed}")
