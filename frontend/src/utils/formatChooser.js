let dialogRefs = null;

function ensureDialog() {
  if (dialogRefs) {
    return dialogRefs;
  }

  const backdrop = document.createElement('div');
  backdrop.className = 'download-format-backdrop is-hidden';
  backdrop.setAttribute('role', 'presentation');
  backdrop.setAttribute('aria-hidden', 'true');

  const dialog = document.createElement('div');
  dialog.className = 'download-format-dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'download-format-title');

  const title = document.createElement('h3');
  title.id = 'download-format-title';
  title.className = 'download-format-title';
  title.textContent = 'Choose download format';

  const description = document.createElement('p');
  description.className = 'download-format-description';
  description.textContent = 'Select PDF for printing or JPEG for sharing.';

  const actions = document.createElement('div');
  actions.className = 'download-format-actions';

  const pdfButton = document.createElement('button');
  pdfButton.type = 'button';
  pdfButton.className = 'button download-format-button';
  pdfButton.textContent = 'Download PDF';

  const jpegButton = document.createElement('button');
  jpegButton.type = 'button';
  jpegButton.className = 'button button-secondary download-format-button';
  jpegButton.textContent = 'Download JPEG';

  const cancelButton = document.createElement('button');
  cancelButton.type = 'button';
  cancelButton.className = 'download-format-cancel';
  cancelButton.textContent = 'Cancel';

  actions.append(pdfButton, jpegButton);
  dialog.append(title, description, actions, cancelButton);
  backdrop.append(dialog);
  document.body.appendChild(backdrop);

  dialogRefs = {
    backdrop,
    pdfButton,
    jpegButton,
    cancelButton,
  };
  return dialogRefs;
}

export function chooseDownloadFormat() {
  if (typeof document === 'undefined') {
    return Promise.resolve('pdf');
  }

  const trigger = document.activeElement;
  const { backdrop, pdfButton, jpegButton, cancelButton } = ensureDialog();

  return new Promise((resolve) => {
    function cleanup(result) {
      pdfButton.removeEventListener('click', handlePdf);
      jpegButton.removeEventListener('click', handleJpeg);
      cancelButton.removeEventListener('click', handleCancel);
      backdrop.removeEventListener('click', handleBackdropClick);
      document.removeEventListener('keydown', handleKeydown);
      backdrop.classList.add('is-hidden');
      backdrop.setAttribute('aria-hidden', 'true');
      if (trigger && typeof trigger.focus === 'function') {
        setTimeout(() => trigger.focus(), 0);
      }
      resolve(result);
    }

    function handlePdf(event) {
      event.preventDefault();
      cleanup('pdf');
    }

    function handleJpeg(event) {
      event.preventDefault();
      cleanup('jpeg');
    }

    function handleCancel(event) {
      event.preventDefault();
      cleanup(null);
    }

    function handleBackdropClick(event) {
      if (event.target === backdrop) {
        cleanup(null);
      }
    }

    function handleKeydown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        cleanup(null);
      }
    }

    pdfButton.addEventListener('click', handlePdf);
    jpegButton.addEventListener('click', handleJpeg);
    cancelButton.addEventListener('click', handleCancel);
    backdrop.addEventListener('click', handleBackdropClick);
    document.addEventListener('keydown', handleKeydown);

    backdrop.classList.remove('is-hidden');
    backdrop.setAttribute('aria-hidden', 'false');
    pdfButton.focus({ preventScroll: true });
  });
}
