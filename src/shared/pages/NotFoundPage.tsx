import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <section className="panel panel--centered">
      <p className="eyebrow">Ruta no encontrada</p>
      <h1 className="page-title">Esta pagina no forma parte del flujo de la boda.</h1>
      <p className="page-lead">
        La ruta aun no existe. Vuelve a la pantalla de subida o al panel admin.
      </p>
      <div className="button-row">
        <Link className="button" to="/upload">
          Ir a subir fotos
        </Link>
        <Link className="button button--secondary" to="/admin">
          Abrir administracion
        </Link>
      </div>
    </section>
  )
}
