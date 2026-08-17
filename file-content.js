'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const KINDS = Object.freeze({ config: ['.json'], templates: ['.json', '.html'], translations: ['.json'], holidays: ['.json', '.csv'] });

class FileContentRepository {
  constructor(root) {
    this.base = path.resolve(process.env.SARI_CONTENT_DIR || path.join(root, 'content'));
    for (const kind of Object.keys(KINDS)) fs.mkdirSync(path.join(this.base, kind), { recursive: true });
  }

  location(kind, name) {
    if (!KINDS[kind]) throw Error('Unsupported content kind');
    const clean = String(name || '').trim();
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,180}$/.test(clean)) throw Error('Invalid content file name');
    const extension = path.extname(clean).toLowerCase();
    if (!KINDS[kind].includes(extension)) throw Error(`Allowed ${kind} extensions: ${KINDS[kind].join(', ')}`);
    return path.join(this.base, kind, clean);
  }

  list(kind) {
    if (!KINDS[kind]) throw Error('Unsupported content kind');
    return fs.readdirSync(path.join(this.base, kind), { withFileTypes: true })
      .filter((entry) => entry.isFile() && KINDS[kind].includes(path.extname(entry.name).toLowerCase()))
      .map((entry) => {
        const file = path.join(this.base, kind, entry.name), stats = fs.statSync(file);
        return { name: entry.name, size: stats.size, updatedAt: stats.mtime.toISOString(), etag: this.etag(fs.readFileSync(file)) };
      }).sort((a, b) => a.name.localeCompare(b.name));
  }

  etag(content) { return `"${crypto.createHash('sha256').update(content).digest('base64url').slice(0, 24)}"`; }

  read(kind, name) {
    const file = this.location(kind, name);
    const raw = fs.readFileSync(file, 'utf8');
    const extension = path.extname(file).toLowerCase();
    const format = extension === '.json' ? 'json' : extension === '.csv' ? 'csv' : 'html';
    return { kind, name, format, content: extension === '.json' ? JSON.parse(raw) : raw, etag: this.etag(raw), updatedAt: fs.statSync(file).mtime.toISOString() };
  }

  write(kind, name, content) {
    const file = this.location(kind, name);
    let raw;
    if (path.extname(file).toLowerCase() === '.json') {
      const parsed = typeof content === 'string' ? JSON.parse(content) : content;
      if (!parsed || typeof parsed !== 'object') throw Error('JSON content must be an object or array');
      raw = `${JSON.stringify(parsed, null, 2)}\n`;
    } else {
      raw = String(content || '');
      if (!raw.trim()) throw Error('HTML template cannot be empty');
    }
    if (Buffer.byteLength(raw) > 5 * 1024 * 1024) throw Error('Content file exceeds the 5 MB limit');
    const temporary = `${file}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(temporary, raw, { mode: 0o640 });
    fs.renameSync(temporary, file);
    return this.read(kind, name);
  }

  snapshot() {
    return Object.fromEntries(Object.keys(KINDS).map((kind) => [kind, this.list(kind).map((item) => this.read(kind, item.name))]));
  }
}

module.exports = { FileContentRepository, KINDS };
