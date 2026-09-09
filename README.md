# Zweck
Das Programm soll Dateien hochladen und zur Verfügen stellen können.
Die Daten sollen sicher transportiert werden. Beim zur Verfügung stellen soll die Möglichkeit einer Passworteingabe bestehen

## Interne Verwaltung

Die interne Verwaltung ist unter `/internal-admin` erreichbar und wird nicht in der normalen Benutzeroberfläche verlinkt. Der Zugriff ist nur mit HTTP Basic Authentication möglich. Vor dem Start müssen die Zugangsdaten gesetzt werden:

```bash
export ADMIN_USERNAME=admin
export ADMIN_PASSWORD='ein-langes-zufälliges-passwort'
uvicorn app:app --reload
```

Die Zugangsdaten müssen über HTTPS oder einen geschützten internen Netzwerkzugang übertragen werden. Ohne `ADMIN_PASSWORD` bleibt die Verwaltung deaktiviert.
