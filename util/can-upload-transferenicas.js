module.exports = (request, response, next) => {

    let canUploadTransferencia = false;
    for(let privilegio of request.session.permisos) {
        if(privilegio.Actividades == 'subir transferencias') {
            canUploadTransferencia = true;
        }
    }

    if(canUploadTransferencia) {
        next();

    } else {
        return response.redirect('user/login');
    }
}