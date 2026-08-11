// Center-channel extraction: L-R cancels whatever's identical between channels (usually vocals), but also centered bass/kick, and does nothing on mono.
export function phaseCancelInstrumental(
  channels: Float32Array[]
): Float32Array | null {
  if (channels.length < 2) return null;
  const left = channels[0]!;
  const right = channels[1]!;
  const length = Math.min(left.length, right.length);
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    out[i] = (left[i]! - right[i]!) / 2;
  }
  return out;
}
