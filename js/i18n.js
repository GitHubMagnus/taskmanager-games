"use strict";
/* ===========================================================================
   i18n.js — Sprachumschaltung Deutsch / English.
   Zwei Mechanismen:
   1) t(key)  — authored Copy (Fensterrahmen, Kacheln, Panel, Overlays,
      Game-Over-Gerüst). Strukturiertes Wörterbuch I18N[lang].
   2) tr(str) — die zur Laufzeit erzeugten Spielstrings (Info-Panel-Werte,
      Flash-Texte, Game-Over-Gründe, Canvas-Beschriftungen). Deutsch ist die
      Quellsprache; im Englischen wird über eine Exact-/Phrasen-Tabelle
      übersetzt. So bleiben die Spieldateien nahezu unverändert.
   Umschalten per L-Button in der Fußzeile.
   =========================================================================== */
let LANG = 'de';

const I18N = {
  de: {
    app_title:'Task-Manager',
    m_file:'Datei', m_options:'Optionen', m_view:'Ansicht',
    t_proc:'Prozesse', t_perf:'Leistung', t_hist:'App-Verlauf', t_start:'Autostart',
    t_users:'Benutzer', t_details:'Details', t_serv:'Dienste',
    f_fewer:'▲ Weniger Details', f_resmon:'📈 Ressourcenmonitor öffnen',
    snd_title:'Sound an/aus (M)', lang_title:'Sprache / Language', graph_sec:'60 Sekunden',

    tile_cpu_name:'CPU',                   tile_cpu_sub:'20% 3,92 GHz',
    tile_mem_name:'Arbeitsspeicher',       tile_mem_sub:'9,7/15,9 GB (61%)',
    tile_disk_name:'Datenträger 0 (C: D:)',tile_disk_sub:'SSD  1%',
    tile_disk1_name:'Datenträger 1 (H:)',  tile_disk1_sub:'SSD  0%',
    tile_eth_name:'Ethernet',              tile_eth_sub:'S: 0 R: 1,6 Mbps',
    tile_gpu_name:'GPU 0',                 tile_gpu_sub:'NVIDIA GeForce  14%',

    dev_cpu:'11th Gen Intel(R) Core(TM) i5-11400F @ 2.60GHz',
    dev_mem:'15,9 GB DDR4', dev_disk:'Samsung SSD 970 EVO', dev_disk1:'Crucial MX500 SSD',
    dev_eth:'Realtek PCIe GbE Family Controller', dev_gpu:'NVIDIA GeForce RTX 3060',
    sub_cpu:'% Auslastung', sub_mem:'Speicherauslastung', sub_disk:'Aktive Zeit  (0 - 100%)',
    sub_disk1:'Fragmentierung', sub_eth:'Durchsatz', sub_gpu:'GPU-Auslastung',

    ov_cpu_title:'CPU · Hillclimb',
    ov_cpu_desc:'Fahr über die Auslastungskurve, sammle blaue Datenpunkte und nimm die orangen Turbo-Pads mit. Flips in der Luft geben Stunt-Punkte, perfekte Landungen einen Bonus. Steile Hügel kosten Schwung — Crashen kannst du nicht.',
    ov_cpu_keys:'<kbd>W</kbd>/<kbd>↑</kbd> Gas · <kbd>S</kbd>/<kbd>↓</kbd> Bremse · <kbd>A D</kbd>/<kbd>← →</kbd> in der Luft drehen · <kbd>R</kbd> neue Strecke',
    ov_mem_title:'Arbeitsspeicher · Dino-Run',
    ov_mem_desc:'Spring über die Speicherspitzen und sammle blaue Cache-Orbs in der Luft. Vorsicht vor schwebenden LEAK-Blöcken — da läufst du besser drunter durch. Doppelsprung inklusive, kurz tippen springt niedriger als halten.',
    ov_mem_keys:'<kbd>Leertaste</kbd> / <kbd>W</kbd> / <kbd>↑</kbd> Springen (auch Klick)',
    ov_disk_title:'Datenträger 0 · Daten-Catcher',
    ov_disk_desc:'Sammle blaue Dateien und goldenen Cache, weiche den roten Bad Sectors aus. Fehlerfreie Serien steigern den Combo-Multiplikator bis ×5, und im I/O-Burst regnet es kurz Dateien. Drei Bad Sectors und die Platte ist hin.',
    ov_disk_keys:'<kbd>A</kbd>/<kbd>←</kbd> · <kbd>D</kbd>/<kbd>→</kbd> Lese-/Schreibkopf bewegen',
    ov_defrag_title:'Datenträger 1 · Defrag',
    ov_defrag_desc:'Sammle die orangen Fragmente ein — die Kette hinter dir wächst. Goldene Fragmente geben +30, verschwinden aber nach 5 Sekunden, und nach jedem dritten Fragment blockiert ein neuer defekter Sektor die Platte.',
    ov_defrag_keys:'<kbd>WASD</kbd> / <kbd>Pfeiltasten</kbd> lenken',
    ov_net_title:'Ethernet · Paket-Flug',
    ov_net_desc:'Halte das Datenpaket mit kurzen Impulsen in der Luft und fliege durch die Firewall-Lücken. Goldene Bonus-Bytes in der Lückenmitte geben +15 — und später fangen manche Lücken an zu wandern.',
    ov_net_keys:'<kbd>Leertaste</kbd> / <kbd>W</kbd> / <kbd>↑</kbd> Impuls (auch Klick)',
    ov_gpu_title:'GPU · Render-Defense',
    ov_gpu_desc:'Schieß die Render-Jobs ab, bevor sie die Frame-Linie erreichen: schwere 4K-Jobs brauchen zwei Treffer, flinke Glitch-Jobs sind schnell. Zerstörte Jobs lassen manchmal VRAM fallen — fang es für +20 FPS oder Dreifach-Schuss.',
    ov_gpu_keys:'<kbd>A</kbd>/<kbd>←</kbd> <kbd>D</kbd>/<kbd>→</kbd> bewegen · <kbd>Leertaste</kbd>/<kbd>W</kbd>/<kbd>↑</kbd> feuern',

    start_hint:'Klicke oder drücke eine Taste zum Starten',
    go_title:'Game Over', go_score:'Score', go_high:'Highscore',
    go_restart:'Drücke <kbd>R</kbd> für Neustart',
  },
  en: {
    app_title:'Task Manager',
    m_file:'File', m_options:'Options', m_view:'View',
    t_proc:'Processes', t_perf:'Performance', t_hist:'App history', t_start:'Startup',
    t_users:'Users', t_details:'Details', t_serv:'Services',
    f_fewer:'▲ Fewer details', f_resmon:'📈 Open Resource Monitor',
    snd_title:'Sound on/off (M)', lang_title:'Sprache / Language', graph_sec:'60 seconds',

    tile_cpu_name:'CPU',                tile_cpu_sub:'20% 3.92 GHz',
    tile_mem_name:'Memory',             tile_mem_sub:'9.7/15.9 GB (61%)',
    tile_disk_name:'Disk 0 (C: D:)',    tile_disk_sub:'SSD  1%',
    tile_disk1_name:'Disk 1 (H:)',      tile_disk1_sub:'SSD  0%',
    tile_eth_name:'Ethernet',           tile_eth_sub:'S: 0 R: 1.6 Mbps',
    tile_gpu_name:'GPU 0',              tile_gpu_sub:'NVIDIA GeForce  14%',

    dev_cpu:'11th Gen Intel(R) Core(TM) i5-11400F @ 2.60GHz',
    dev_mem:'15.9 GB DDR4', dev_disk:'Samsung SSD 970 EVO', dev_disk1:'Crucial MX500 SSD',
    dev_eth:'Realtek PCIe GbE Family Controller', dev_gpu:'NVIDIA GeForce RTX 3060',
    sub_cpu:'% Utilization', sub_mem:'Memory usage', sub_disk:'Active time  (0 - 100%)',
    sub_disk1:'Fragmentation', sub_eth:'Throughput', sub_gpu:'GPU utilization',

    ov_cpu_title:'CPU · Hillclimb',
    ov_cpu_desc:'Drive across the utilization curve, grab blue data points and hit the orange turbo pads. Flips in the air give stunt points, a clean landing an extra bonus. Steep hills cost momentum — you can’t crash.',
    ov_cpu_keys:'<kbd>W</kbd>/<kbd>↑</kbd> gas · <kbd>S</kbd>/<kbd>↓</kbd> brake · <kbd>A D</kbd>/<kbd>← →</kbd> rotate in the air · <kbd>R</kbd> new track',
    ov_mem_title:'Memory · Dino Run',
    ov_mem_desc:'Jump over the memory spikes and grab blue cache orbs in mid-air. Watch out for floating LEAK blocks — better to run underneath. Double jump included; a short tap jumps lower than a hold.',
    ov_mem_keys:'<kbd>Space</kbd> / <kbd>W</kbd> / <kbd>↑</kbd> jump (or click)',
    ov_disk_title:'Disk 0 · Data Catcher',
    ov_disk_desc:'Catch blue files and golden cache, dodge the red bad sectors. Error-free streaks raise the combo multiplier up to ×5, and I/O bursts briefly rain down files. Three bad sectors and the drive is done.',
    ov_disk_keys:'<kbd>A</kbd>/<kbd>←</kbd> · <kbd>D</kbd>/<kbd>→</kbd> move the read/write head',
    ov_defrag_title:'Disk 1 · Defrag',
    ov_defrag_desc:'Collect the orange fragments — the chain behind you grows. Golden fragments give +30 but vanish after 5 seconds, and every third fragment drops a new bad sector onto the platter.',
    ov_defrag_keys:'<kbd>WASD</kbd> / <kbd>arrow keys</kbd> to steer',
    ov_net_title:'Ethernet · Packet Flight',
    ov_net_desc:'Keep the data packet aloft with short impulses and fly through the firewall gaps. Golden bonus bytes in the gap centre give +15 — and later some gaps start drifting up and down.',
    ov_net_keys:'<kbd>Space</kbd> / <kbd>W</kbd> / <kbd>↑</kbd> impulse (or click)',
    ov_gpu_title:'GPU · Render Defense',
    ov_gpu_desc:'Shoot the render jobs before they reach the frame line: heavy 4K jobs need two hits, quick glitch jobs are fast. Destroyed jobs sometimes drop VRAM — catch it for +20 FPS or a triple shot.',
    ov_gpu_keys:'<kbd>A</kbd>/<kbd>←</kbd> <kbd>D</kbd>/<kbd>→</kbd> move · <kbd>Space</kbd>/<kbd>W</kbd>/<kbd>↑</kbd> fire',

    start_hint:'Click or press any key to start',
    go_title:'Game Over', go_score:'Score', go_high:'High score',
    go_restart:'Press <kbd>R</kbd> to restart',
  }
};

