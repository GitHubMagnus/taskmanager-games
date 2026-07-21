# Task-Manager Mini-Games

Sechs kleine Arcade-Spiele, versteckt im Look des klassischen Windows-Task-Managers. Die Oberfläche bildet den „Leistung“-Tab optisch nach: Titelleiste, Menü- und Tab-Zeile, eine Sidebar mit live laufenden Sparkline-Kacheln und rechts der große Graph mit Info-Panel. Jede Kachel startet ihr eigenes Mini-Spiel direkt im Graph-Bereich, wobei Grid, Achsenbeschriftung und das Key-Value-Panel erhalten bleiben und mit echten Spielwerten gefüllt werden. Das Fenster lässt sich wie ein echtes Fenster an der Titelleiste verschieben.

Das Projekt ist reines Vanilla-JavaScript mit Canvas-2D, ohne Frameworks, ohne Abhängigkeiten und ohne Build-Schritt. Zum Spielen genügt es, `index.html` im Browser zu öffnen; alternativ tut es jeder statische Server (etwa `npx serve .`). Highscores werden pro Sitzung im Speicher gehalten.

## Die sechs Spiele

Überall gelten Pfeiltasten und WASD gleichwertig, ein laufendes Spiel pausiert beim Wechsel der Kachel, und nach einem Game Over startet `R` neu.

| Kachel | Spiel | Prinzip | Steuerung |
|---|---|---|---|
| CPU | Hillclimb | Auf der Auslastungskurve fahren, Datenpunkte sammeln, Flips drehen. Hügel kosten Schwung, Crashen ist unmöglich — nur die Punkte zählen. | W/↑ Gas, S/↓ Bremse, A/D bzw. ←/→ in der Luft drehen, R neue Strecke |
| Arbeitsspeicher | Dino-Run | Über hereinscrollende Speicherspitzen springen, mit Doppelsprung, Sprung-Puffer und variabler Sprunghöhe. Das Tempo steigt stetig. | Leertaste/W/↑ springen |
| Datenträger 0 | Daten-Catcher | Blaue Dateien und goldenen Cache fangen, roten Bad Sectors ausweichen. Drei gefangene Bad Sectors beenden das Spiel. | A/← und D/→ |
| Datenträger 1 | Defrag | Snake auf dem Platten-Raster: Fragmente einsammeln, die wachsende Kette nicht berühren. | WASD/Pfeiltasten lenken |
| Ethernet | Paket-Flug | Flappy-Prinzip: das Datenpaket mit Impulsen durch die Lücken der Firewall-Wände steuern. | Leertaste/W/↑ oder Klick |
| GPU | Render-Defense | Fallende Render-Jobs abschießen, bevor sie die Frame-Linie erreichen. Jeder Durchbruch kostet 20 FPS. | A/D bewegen, Leertaste/W/↑ feuern |

## Aufbau

`index.html` enthält nur das Task-Manager-Markup und lädt die Skripte in fester Reihenfolge. `css/style.css` trägt den kompletten Task-Manager-Look. `js/core.js` stellt die gemeinsame Basis bereit: Utilities und Value-Noise, die redundante Tastaturbelegung, Canvas-Verwaltung samt Grid sowie den geteilten Zustand und den Game-Over-Screen. Unter `js/games/` liegt je Spiel eine Datei (`cpu.js`, `mem.js`, `disk.js`, `defrag.js`, `net.js`, `gpu.js`), die jeweils ein Objekt mit `reset`, `update`, `draw` und `infoFields` definiert. `js/main.js` verdrahtet zum Schluss Sidebar, Panel, Start-Overlays, das Fenster-Dragging und die Hauptschleife.
