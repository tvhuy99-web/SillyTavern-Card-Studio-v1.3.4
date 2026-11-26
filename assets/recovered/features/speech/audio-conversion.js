// Recovered from the application host. One owner; dependency getters preserve late binding.
export function createAudioConversion(dependencies = {}) {
var audioContext=null;
var getAudioContext=async()=>(audioContext||=new(window.AudioContext||window.webkitAudioContext)({sampleRate:24e3}),"suspended"===audioContext.state&&await audioContext.resume(),audioContext);
function decodeBase64Bytes(e){let t=atob(e),n=t.length,r=new Uint8Array(n);for(let e=0;e<n;e++)r[e]=t.charCodeAt(e);return r}
function decodeRawPcmBuffer(e,t,n=24e3){let r=e.length/2,a=t.createBuffer(1,r,n),i=a.getChannelData(0),o=new DataView(e.buffer,e.byteOffset,e.byteLength);for(let e=0;e<r;e++)i[e]=o.getInt16(2*e,!0)/32768;return a}
return { Od: getAudioContext, Rd: decodeBase64Bytes, Pd: decodeRawPcmBuffer };
}
