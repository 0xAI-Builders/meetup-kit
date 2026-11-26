// Base de datos SQLite integrada en Node (node:sqlite). Un solo archivo, sin servidor aparte.
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export const EVENTOS_SEGUIDOS = ['visita', 'registro', 'cascade', 'builderhub', 'core', 'compartir', 'calendario', 'mapa'];

export function openDb(file) {
  if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 4000;
    CREATE TABLE IF NOT EXISTS meetups (
      slug TEXT PRIMARY KEY,
      key_hash TEXT NOT NULL,
      titulo TEXT NOT NULL,
      bajada TEXT NOT NULL DEFAULT '',
      descripcion TEXT NOT NULL DEFAULT '',
      organiza TEXT NOT NULL DEFAULT '',
      contacto TEXT NOT NULL DEFAULT '',
      comunidad TEXT NOT NULL DEFAULT '',
      ciudad TEXT NOT NULL DEFAULT '',
      inicio INTEGER NOT NULL,
      fin INTEGER NOT NULL,
      tz TEXT NOT NULL,
      lugar TEXT NOT NULL DEFAULT '',
      direccion TEXT NOT NULL DEFAULT '',
      mapa_url TEXT NOT NULL DEFAULT '',
      registro_url TEXT NOT NULL,
      agenda TEXT NOT NULL DEFAULT '[]',
      portada TEXT NOT NULL DEFAULT '',
      tema TEXT NOT NULL DEFAULT 'avalanche',
      publico INTEGER NOT NULL DEFAULT 1,
      creado INTEGER NOT NULL,
      editado INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS meetups_inicio ON meetups(inicio);
    CREATE TABLE IF NOT EXISTS hits (
      slug TEXT NOT NULL, dia TEXT NOT NULL, src TEXT NOT NULL, ev TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (slug, dia, src, ev)
    );
    CREATE TABLE IF NOT EXISTS unicos (
      slug TEXT NOT NULL, dia TEXT NOT NULL, h TEXT NOT NULL, src TEXT NOT NULL,
      PRIMARY KEY (slug, dia, h)
    );
  `);

  const q = {
    get: db.prepare('SELECT * FROM meetups WHERE slug = ?'),
    exists: db.prepare('SELECT 1 FROM meetups WHERE slug = ?'),
    insert: db.prepare(`INSERT INTO meetups (slug, key_hash, titulo, bajada, descripcion, organiza, contacto, comunidad, ciudad, inicio, fin, tz, lugar, direccion, mapa_url, registro_url, agenda, portada, tema, publico, creado, editado)
      VALUES (:slug, :key_hash, :titulo, :bajada, :descripcion, :organiza, :contacto, :comunidad, :ciudad, :inicio, :fin, :tz, :lugar, :direccion, :mapa_url, :registro_url, :agenda, :portada, :tema, :publico, :creado, :editado)`),
    update: db.prepare(`UPDATE meetups SET titulo=:titulo, bajada=:bajada, descripcion=:descripcion, organiza=:organiza, contacto=:contacto, comunidad=:comunidad, ciudad=:ciudad,
      inicio=:inicio, fin=:fin, tz=:tz, lugar=:lugar, direccion=:direccion, mapa_url=:mapa_url, registro_url=:registro_url, agenda=:agenda, portada=:portada, tema=:tema, publico=:publico, editado=:editado
      WHERE slug=:slug`),
    hit: db.prepare('INSERT INTO hits (slug, dia, src, ev, n) VALUES (?, ?, ?, ?, 1) ON CONFLICT(slug, dia, src, ev) DO UPDATE SET n = n + 1'),
    unico: db.prepare('INSERT OR IGNORE INTO unicos (slug, dia, h, src) VALUES (?, ?, ?, ?)'),
    proximos: db.prepare('SELECT * FROM meetups WHERE publico = 1 AND fin >= ? ORDER BY inicio ASC LIMIT ?'),
    pasados: db.prepare('SELECT * FROM meetups WHERE publico = 1 AND fin < ? ORDER BY inicio DESC LIMIT ?'),
    totales: db.prepare("SELECT (SELECT COUNT(*) FROM meetups) AS meetups, (SELECT COALESCE(SUM(n),0) FROM hits WHERE ev='visita') AS visitas, (SELECT COALESCE(SUM(n),0) FROM hits WHERE ev IN ('cascade','builderhub','core')) AS onboarding, (SELECT COUNT(DISTINCT ciudad) FROM meetups WHERE ciudad <> '') AS ciudades"),
    porFuente: db.prepare('SELECT src, ev, SUM(n) AS n FROM hits WHERE slug = ? GROUP BY src, ev'),
    porDia: db.prepare('SELECT dia, ev, SUM(n) AS n FROM hits WHERE slug = ? GROUP BY dia, ev ORDER BY dia'),
    unicosTot: db.prepare('SELECT COUNT(DISTINCT h) AS n FROM unicos WHERE slug = ?'),
    unicosFuente: db.prepare('SELECT src, COUNT(DISTINCT h) AS n FROM unicos WHERE slug = ? GROUP BY src'),
    unicosDia: db.prepare('SELECT dia, COUNT(DISTINCT h) AS n FROM unicos WHERE slug = ? GROUP BY dia'),
  };

  return {
    db,
    get: (slug) => {
      const r = q.get.get(slug);
      if (r) r.agenda = safeJson(r.agenda, []);
      return r || null;
    },
    exists: (slug) => !!q.exists.get(slug),
    insert: (m) => q.insert.run({ ...m, agenda: JSON.stringify(m.agenda || []) }),
    update: (m) => q.update.run({ ...m, agenda: JSON.stringify(m.agenda || []) }),
    hit: (slug, dia, src, ev) => q.hit.run(slug, dia, src, ev),
    unico: (slug, dia, h, src) => q.unico.run(slug, dia, h, src).changes > 0,
    proximos: (now, n = 12) => q.proximos.all(now, n),
    pasados: (now, n = 6) => q.pasados.all(now, n),
    totales: () => q.totales.get(),
    stats(slug) {
      const fuentes = {};
      for (const r of q.porFuente.all(slug)) (fuentes[r.src] ||= {})[r.ev] = r.n;
      for (const r of q.unicosFuente.all(slug)) (fuentes[r.src] ||= {}).unicos = r.n;
      const dias = {};
      for (const r of q.porDia.all(slug)) (dias[r.dia] ||= {})[r.ev] = r.n;
      for (const r of q.unicosDia.all(slug)) (dias[r.dia] ||= {}).unicos = r.n;
      const total = {};
      for (const f of Object.values(fuentes)) for (const [k, v] of Object.entries(f)) if (k !== 'unicos') total[k] = (total[k] || 0) + v;
      total.unicos = q.unicosTot.get(slug).n;
      return { total, fuentes, dias };
    },
  };
}

function safeJson(s, d) {
  try {
    return JSON.parse(s);
  } catch {
    return d;
  }
}
