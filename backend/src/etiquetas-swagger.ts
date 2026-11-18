export const ETIQUETAS = {
  autenticacion: {
    nombre: 'Autenticación',
    descripcion:
      'Registro, ingreso (clave, Google o acceso docente) y renovación del token. Las rutas de ingreso son públicas y tienen un límite estricto de solicitudes.',
  },
  portada: {
    nombre: 'Portada pública',
    descripcion: 'Publicaciones que se ven sin iniciar sesión.',
  },
  publicaciones: {
    nombre: 'Publicaciones',
    descripcion:
      'Crear, editar, buscar, listar y eliminar publicaciones (recetas, tips y experiencias).',
  },
  comentarios: {
    nombre: 'Comentarios',
    descripcion: 'Comentarios de una publicación.',
  },
  meGusta: {
    nombre: 'Me gusta',
    descripcion: 'Dar y quitar el me gusta en una publicación.',
  },
  guardadas: {
    nombre: 'Guardadas',
    descripcion:
      'Publicaciones que cada persona guarda para volver a verlas. Son personales: nadie más las ve.',
  },
  compartidas: {
    nombre: 'Compartidas',
    descripcion:
      'Publicaciones que una persona le comparte a otra. Quien las recibe las ve en su bandeja y se le avisa cuántas tiene sin ver.',
  },
  perfiles: {
    nombre: 'Perfiles',
    descripcion:
      'Mi perfil, el directorio de personas, el perfil de otra persona y el registro de visitas. Para cualquier persona con sesión.',
  },
  notificaciones: {
    nombre: 'Notificaciones',
    descripcion:
      'Avisos dentro de la aplicación: listar, marcar como leídos y eliminar.',
  },
  push: {
    nombre: 'Notificaciones push',
    descripcion: 'Suscripción del dispositivo a los avisos push del celular.',
  },
  administracion: {
    nombre: 'Administración de usuarios',
    descripcion:
      'Sólo administrador: listar, crear, habilitar y deshabilitar usuarios.',
  },
  estadisticas: {
    nombre: 'Estadísticas',
    descripcion:
      'Sólo administrador: datos del dashboard en un rango de fechas.',
  },
  estado: {
    nombre: 'Estado del servicio',
    descripcion: 'Salud de la API y de la base de datos.',
  },
} as const;
