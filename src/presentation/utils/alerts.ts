import Swal from 'sweetalert2';

const CastorSwal = Swal.mixin({
  customClass: {
    popup: 'castor-swal-popup',
    title: 'castor-swal-title',
    htmlContainer: 'castor-swal-html',
    actions: 'castor-swal-actions',
    confirmButton: 'btn btn-primary castor-swal-btn-confirm',
    cancelButton: 'btn btn-secondary castor-swal-btn-cancel'
  },
  buttonsStyling: false,
  background: '#ffffff',
  color: '#1a1c1b',
  reverseButtons: true
});

export const alerts = {
  success: (title: string, text?: string) => {
    return CastorSwal.fire({
      title,
      text,
      icon: 'success'
    });
  },
  
  error: (title: string, text?: string) => {
    return CastorSwal.fire({
      title,
      text,
      icon: 'error'
    });
  },

  info: (title: string, text?: string) => {
    return CastorSwal.fire({
      title,
      text,
      icon: 'info'
    });
  },

  warning: (title: string, text?: string) => {
    return CastorSwal.fire({
      title,
      text,
      icon: 'warning'
    });
  },

  confirm: (title: string, text: string, confirmButtonText = 'Aceptar', cancelButtonText = 'Cancelar') => {
    return CastorSwal.fire({
      title,
      text,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText,
      cancelButtonText
    }).then(result => result.isConfirmed);
  },

  confirmDanger: (title: string, text: string, confirmButtonText = 'Eliminar', cancelButtonText = 'Cancelar') => {
    return CastorSwal.fire({
      title,
      text,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText,
      cancelButtonText,
      customClass: {
        popup: 'castor-swal-popup',
        title: 'castor-swal-title',
        htmlContainer: 'castor-swal-html',
        actions: 'castor-swal-actions',
        confirmButton: 'btn btn-danger castor-swal-btn-confirm',
        cancelButton: 'btn btn-secondary castor-swal-btn-cancel'
      }
    }).then(result => result.isConfirmed);
  }
};
