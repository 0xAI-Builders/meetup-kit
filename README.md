# Meetup Kit

Landings para meetups con registro y seguimiento por canal. Lo hizo 0xAI Builders para quienes organizan meetups en la comunidad de Team1 LatAm, y cualquiera puede usarlo o montarlo.

En dos minutos armas la página de tu meetup. Compartes una liga distinta en cada canal (WhatsApp, Telegram, Instagram, el QR pegado en el lugar) y en tu panel ves cuántas personas llegaron por cada uno, cuántas dieron clic para registrarse y cuántas dieron su primer paso en Avalanche después del evento.

## Qué hace

| Pieza | Para qué |
|---|---|
| Landing del meetup (`/<liga>`) | Portada con foto, cuenta regresiva, agenda, lugar y botón de registro. Cambia sola: antes del evento invita a registrarse, durante el evento dice «en vivo» y después lleva a Cascade, Builder Hub y Core. |
| Asistente (`/crear`) | Cinco pasos con vista previa en vivo dentro de un celular. Funciona igual para editar. |
| Panel privado (`/<liga>/panel#k=…`) | Visitas, personas únicas, clics a registro, registrados en Luma, pasos en Avalanche, embudo, visitas por día y por canal. Ligas y QR por canal y un resumen listo para el recap de Team1. Se actualiza cada 30 s. |
| Cartel (`/<liga>/cartel`) | Hoja A4 con el QR del canal «qr», lista para imprimir. |
| Calendario (`/<liga>/evento.ics`) | Archivo para agregar el evento al calendario, con aviso dos horas antes. |

## Cómo se mide

- **Canal**: cada liga lleva `?s=<canal>`. La landing lo guarda y lo quita de la barra de direcciones para que, si alguien la reenvía, no se mezcle con el canal original.
- **Visitas y personas únicas**: la visita se cuenta desde el navegador cuando la página está visible, así que las vistas previas de WhatsApp o Telegram no cuentan. Para las personas únicas se guarda una huella diaria `sha256(ip | navegador | día | meetup | SALT)`, recortada. No se guardan IPs, cookies ni datos personales.
- **Clics de salida**: «Apartar mi lugar», Cascade, Builder Hub y Core pasan por `/<liga>/ir/<destino>`, que cuenta el clic y redirige. El registro agrega `utm_source`, `utm_medium=meetup-kit` y `utm_campaign`.
- **Registrados en Luma**: si la liga de registro es de Luma, el panel lee el conteo público del evento (caché de 10 minutos).
- Los bots y rastreadores conocidos se ignoran.

Son clics, no confirmaciones: el registro final se comprueba en cada plataforma. El resumen del panel lo dice.

## Acceso

Al crear un meetup recibes dos ligas: la pública y la del panel. La del panel lleva una clave después de `#`; los navegadores nunca mandan esa parte al servidor, así que no queda en registros. Guárdala: es la única forma de ver los números y editar. Solo se guarda el hash de la clave.

Si defines `CREATE_CODE`, el asistente pide ese código para crear meetups.

## Correr en local

Requiere Node 22.13 o más reciente (usa `node:sqlite`). No tiene dependencias. El único código de terceros es `public/qrcode.js` (qrcode-generator 1.4.4 de Kazuhiko Arase, MIT), copiado del paquete de npm.

```bash
cp .env.example .env    # y llena BASE_URL y SALT
npm start               # o npm run dev para recargar al guardar
npm test
```

## Producción con Docker

```bash
cp .env.example .env    # BASE_URL, SALT (obligatoria), CREATE_CODE, HOST_PORT
docker compose up -d --build
```

Los datos (SQLite y portadas) quedan en `./data`. Para respaldar basta copiar esa carpeta. Detrás de nginx pon `TRUST_PROXY=1`; hay un ejemplo en `deploy/nginx.conf.example`.

## Variables

| Variable | Valor por omisión | Uso |
|---|---|---|
| `BASE_URL` | `http://localhost:7343` | Dirección pública, para ligas, QR y `.ics` |
| `SALT` | (ninguna en producción) | Sal de la huella de personas únicas. Con `NODE_ENV=production` el servicio no arranca sin ella |
| `CREATE_CODE` | vacío | Código para crear meetups |
| `TRUST_PROXY` | `0` | Leer la IP de `X-Real-IP` |
| `PORT`, `HOST` | `7343`, `127.0.0.1` | Dónde escucha |
| `DATA_DIR` | `./data` | SQLite y portadas |
| `DEFAULT_TZ` | `America/Mexico_City` | Zona del formulario |
| `CASCADE_URL`, `BUILDERHUB_URL`, `CORE_URL` | ligas de Team1 y Avalanche | Destinos de los pasos |

## Estructura

```
src/server.mjs      rutas, API, seguimiento
src/db.mjs          SQLite: meetups, hits por día y canal, únicos
src/util.mjs        fechas por zona horaria, slugs, limpieza
src/views/*.mjs     HTML del servidor (landing, inicio, crear, panel, cartel, ics)
public/             CSS y JS del navegador, sin compilación
test/               pruebas con node:test
```

## Licencia

MIT.
