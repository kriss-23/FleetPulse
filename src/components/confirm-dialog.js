export function mountConfirmDialog() {
  if (document.querySelector('#confirm-dialog')) return;
  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal fade" id="confirm-dialog" tabindex="-1" aria-labelledby="confirm-dialog-title" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header"><h2 class="modal-title h5" id="confirm-dialog-title">Confirm action</h2><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div>
          <div class="modal-body" id="confirm-dialog-message"></div>
          <div class="modal-footer"><button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button><button type="button" class="btn btn-primary" id="confirm-dialog-submit">Confirm</button></div>
        </div>
      </div>
    </div>
  `);
}

export function confirmAction({ title = 'Confirm action', message = 'Are you sure?', onConfirm } = {}) {
  mountConfirmDialog();
  document.querySelector('#confirm-dialog-title').textContent = title;
  document.querySelector('#confirm-dialog-message').textContent = message;
  const modal = window.bootstrap.Modal.getOrCreateInstance(document.querySelector('#confirm-dialog'));
  const submit = document.querySelector('#confirm-dialog-submit');
  submit.onclick = async () => {
    submit.disabled = true;
    try {
      await onConfirm?.();
    } finally {
      submit.disabled = false;
    }
    modal.hide();
  };
  modal.show();
}