function t(key) {
  return (I18N[LANG] && I18N[LANG][key]) || I18N.de[key] || key;
}

/* --- tr(): Laufzeit-Spielstrings ins Englische übersetzen (DE = Quelle) --- */
// Exakte Ganzstring-Treffer: Info-Labels, Game-Over-Gründe, Canvas-Beschriftungen,
// vollständige Flash-Texte ohne dynamische Zahlen.
const TR_EXACT = {
  // Info-Panel-Labels
  'Auslastung':'Utilization', 'Geschwindigkeit':'Speed', 'Distanz':'Distance',
  'Datenpunkte':'Data points', 'Stunt-Punkte':'Stunt points', 'Betriebszeit':'Up time',
  'Verwendet':'In use', 'Verfügbar':'Available', 'Cache-Orbs':'Cache orbs',
  'Committet':'Committed', 'Ausgelagerter Pool':'Paged pool', 'Aktive Zeit':'Active time',
  'Gesammelt':'Collected', 'Sektoren':'Sectors', 'Schreibgeschw.':'Write speed',
  'Nächster Burst':'Next burst', 'Fragmentierung':'Fragmentation', 'Fragmente':'Fragments',
  'Kettenlänge':'Chain length', 'Defekte Sektoren':'Bad sectors', 'Tempo':'Rate',
  'Gold-Fragment':'Gold fragment', 'Zugestellt':'Delivered', 'Bonus-Bytes':'Bonus bytes',
  'Durchsatz':'Throughput', 'Firewall-Lücke':'Firewall gap', 'Adaptername':'Adapter name',
  'IPv4-Adresse':'IPv4 address', 'Gerendert':'Rendered', 'VRAM-Drops':'VRAM drops',
  'Temperatur':'Temperature', 'Treiberversion':'Driver version',
  // Canvas-Beschriftungen
  'Sektoren ':'Sectors', 'Frame-Linie':'Frame line', 'I/O-Burst':'I/O burst',
  // vollständige Flash-Texte
  '+25 Datenpunkt':'+25 data point', '+25 Cache':'+25 cache', '+50 Cache!':'+50 cache!',
  'Bad Sector!':'Bad sector!', '-5 verpasst':'-5 missed', 'I/O-Burst!':'I/O burst!',
  'Frame Drop! −20 FPS':'Frame drop! −20 FPS', 'Dreifach-Shader!':'Triple shader!',
  // Game-Over-Gründe
  'Speicher voll — Out of Memory!':'Memory full — out of memory!',
  'Zu viele defekte Sektoren!':'Too many bad sectors!',
  'Lesekopf über den Plattenrand hinaus!':'Read head ran off the platter!',
  'Fragmentkette verhakt!':'Fragment chain tangled!',
  'Defekten Sektor getroffen!':'Hit a bad sector!',
  'Verbindung getrennt!':'Connection lost!',
  'Paketverlust — Firewall!':'Packet loss — firewall!',
  'GPU überlastet — 0 FPS!':'GPU overloaded — 0 FPS!',
};
// Phrasen für Strings mit dynamischen Zahlen (Reihenfolge: längere/spezifische zuerst).
const TR_PHRASE = [
  ['Pakete zugestellt','packets delivered'], ['Jobs gerendert','jobs rendered'],
  ['Blöcke/s','blocks/s'], ['Cache-Orbs','cache orbs'], ['Bonus-Bytes','bonus bytes'],
  ['Dreifach (','Triple ('], [' 15,9 GB',' 15.9 GB'], ['/15,9 GB','/15.9 GB'],
  [' Fragmente',' fragments'], ['Länge','length'], ['Perfekt!','Perfect!'],
  [' Flips',' flips'], [' Dateien',' files'], [' Blöcke',' blocks'], [' Pakete',' packets'],
  ['läuft!','running!'], ['aktiv','active'],
];

function tr(str) {
  str = String(str);
  if (LANG !== 'en') return str;
  if (str in TR_EXACT) return TR_EXACT[str];
  let out = str;
  for (const [a, b] of TR_PHRASE) if (out.indexOf(a) !== -1) out = out.split(a).join(b);
  return out;
}

/* Statische DOM-Texte (data-i18n / data-i18n-title) auf die aktive Sprache setzen. */
function applyStaticText() {
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-title]').forEach(el => { el.title = t(el.dataset.i18nTitle); });
  const lb = document.getElementById('langToggle');
  if (lb) { lb.textContent = LANG === 'de' ? 'EN' : 'DE'; lb.title = t('lang_title'); }
}

function setLang(l) {
  LANG = l;
  applyStaticText();
  if (typeof applyLang === 'function') applyLang();   // in main.js definiert
}

// Umschalt-Button in der Fußzeile
window.addEventListener('DOMContentLoaded', () => {
  applyStaticText();
  const lb = document.getElementById('langToggle');
  if (lb) lb.addEventListener('click', () => setLang(LANG === 'de' ? 'en' : 'de'));
});
