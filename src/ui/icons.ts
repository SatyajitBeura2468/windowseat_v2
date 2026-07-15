const icons: Record<string, string> = {
  route:
    '<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  coach:
    '<path d="M6 17h12M7 20l2-3m8 3-2-3M6 4h12v11H6z"/><path d="M9 7h6M8 11h8"/>',
  weather:
    '<path d="M7 15h10a4 4 0 0 0 .3-8A6 6 0 0 0 6 9.5 3 3 0 0 0 7 15Z"/><path d="m8 18-1 2m5-2-1 2m5-2-1 2"/>',
  time: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  speed:
    '<path d="M4 16a8 8 0 1 1 16 0"/><path d="m12 14 4-5"/><path d="M7 17h10"/>',
  sound:
    '<path d="M5 10v4h3l4 3V7L8 10H5Z"/><path d="M15 9a4 4 0 0 1 0 6m2-8a7 7 0 0 1 0 10"/>',
  focus: '<path d="M8 3H3v5m13-5h5v5M8 21H3v-5m13 5h5v-5"/>',
  capture:
    '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="m8 6 1.5-2h5L16 6"/><circle cx="12" cy="12.5" r="3.5"/>',
  share:
    '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8 11 7.5-4.5M8 13l7.5 4.5"/>',
  settings:
    '<circle cx="12" cy="12" r="3"/><path d="M19 13.5v-3l-2-.7a7 7 0 0 0-.8-1.8l.9-2-2.1-2.1-2 .9a7 7 0 0 0-1.8-.8L10.5 2h-3l-.7 2a7 7 0 0 0-1.8.8l-2-.9L.9 6l.9 2a7 7 0 0 0-.8 1.8l-2 .7v3l2 .7A7 7 0 0 0 1.8 16l-.9 2L3 20.1l2-.9a7 7 0 0 0 1.8.8l.7 2h3l.7-2a7 7 0 0 0 1.8-.8l2 .9 2.1-2.1-.9-2a7 7 0 0 0 .8-1.8l2-.7Z" transform="translate(2) scale(.83)"/>',
  close: '<path d="m5 5 14 14M19 5 5 19"/>',
  arrow: '<path d="m8 4 8 8-8 8"/>',
  pause: '<path d="M8 5v14m8-14v14"/>',
  random:
    '<path d="M3 7h3c5 0 5 10 10 10h5M18 14l3 3-3 3M3 17h3c2 0 3-1 4-3m4-4c1-2 2-3 4-3h3M18 4l3 3-3 3"/>',
};

export function icon(name: keyof typeof icons): string {
  return `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">${icons[name]}</svg>`;
}
