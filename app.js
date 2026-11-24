let streamActual = null;
let modoCamaraActual = 'environment';
let eventoInstalacionDiferido = null;

const visorVideo = document.getElementById('visor-camara');
const placeholderCamara = document.getElementById('placeholder-camara');
const mensajeEstado = document.getElementById('mensaje-estado');
const avisoPermiso = document.getElementById('aviso-permiso');
const btnInstalar = document.getElementById('btn-instalar');
const btnPrepararCamara = document.getElementById('btn-preparar-camara');
const btnConfirmarPermiso = document.getElementById('btn-confirmar-permiso');
const btnCancelarPermiso = document.getElementById('btn-cancelar-permiso');
const btnAlternarCamara = document.getElementById('btn-alternar-camara');
const btnApagarCamara = document.getElementById('btn-apagar-camara');

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js')
    .then((reg) => {
      console.log('Service Worker registrado:', reg.scope);
    })
    .catch((err) => {
      console.error('Error al registrar Service Worker:', err);
    });
}

function verificarEntornoIOS() {
  const esIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const estaInstalada = window.navigator.standalone === true ||
                        window.matchMedia('(display-mode: standalone)').matches;

  if (esIOS && !estaInstalada) {
    const guiaIOS = document.getElementById('instrucciones-ios');
    if (guiaIOS) guiaIOS.hidden = false;
  }
}

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  eventoInstalacionDiferido = event;
  if (btnInstalar) btnInstalar.hidden = false;
});

if (btnInstalar) {
  btnInstalar.addEventListener('click', () => {
    if (!eventoInstalacionDiferido) return;

    eventoInstalacionDiferido.prompt();
    eventoInstalacionDiferido.userChoice.then((resultado) => {
      if (resultado.outcome === 'accepted') {
        console.log('Instalación aceptada por el usuario');
      }
      btnInstalar.hidden = true;
      eventoInstalacionDiferido = null;
    });
  });
}

window.addEventListener('appinstalled', () => {
  if (btnInstalar) btnInstalar.hidden = true;
  eventoInstalacionDiferido = null;
  actualizarMensajeEstado('Aplicación instalada exitosamente.', 'activa');
});

function actualizarMensajeEstado(texto, tipo) {
  if (!mensajeEstado) return;
  mensajeEstado.textContent = texto;
  mensajeEstado.className = 'estado ' + (tipo || 'inactiva');
}

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
  if (placeholderCamara) {
    placeholderCamara.classList.remove('oculto');
  }
}

function iniciarCamara(modo) {
  detenerCamaraActiva();

  const restricciones = {
    video: { facingMode: modo },
    audio: false
  };

  actualizarMensajeEstado('Iniciando sensor de cámara...', 'cargando');

  return navigator.mediaDevices.getUserMedia(restricciones)
    .then((stream) => {
      streamActual = stream;
      visorVideo.srcObject = stream;
      visorVideo.classList.add('activo');
      placeholderCamara.classList.add('oculto');

      const nombreModo = modo === 'environment' ? 'Trasera' : 'Frontal';
      actualizarMensajeEstado(`Cámara activa (${nombreModo})`, 'activa');

      btnAlternarCamara.disabled = false;
      btnApagarCamara.disabled = false;
      btnPrepararCamara.disabled = true;
    })
    .catch((error) => {
      detenerCamaraActiva();
      btnAlternarCamara.disabled = true;
      btnApagarCamara.disabled = true;
      btnPrepararCamara.disabled = false;

      if (error.name === 'NotAllowedError') {
        actualizarMensajeEstado('Permiso denegado. Habilita el acceso a la cámara en los ajustes de tu navegador.', 'error');
      } else if (error.name === 'NotFoundError') {
        actualizarMensajeEstado('No se detectó el sensor de cámara solicitado en este dispositivo.', 'error');
      } else if (error.name === 'NotReadableError') {
        actualizarMensajeEstado('El sensor de cámara está ocupado o bloqueado por otra aplicación.', 'error');
      } else {
        actualizarMensajeEstado(`Error al acceder al hardware: ${error.message}`, 'error');
      }
    });
}

btnPrepararCamara.addEventListener('click', () => {
  avisoPermiso.hidden = false;
});

btnConfirmarPermiso.addEventListener('click', () => {
  avisoPermiso.hidden = true;
  iniciarCamara(modoCamaraActual);
});

btnCancelarPermiso.addEventListener('click', () => {
  avisoPermiso.hidden = true;
  actualizarMensajeEstado('Solicitud de cámara cancelada.', 'inactiva');
});

btnAlternarCamara.addEventListener('click', () => {
  modoCamaraActual = modoCamaraActual === 'environment' ? 'user' : 'environment';
  iniciarCamara(modoCamaraActual);
});

btnApagarCamara.addEventListener('click', () => {
  detenerCamaraActiva();
  actualizarMensajeEstado('Cámara apagada. Pulsa "Solicitar Acceso a Cámara" para comenzar.', 'inactiva');
  btnAlternarCamara.disabled = true;
  btnApagarCamara.disabled = true;
  btnPrepararCamara.disabled = false;
});

verificarEntornoIOS();
