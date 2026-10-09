# Files2Serve

Files2Serve ist eine kleine FastAPI-Anwendung zum internen Hochladen und Teilen von Dateien. Öffentliche Besucher können mit einem Upload-Hash eine Downloadseite aufrufen. Downloads lassen sich mit einem Passwort schützen und mit einem Ablaufdatum versehen.

## Funktionen

- Die Startseite nimmt einen Upload-Hash entgegen und führt bei gültigem Hash zur Downloadseite.
- Downloads zeigen Titel, Dateiname, Beschreibung und Ablaufdatum an. Für passwortgeschützte Dateien wird vor dem Download das Passwort abgefragt.
- Downloads mit einem abgelaufenen oder am aktuellen Tag endenden Ablaufdatum werden abgewiesen.
- Unter `/internal-admin` können angemeldete Administratoren Dateien hochladen, Metadaten einsehen und Uploads löschen. Der Verwaltungsbereich ist nicht von der öffentlichen Startseite aus verlinkt.
- Zu den optionalen Metadaten gehören ID, Beschreibung, Passwort und Ablaufdatum.

## Installation und Start

Python-Abhängigkeiten installieren:

```bash
python -m pip install -r requirements.txt
```

Für den lokalen Entwicklungsbetrieb Zugangsdaten setzen und den Server starten:

```bash
export ADMIN_USERNAME=admin
export ADMIN_PASSWORD='change-this-password'
uvicorn app:app --reload
```

Die Anwendung ist danach unter <http://127.0.0.1:8000> erreichbar. `ADMIN_USERNAME` ist optional und hat standardmäßig den Wert `admin`. Ohne gesetztes `ADMIN_PASSWORD` ist der Verwaltungsbereich deaktiviert.

## Verwendung

1. `/internal-admin` öffnen und mit den konfigurierten HTTP-Basic-Auth-Zugangsdaten anmelden.
2. Eine Datei auswählen und Titel sowie gewünschte optionale Metadaten eintragen.
3. Nach dem Upload erscheint der Eintrag in der Verwaltung. Unter „Details“ ist der zufällig erzeugte Upload-Hash sichtbar.
4. Den Hash an die Empfänger weitergeben. Sie geben ihn auf der Startseite ein und laden die Datei anschließend auf der Downloadseite herunter.

## Speicherung

Uploads werden im Verzeichnis `uploads/` gespeichert. Für jeden Upload legt die Anwendung einen Ordner mit dem 16-stelligen hexadezimalen Upload-Hash an, in dem die Datei liegt, sowie eine gleichnamige TOML-Datei mit den Metadaten. Das Verzeichnis ist Laufzeitdatenspeicher und sollte nicht öffentlich als statische Website ausgeliefert werden.

## Tests

Die End-to-End-Tests verwenden Playwright. Node-Abhängigkeiten installieren und die Tests starten:

```bash
npm install
npx playwright install chromium
npm run test:e2e
``` 

Playwright startet dafür Uvicorn auf `127.0.0.1:8000` und verwendet die Testzugangsdaten `admin` / `test`.

Hinweis: 

Tests schlagen fehl, weil Testdaten von mir nicht hochgeladen wurden. Diesen müssen unter testdata selbst angelegt und Testfunktionen gegebenenfalls angepasst werden. 

## Sicherheitshinweise

- Die Anwendung richtet selbst kein HTTPS ein. HTTP-Basic-Auth-Zugangsdaten und Download-Passwörter dürfen außerhalb eines geschützten lokalen Netzes nur über HTTPS übertragen werden, zum Beispiel hinter einem entsprechend konfigurierten Reverse Proxy.
- Upload-Passwörter werden derzeit unverschlüsselt in der TOML-Metadatendatei gespeichert und in der internen Detailansicht angezeigt. `uploads/` und Backups davon müssen entsprechend geschützt werden.
- Der Upload-Hash ermöglicht den Zugriff auf die Downloadseite und sollte wie ein Freigabelink behandelt und nur an vorgesehene Empfänger weitergegeben werden. Ein Passwortschutz ist optional.
- Die HTML-Oberflächen laden Tailwind CSS über ein CDN und benötigen dafür beim Seitenaufruf eine Verbindung zum CDN.
