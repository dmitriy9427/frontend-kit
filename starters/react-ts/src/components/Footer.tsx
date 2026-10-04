import { useModule } from 'kit/react/index.js'
import scrollTop from 'kit/js/modules/scroll-top/index.js'

export function Footer() {
  const top = useModule<HTMLButtonElement>(scrollTop)
  return (
    <>
      <footer className="footer">
        <div className="container footer__inner">
          <p>© {new Date().getFullYear()} Название компании</p>
        </div>
      </footer>
      <button ref={top} className="scroll-top" type="button" aria-label="Наверх">
        ↑
      </button>
    </>
  )
}
