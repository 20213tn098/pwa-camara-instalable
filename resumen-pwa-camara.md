# Resumen y Guía de Defensa Técnica: PWA Cámara e Instalabilidad Nativa (Temas 6.1 y 6.2)

---

## 1. ¿Qué hace la aplicación?

La aplicación **Inspección Visual PWA** es una Progressive Web App diseñada para entornos móviles y de campo. Su objetivo principal es permitir la captura y previsualización local de evidencia fotográfica mediante el hardware de la cámara del dispositivo (trasera y frontal), integrando instalación nativa en la pantalla de inicio y un flujo ético de solicitud de permisos (*Pre-Permission UX Pattern*).

### Funciones principales
- **Instalabilidad PWA:** Permite agregar la aplicación a la pantalla de inicio del teléfono celular y abrirla en ventana independiente (`display: standalone`), sin barras de navegación del navegador web.
- **Detección inteligente de plataforma (iOS/Safari vs Android/Chrome):** Muestra el botón de instalación interactivo en Android o una tarjeta con instrucciones guiadas en iPhone.
- **Acceso consciente a cámara (Pre-Permiso):** Despliega una advertencia explicativa previa sobre el uso local de la cámara antes de invocar el diálogo nativo del sistema operativo.
- **Alternancia de sensores en caliente:** Permite cambiar instantáneamente entre la cámara trasera (`environment`) y la frontal (`user`).
- **Liberación de hardware:** Apaga el sensor y detiene los flujos de video (`tracks`) para no mantener la cámara encendida innecesariamente, ahorrando batería y memoria.
- **Diagnóstico granular de hardware:** Notifica con precisión si el usuario negó el permiso, si el sensor no existe o si está ocupado por otra aplicación.
- **Disponibilidad Offline:** Gracias a su Service Worker, la interfaz y sus recursos cargan instantáneamente aun sin conexión a Internet o en modo avión.

### 🛡️ Defensa técnica de esta sección
* **¿Qué problema de negocio y experiencia de usuario resuelve?**
  En aplicaciones industriales o de inspección técnica en terreno, forzar al usuario a descargar una app pesada desde Google Play o App Store genera fricción, consumo de datos y demoras. Esta PWA se distribuye con una simple URL HTTPS, pesa menos de 50 KB, se instala en 2 segundos y garantiza al usuario que sus imágenes se procesan de forma 100% privada en la memoria de su propio teléfono.
* **¿Por qué es indispensable que se sirva bajo HTTPS?**
  Por especificación de seguridad del W3C y los fabricantes de navegadores, el acceso al hardware sensible (`navigator.mediaDevices.getUserMedia`) y la ejecución de Service Workers están clasificados como **Powerful Features** (*Características Poderosas*). Están estrictamente bloqueados en conexiones inseguras (`http://`) para evitar ataques de espionaje o inyección man-in-the-middle (MITM). GitHub Pages provee certificados SSL/TLS automáticos, cumpliendo esta exigencia.

---

## 2. Mapa y Estructura de Archivos del Proyecto

```
pwa-camara-instalable/
├── index.html          # Vista, metadatos PWA, soporte iOS y etiqueta <video>
├── styles.css          # Diseño Mobile First, paleta oscura #0f172a y controles táctiles
├── app.js              # Lógica de pre-permiso, hardware y promesas explícitas
├── sw.js               # Service Worker: App Shell precacheado bajo Cache First
├── manifest.json       # Manifiesto de identidad, standalone e iconos de alta resolución
└── icons/
    ├── icon-192.png    # Icono obligatorio 192x192 px (launcher / any maskable)
    └── icon-512.png    # Icono obligatorio 512x512 px (splash screen nativo)
```

---

## 3. Instalabilidad Nativa y Manifiesto (`manifest.json` e `index.html`)

### A. Anatomía del `manifest.json`
El manifiesto le indica al sistema operativo móvil cómo debe comportarse la aplicación al ser instalada:

