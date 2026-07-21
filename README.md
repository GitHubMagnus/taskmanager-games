# Task-Manager Mini-Games

**▶ [Jetzt im Browser spielen](https://githubmagnus.github.io/taskmanager-games/)**

Sechs kleine Arcade-Spiele, versteckt im Look des klassischen Windows-Task-Managers. Die Oberfläche bildet den „Leistung“-Tab optisch nach: Titelleiste, Menü- und Tab-Zeile, eine Sidebar mit live laufenden Sparkline-Kacheln und rechts der große Graph mit Info-Panel. Jede Kachel startet ihr eigenes Mini-Spiel direkt im Graph-Bereich, wobei Grid, Achsenbeschriftung und das Key-Value-Panel erhalten bleiben und mit echten Spielwerten gefüllt werden. Das Fenster lässt sich wie ein echtes Fenster an der Titelleiste verschieben.

Das Projekt ist reines Vanilla-JavaScript mit Canvas-2D, ohne Frameworks, ohne Abhängigkeiten und ohne Build-Schritt. Zum Spielen genügt es, `index.html` im Browser zu öffnen; alternativ tut es jeder statische Server (etwa `npx serve .`). Highscores werden pro Sitzung im Speicher gehalten.

## Die sechs Spiele

Überall gelten Pfeiltasten und WASD gleichwertig, ein laufendes Spiel pausiert beim Wechsel der Kachel, und nach einem Game Over startet `R` neu. Alle Soundeffekte sind kleine, zur Laufzeit erzeugte WebAudio-Synth-Klänge ohne Audiodateien; `M` oder das Lautsprecher-Symbol unten rechts schaltet stumm. Über den `EN`/`DE`-Schalter in der Fußzeile lässt sich die gesamte Oberfläche zwischen Deutsch und Englisch umschalten, auch mitten im Spiel.

| Kachel | Spiel | Prinzip | Steuerung |
|---|---|---|---|
| CPU | Hillclimb | Auf der Auslastungskurve fahren, Datenpunkte sammeln, Turbo-Pads mitnehmen und Flips drehen (Bonus für perfekte Landungen). Hügel kosten Schwung, die Kamera folgt auch vertikal, Crashen ist unmöglich. | W/↑ Gas, S/↓ Bremse, A/D bzw. ←/→ in der Luft drehen, R neue Strecke |
| Arbeitsspeicher | Dino-Run | Über Speicherspitzen springen, Cache-Orbs in der Luft einsammeln und unter schwebenden LEAK-Blöcken durchlaufen. Doppelsprung, Sprung-Puffer und variable Sprunghöhe inklusive. | Leertaste/W/↑ springen |
| Datenträger 0 | Daten-Catcher | Blaue Dateien und goldenen Cache fangen, roten Bad Sectors ausweichen. Fehlerfreie Serien treiben den Combo-Multiplikator bis ×5, regelmäßige I/O-Bursts bringen dichte Datei-Schauer. | A/← und D/→ |
| Datenträger 1 | Defrag | Snake auf dem Platten-Raster: Fragmente einsammeln, goldene Fragmente verschwinden nach 5 s, und nach jedem dritten Fragment blockiert ein neuer defekter Sektor das Feld. | WASD/Pfeiltasten lenken |
| Ethernet | Paket-Flug | Flappy-Prinzip: das Datenpaket durch Firewall-Lücken steuern, Bonus-Bytes in der Lückenmitte einsammeln — später wandern manche Lücken auf und ab. | Leertaste/W/↑ oder Klick |
| GPU | Render-Defense | Render-Jobs abschießen, bevor sie die Frame-Linie erreichen: schwere 4K-Jobs brauchen zwei Treffer, flinke Glitch-Jobs sind schnell, VRAM-Drops geben +20 FPS oder Dreifach-Schuss. | A/D bewegen, Leertaste/W/↑ feuern |

## Aufbau

`index.html` enthält nur das Task-Manager-Markup und lädt die Skripte in fester Reihenfolge. `css/style.css` trägt den kompletten Task-Manager-Look. `js/core.js` stellt die gemeinsame Basis bereit: Utilities und Value-Noise, die redundante Tastaturbelegung, Canvas-Verwaltung samt Grid sowie den geteilten Zustand und den Game-Over-Screen. `js/i18n.js` regelt die Zweisprachigkeit: authored Copy über ein `t(key)`-Wörterbuch, die zur Laufzeit erzeugten Spielstrings über eine deutsch-englische Übersetzungstabelle `tr(str)`. `js/sound.js` liefert die WebAudio-Effekte als globales `S`-Objekt. Unter `js/games/` liegt je Spiel eine Datei (`cpu.js`, `mem.js`, `disk.js`, `defrag.js`, `net.js`, `gpu.js`), die jeweils ein Objekt mit `reset`, `update`, `draw` und `infoFields` definiert. `js/main.js` verdrahtet zum Schluss Sidebar, Panel, Start-Overlays, das Fenster-Dragging und die Hauptschleife.
