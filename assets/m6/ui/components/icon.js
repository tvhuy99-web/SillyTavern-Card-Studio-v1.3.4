// Shared icon vocabulary. Preserve the original SVG paths and fallback.
const iconPaths = Object.freeze({
  brand: "M7 3h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm-3 5H3a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-1M12 7v6m-3-3h6",
  character: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7 8a7 7 0 0 0-14 0",
  preset: "M4 6h10m4 0h2M4 12h2m4 0h10M4 18h7m4 0h5M14 3v6M6 9v6m5 0v6",
  lorebook: "M4 4.5A2.5 2.5 0 0 1 6.5 2H11v18H6.5A2.5 2.5 0 0 0 4 22V4.5Zm16 0A2.5 2.5 0 0 0 17.5 2H13v18h4.5A2.5 2.5 0 0 1 20 22V4.5Z",
  chat: "M21 15a4 4 0 0 1-4 4H8l-5 3v-7a4 4 0 0 1-1-2.7V7a4 4 0 0 1 4-4h11a4 4 0 0 1 4 4v8Z",
  settings: "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm7.4-3.5a7.5 7.5 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a8 8 0 0 0-1.8-1L14.8 3h-4l-.4 2.7a8 8 0 0 0-1.8 1L6.2 5.6l-2 3.4 2 1.6a8 8 0 0 0 0 2.1l-2 1.6 2 3.4 2.4-1a8 8 0 0 0 1.8 1l.4 2.7h4l.4-2.7a8 8 0 0 0 1.8-1l2.4 1 2-3.4-2-1.6v-.7Z",
  arrowLeft: "M19 12H5m6-6-6 6 6 6",
  sync: "M20 7h-5V2M4 17h5v5m10-7a8 8 0 0 1-13.7 2L4 17m16-10-1.3-1A8 8 0 0 0 5 8",
  rpg: "M5 4h14v16H5zM8 8h.01M16 8h.01M8 16h.01M16 16h.01M12 12h.01",
  sparkles: "m12 3 1.1 3.4L16.5 7.5l-3.4 1.1L12 12l-1.1-3.4-3.4-1.1 3.4-1.1L12 3Zm6 9 .7 2.3L21 15l-2.3.7L18 18l-.7-2.3L15 15l2.3-.7L18 12ZM6 13l.9 2.6L9.5 16.5l-2.6.9L6 20l-.9-2.6-2.6-.9 2.6-.9L6 13Z",
  close: "M6 6l12 12M18 6 6 18",
  send: "m22 2-7 20-4-9-9-4 20-7Zm-11 11 4-4",
  stop: "M7 7h10v10H7z",
  search: "m21 21-4.3-4.3m2.3-5.2a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z",
  check: "m5 12 4 4L19 6",
  error: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-14v5m0 3h.01",
  warning: "M12 3 2.5 20h19L12 3Zm0 6v5m0 3h.01",
  info: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-9v5m0-9h.01",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  download: "M12 3v12m-5-5 5 5 5-5M5 21h14",
  upload: "M12 21V9m-5 5 5-5 5 5M5 3h14",
  trash: "M4 7h16m-10 4v6m4-6v6M9 7l1-3h4l1 3m3 0-1 14H7L6 7",
  volume: "M4 10v4h4l5 4V6L8 10H4Zm12-1a4 4 0 0 1 0 6m2.5-8.5a8 8 0 0 1 0 11",
  play: "m9 7 8 5-8 5V7Z",
  pause: "M9 7v10m6-10v10",
  skip: "m7 7 7 5-7 5V7Zm9 0v10",
  file: "M6 2h8l4 4v16H6V2Zm8 0v5h5M9 13h6m-6 4h6",
  chevronDown: "m6 9 6 6 6-6",
  chevronRight: "m9 6 6 6-6 6",
  tool: "m14.7 6.3 3-3a4 4 0 0 0-5 5l-8.2 8.2a2.1 2.1 0 0 0 3 3l8.2-8.2a4 4 0 0 0 5-5l-3 3-3-3Z",
  refresh: "M20 7h-5V2M4 17h5v5m10-7a8 8 0 0 1-13.7 2L4 17m16-10-1.3-1A8 8 0 0 0 5 8",
  plus: "M12 5v14M5 12h14",
  save: "M5 3h12l2 2v16H5V3Zm3 0v6h8V3m-8 18v-7h8v7",
  copy: "M8 8h11v13H8V8Zm-3 8H3V3h11v2",
  undo: "m9 7-5 5 5 5m-5-5h10a6 6 0 0 1 6 6",
  expand: "M8 3H3v5m13-5h5v5M8 21H3v-5m13 5h5v-5",
  collapse: "M8 8H3V3m13 5h5V3M8 16H3v5m13-5h5v5",
  count: "M5 6h14M5 12h14M5 18h14"
});

export function createIcon({ jsx }) {
  return function Icon({ name, className = 'h-4 w-4' }) {
    return jsx('svg', {
      xmlns: 'http://www.w3.org/2000/svg', className, viewBox: '0 0 24 24',
      fill: 'none', stroke: 'currentColor', strokeWidth: '1.8',
      strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true',
      children: jsx('path', { d: iconPaths[name] || iconPaths.sparkles }),
    });
  };
}