```json
{
  "name": "Inspección Visual PWA",
  "short_name": "InspecciónPWA",
  "description": "Captura de evidencia fotográfica con acceso consciente a cámara.",
  "start_url": "./index.html",
  "scope": "./",
  "display": "standalone",
  "background_color": "#0f172a",
  "theme_color": "#0f172a",
  "orientation": "portrait",
  "icons": [
    {
      "src": "./icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "./icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### B. Metadatos en el `<head>` de `index.html`
Para garantizar paridad total entre plataformas, se vincularon las etiquetas estándar y propietarias:
- `<link rel="manifest" href="./manifest.json">`: Registro del manifiesto estándar.
- `<meta name="theme-color" content="#0f172a">`: Colorea la barra de estado del sistema operativo.
- `<link rel="apple-touch-icon" href="./icons/icon-192.png">`: Icono de alta calidad para iOS.
- `<meta name="apple-mobile-web-app-capable" content="yes">`: Activa el modo pantalla completa en WebKit.
- `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`: Integración visual en iPhone.

### C. Captura del Evento de Instalación en `app.js`
El navegador suele mostrar un banner automático que interrumpe al usuario. Se interceptó el evento para otorgar el control a la interfaz:

```javascript
let eventoInstalacionDiferido = null;

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  eventoInstalacionDiferido = event;
  if (btnInstalar) btnInstalar.hidden = false;
});

btnInstalar.addEventListener('click', () => {
  if (!eventoInstalacionDiferido) return;
  eventoInstalacionDiferido.prompt();
  eventoInstalacionDiferido.userChoice.then((resultado) => {
    btnInstalar.hidden = true;
    eventoInstalacionDiferido = null;
  });
});
```

### 🛡️ Defensa técnica de esta sección
* **¿Cuáles son los 3 requisitos obligatorios para que Android/Chrome permita instalar la PWA?**
  1. Servirse bajo HTTPS válido.
  2. Tener un Service Worker registrado y activo que intercepte peticiones (`fetch`).
  3. Contar con un `manifest.json` con `start_url`, `display: standalone` o `fullscreen`, nombre y los dos iconos PNG requeridos (`192x192` y `512x512`). Si falta alguno de los dos archivos físicos, Chrome cancela silenciosamente la instalabilidad.
* **¿Por qué todas las rutas usan el prefijo relativo `./`?**
  GitHub Pages aloja los proyectos bajo un subdirectorio (ej. `https://20213tn098.github.io/pwa-camara-instalable/`). Si se usara una ruta absoluta como `/manifest.json` o `/sw.js`, el navegador buscaría los archivos en la raíz del dominio `20213tn098.github.io/`, resultando en un error HTTP 404 y rompiendo el alcance (*scope*) de la PWA. El prefijo `./` garantiza portabilidad universal.

---

## 4. Consideraciones Críticas para iOS / WebKit (iPhone y iPad)

Apple implementa reglas estrictas y diferentes a Chromium en su motor WebKit:

### A. La ausencia de `beforeinstallprompt` en iOS
En Safari móvil, Apple **bloquea deliberadamente** que JavaScript invoque el diálogo nativo de instalación. El evento `beforeinstallprompt` jamás se dispara en iOS.
- **Consecuencia:** Si solo dependiéramos de ese evento, en un iPhone el botón de instalar quedaría permanentemente oculto y el usuario no sabría cómo instalarla.
- **Solución implementada:** Detección de plataforma en `verificarEntornoIOS()`:
  ```javascript
  const esIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const estaInstalada = window.navigator.standalone === true ||
                        window.matchMedia('(display-mode: standalone)').matches;

  if (esIOS && !estaInstalada) {
    const guiaIOS = document.getElementById('instrucciones-ios');
    if (guiaIOS) guiaIOS.hidden = false;
  }
  ```
  Si el usuario está en iPhone y aún navega dentro de Safari, la PWA le muestra una tarjeta visual clara: *"Pulsa Compartir ⎋ y selecciona 'Agregar a inicio'"*.

### B. El secuestro a pantalla completa del video en iOS
En iOS, si se declara la etiqueta de video simplemente como `<video autoplay></video>`, en cuanto se enciende la cámara el sistema operativo abre su reproductor nativo de video a pantalla completa, ocultando la interfaz HTML y los botones de alternar cámara y apagar.
- **Solución obligatoria:** Incluir los tres atributos simultáneos:
  ```html
  <video id="visor-camara" autoplay playsinline muted></video>
  ```
  - `playsinline`: Obliga a iOS a reproducir el flujo dentro del marco de la página web sin abrir el reproductor del sistema.
  - `muted`: Evita bloqueos por políticas del navegador respecto al audio.
  - `autoplay`: Inicia el flujo de video automáticamente tan pronto se asigna el `srcObject`.

---

## 5. Ética de Permisos y Patrón de Pre-Permiso (UX Consciente)

### El problema del cuadro nativo prematuro
Un error común en desarrollo web es solicitar `getUserMedia()` al cargar la página o al pulsar un botón directo sin contexto.

