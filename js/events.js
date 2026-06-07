export function togglePrece(btn) {
  const modal  = document.getElementById('modal-video');
  const iframe = document.getElementById('modal-video-iframe');
  const titulo = document.getElementById('modal-video-titulo');
  if (!modal) return;

  iframe.style.display = 'none';
  iframe.src = '';

  let kinContainer = document.getElementById('modal-kin-content');
  if (!kinContainer) {
    kinContainer = document.createElement('div');
    kinContainer.id = 'modal-kin-content';
    kinContainer.style.cssText = 'overflow-y:auto;max-height:70vh;padding:1rem;background:var(--bg);border-radius:var(--radius)';
    iframe.parentNode.insertBefore(kinContainer, iframe);
  }
  kinContainer.style.display = 'block';

  const AUDIO_LOCAL   = './assets/prece.mp3';
  const DRIVE_FILE_ID = '1hOUbkDrKGOjs_VE1f83pBgkHlcG6lRIR';
  const DRIVE_EMBED   = 'https://drive.google.com/file/d/' + DRIVE_FILE_ID + '/preview';
  const audioId    = 'prece-modal-audio';
  const fallbackId = 'prece-modal-fallback';

  kinContainer.innerHTML = [
    '<div style="background:rgba(165,124,0,.07);border:1px solid var(--border-g);border-radius:8px;padding:.7rem 1rem;margin-bottom:1.1rem">',
      '<div style="display:flex;align-items:center;gap:.8rem">',
        '<span style="font-size:1.4rem">🙏</span>',
        '<div style="flex:1">',
          '<div style="font-family:Cinzel;font-size:.72rem;color:var(--gold2);margin-bottom:.4rem">Prece das 7 Direções Galácticas</div>',
          '<audio id="' + audioId + '" controls preload="auto" style="width:100%;height:36px;accent-color:var(--gold2)">',
            '<source src="' + AUDIO_LOCAL + '" type="audio/mpeg">',
          '</audio>',
        '</div>',
      '</div>',
      // Fallback: iframe do Drive embutido no modal - sem abrir fora do app
      '<div id="' + fallbackId + '" style="display:none;margin-top:.7rem;flex-direction:column;gap:.5rem">',
        '<div style="font-size:.65rem;color:var(--text3);font-style:italic">Áudio indisponível — ouça pelo Drive:</div>',
        '<iframe src="' + DRIVE_EMBED + '" style="width:100%;height:80px;border:none;border-radius:6px" allow="autoplay"></iframe>',
      '</div>',
    '</div>',
    TEXTO_PRECE,
  ].join('');

  // Apos 3s: se audio nao carregou, mostra iframe do Drive dentro do modal
  setTimeout(() => {
    const audio    = document.getElementById(audioId);
    const fallback = document.getElementById(fallbackId);
    if (!audio || !fallback) return;
    if (audio.error || audio.readyState < 2) {
      audio.style.display = 'none';
      fallback.style.display = 'flex';
    } else {
      audio.play().catch(() => {});
    }
  }, 3000);

  if (titulo) titulo.textContent = '🙏 Prece das 7 Direções Galácticas';
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}
