const stamp = (ms) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const fold = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

export function icsFor(m, base) {
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//0xAI Builders//Meetup Kit//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${m.slug}@meetup-kit`,
    `DTSTAMP:${stamp(Date.now())}`,
    `DTSTART:${stamp(m.inicio)}`,
    `DTEND:${stamp(m.fin)}`,
    `SUMMARY:${fold(m.titulo)}`,
    `DESCRIPTION:${fold(`${m.bajada ? m.bajada + '\n\n' : ''}Registro: ${m.registro_url}\nMás info: ${base}/${m.slug}`)}`,
    `LOCATION:${fold([m.lugar, m.direccion].filter(Boolean).join(', '))}`,
    `URL:${base}/${m.slug}`,
    'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', `DESCRIPTION:${fold(m.titulo)}`, 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR', '',
  ].join('\r\n');
}