- **El riesgo irreversible:** Si el usuario, por sorpresa o desconfianza, pulsa **"Bloquear"** en el cuadro de diálogo del navegador, el permiso queda denegado permanentemente a nivel del sistema operativo. A partir de ese instante, **JavaScript pierde la capacidad de volver a mostrar la ventana de solicitud**. Cualquier llamada subsiguiente será rechazada automáticamente con `NotAllowedError`. La única forma de repararlo es que el usuario navegue manualmente a la configuración del navegador para restablecer los permisos del sitio.
- **El patrón de Pre-Permiso implementado:**
  1. **Paso 1 (Intención):** El usuario pulsa `#btn-preparar-camara` ("Solicitar Acceso a Cámara").
  2. **Paso 2 (Explicación y Consentimiento):** Se despliega la tarjeta `#aviso-permiso` que explica claramente:
     > *"Esta aplicación requiere acceso a tu cámara únicamente para mostrar una vista previa local en pantalla. Ninguna imagen o video se almacena ni se envía a servidores externos."*
  3. **Paso 3 (Ejecución):** Solo cuando el usuario pulsa conscientemente `#btn-confirmar-permiso`, se ejecuta `iniciarCamara()`, disparando el diálogo del navegador en un momento en que el usuario ya sabe exactamente qué esperar y por qué debe autorizarlo.

---

## 6. Control de Hardware Multimedia (`app.js`)

El archivo `app.js` encapsula el control de hardware multimedia utilizando la API estándar `navigator.mediaDevices.getUserMedia()`.

### A. Liberación de Hardware (`detenerCamaraActiva`)
```javascript
function detenerCamaraActiva() {
  if (streamActual) {
    streamActual.getTracks().forEach((track) => {
      track.stop();
    });
    streamActual = null;
  }
  if (visorVideo) {
    visorVideo.srcObject = null;
    visorVideo.classList.remove('activo');
  }
}
```

### B. Inicialización y Alternancia de Lentes (`iniciarCamara`)
```javascript
function iniciarCamara(modo) {
  detenerCamaraActiva();

  const restricciones = {
    video: { facingMode: modo },
    audio: false
  };

  return navigator.mediaDevices.getUserMedia(restricciones)
    .then((stream) => {
      streamActual = stream;
      visorVideo.srcObject = stream;
      visorVideo.classList.add('activo');
      actualizarMensajeEstado(`Cámara activa (${modo === 'environment' ? 'Trasera' : 'Frontal'})`, 'activa');
    })
    .catch((error) => {
      // Diagnóstico granular de excepciones
    });
}
```

### 🛡️ Defensa técnica de esta sección
* **¿Por qué es obligatorio llamar a `detenerCamaraActiva()` antes de alternar la cámara?**
  En los smartphones, el procesador de señal de imagen (ISP) y el bus de hardware no admiten que dos sensores de cámara funcionen en paralelo para una misma aplicación web. Si no se detienen las pistas activas (`track.stop()`) del sensor trasero antes de pedir el frontal, WebKit o Android arrojarán un error fatal de tipo `NotReadableError` o la imagen quedará congelada en negro.
* **¿Qué excepciones del hardware se capturan y cómo se gestionan?**
  1. `NotAllowedError`: El usuario denegó el permiso en el diálogo nativo o en los ajustes del sistema. Se notifica que debe habilitarlo desde la configuración del navegador.
  2. `NotFoundError`: El dispositivo no cuenta con el lente solicitado (por ejemplo, solicitar cámara trasera en una laptop que solo tiene cámara frontal).
  3. `NotReadableError`: El sensor está siendo utilizado y bloqueado por otra aplicación (ej. WhatsApp o la app nativa de cámara).

---

## 7. Service Worker y Estrategia de Caché (`sw.js`)

El archivo `sw.js` asegura que el App Shell de la PWA esté disponible de forma permanente y offline.

### Ciclo de vida y estrategia
- **Precacheo en `install`:** Guarda en `CacheStorage` (`camara-shell-v1`) los archivos `index.html`, `styles.css`, `app.js`, `manifest.json` y los dos iconos PNG, seguido de `self.skipWaiting()`.
- **Limpieza en `activate`:** Itera sobre `caches.keys()`, elimina cualquier caché obsoleta distinta a la versión activa y toma control de las pestañas de inmediato con `self.clients.claim()`.
- **Estrategia en `fetch`:** **Cache First** estricto para recursos locales `GET`. Busca el recurso en la caché local; si existe, lo devuelve al instante (0 ms de latencia). Si no, lo solicita a la red, y si la red falla, devuelve `index.html`.

