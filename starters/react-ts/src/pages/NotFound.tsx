import { Link } from 'react-router'

export default function NotFound() {
  return (
    <main id="main" className="container section stack not-found">
      <h1>404</h1>
      <p className="lead">Такой страницы нет. Возможно, её переместили.</p>
      <p>
        <Link className="btn" to="/">
          На главную
        </Link>
      </p>
    </main>
  )
}
