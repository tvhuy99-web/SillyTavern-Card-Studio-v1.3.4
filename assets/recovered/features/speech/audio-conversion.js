// Recovered from the application host. One owner; dependency getters preserve late binding.
export function createAudioConversion(dependencies = {}) {
var audioContext=null;
var getAudioContext=async()=>(audioContext||=new(window.AudioContext||window.webkitAudioContext)({sampleRate:24e3}),"suspended"===audioContext.state&&await audioContext.resume(),audioContext);
function decodeBase64Bytes(encoded) {
  let binary = atob(encoded), length = binary.length, bytes = new Uint8Array(length);
  for (let index = 0; index < length; index++) bytes[index] = binary.charCodeAt(index);
  return bytes;
}
function decodeRawPcmBuffer(bytes, context, sampleRate = 24e3) {
  let sampleCount = bytes.length / 2;
  let audioBuffer = context.createBuffer(1, sampleCount, sampleRate);
  let samples = audioBuffer.getChannelData(0);
  let view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let index = 0; index < sampleCount; index++) samples[index] = view.getInt16(2 * index, true) / 32768;
  return audioBuffer;
}
return { getAudioContext, decodeBase64Bytes, decodeRawPcmBuffer };
}