### 🛡️ Defensa técnica de esta sección
* **¿Por qué Cache First para el App Shell?**
  El código base de la interfaz (HTML, estilos, iconos y lógica JS) es estático y no debe depender de la velocidad de la red celular. Cache First garantiza que la aplicación arranque instantáneamente y funcione al 100% incluso en modo avión durante la evaluación presencial.

---

## 8. Decisiones Técnicas y Restricciones Cumplidas

1. **JavaScript Vanilla Puro:** Cero dependencias (sin React, Vue o bundlers como Webpack/Vite). Máxima velocidad de carga y menor huella de memoria en dispositivos móviles modestos.
2. **Prohibición Total de `async/await`:** Toda la asincronía está resuelta exclusivamente mediante Promesas nativas encadenadas (`.then()`, `.catch()`).
3. **Código Limpio:** Sin comentarios en los archivos JS para cumplir con las directivas de código en producción.
4. **Despliegue GitHub Pages:** Servido bajo HTTPS en `https://20213tn098.github.io/pwa-camara-instalable/`.

---

## 9. Banco de Preguntas Típicas para la Revisión Presencial (Evaluador / Profesor)

| # | Pregunta del Profesor | Respuesta Técnica Exacta |
| :--- | :--- | :--- |
| **1** | *¿Por qué en tu iPhone no aparece el botón "Instalar Aplicación"?* | Porque Safari e iOS no soportan el evento `beforeinstallprompt`. Por diseño de Apple, la instalación debe ser manual; por eso mi código detecta iOS y despliega la tarjeta con instrucciones para usar el botón Compartir y "Agregar a inicio". |
| **2** | *¿Por qué el video en iPhone no se abre en pantalla completa al encender la cámara?* | Porque le agregué el atributo `playsinline` a la etiqueta `<video>`, lo cual obliga a WebKit a renderizar el stream dentro del DOM de la página sin invocar el reproductor multimedia nativo de iOS. |
| **3** | *¿Qué pasa si el usuario presiona "Rechazar" en el cuadro de permiso de la cámara?* | La promesa de `getUserMedia()` se rechaza con la excepción `NotAllowedError`. Mi código la atrapa en el bloque `.catch()` y le indica al usuario que el permiso fue denegado y debe reactivarlo desde los ajustes de su navegador, ya que el navegador no volverá a mostrar el cuadro de diálogo. |
| **4** | *¿Por qué no pides el permiso de la cámara nada más abrir la página?* | Por ética de diseño (Pre-Permiso UX). Si el usuario ve un cuadro de permiso sin contexto tiende a rechazarlo por desconfianza, bloqueando la cámara permanentemente. Mi aplicación primero le explica en una tarjeta local qué se va a hacer y le asegura que nada se envía a servidores. |
| **5** | *¿Qué hace la función `detenerCamaraActiva()` y por qué es necesaria antes de cambiar de cámara?* | Obtiene todas las pistas del stream con `streamActual.getTracks()` y ejecuta `.stop()` en cada una. Es obligatoria porque el sistema operativo del teléfono no permite abrir la cámara frontal mientras la trasera sigue activa; si no se liberan, la promesa falla con `NotReadableError`. |
| **6** | *¿Cuáles son los valores válidos para alternar entre cámara frontal y trasera?* | Se pasa la restricción `facingMode: 'environment'` para la cámara trasera (entorno) y `facingMode: 'user'` para la cámara frontal (selfie). |
| **7** | *¿Cuáles son los requisitos de los iconos en el `manifest.json`?* | Se requieren al menos dos iconos en formato PNG con dimensiones exactas de 192x192 px (para el launcher de aplicaciones) y 512x512 px (para el splash screen de arranque). |
| **8** | *¿Por qué todas las rutas en el código usan `./` en lugar de `/`?* | Porque en GitHub Pages la aplicación se publica dentro de un subdirectorio (`/pwa-camara-instalable/`). Si se usara `/`, el navegador buscaría los archivos en la raíz del dominio principal, provocando errores 404. |
| **9** | *¿Por qué se utiliza la estrategia Cache First en el Service Worker?* | Porque los archivos del App Shell (HTML, CSS, JS, manifest e iconos) son estáticos. Cache First prioriza el almacenamiento local, garantizando carga instantánea (0 ms) y funcionamiento total en modo avión. |
| **10** | *¿Por qué no usaste `async/await` en tu código?* | Por restricción técnica de la rúbrica de la práctica, demostrando el dominio fundamental del encadenamiento de Promesas nativas (`.then()` y `.catch()`) y el control explícito del flujo asíncrono. |
