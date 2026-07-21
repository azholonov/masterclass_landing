import {
  ArrowDown,
  ArrowUpRight,
  CalendarDays,
  Check,
  Clock3,
  Code2,
  Coins,
  MapPin,
  Sparkles,
  UsersRound,
  Webcam,
} from "lucide-react";
import { RegistrationForm } from "@/components/RegistrationForm";

const workshops = [
  {
    number: "01",
    icon: Code2,
    date: "15 августа · суббота",
    dateTime: "2026-08-15",
    title: "Вайбкодим мобильное приложение",
    subtitle: "От идеи до первого билда — за один вечер",
    description:
      "Соберём рабочий прототип приложения с AI-инструментами. Без лекций на два часа: придумали, написали, запустили.",
    features: ["Выберем идею и MVP", "Соберём интерфейс", "Запустим на телефоне"],
    meta: ["2 часа", "offline", "до 12 человек", "ноутбук с собой"],
    tone: "blue",
  },
  {
    number: "02",
    icon: Coins,
    date: "16 августа · воскресенье",
    dateTime: "2026-08-16",
    title: "Экономика токенов",
    subtitle: "Как тратить меньше токенов и получать больше пользы",
    description: "Разберём, куда уходит лимит, и проверим практические способы экономии токенов.",
    features: ["Разложим токеномику", "Найдём главные расходы", "Проверим способы экономии"],
    meta: ["1 час", "online", "до 16 человек", "без сложной математики"],
    tone: "lilac",
  },
];

const tiles = Array.from({ length: 14 }, (_, index) => index);

export default function Home() {
  return (
    <main>
      <section className="hero-shell" id="top">
        <div className="hero-glow hero-glow-blue" />
        <div className="hero-glow hero-glow-lilac" />

        <nav className="nav container" aria-label="Главная навигация">
          <a className="brand" href="#top" aria-label="Мастерская — на главную">
            <span className="brand-mark"><span /><span /><span /></span>
            мастерская
          </a>
          <div className="nav-links">
            <a href="#workshops">Мастер-классы</a>
            <a href="#format">Формат</a>
            <a href="#registration">Регистрация</a>
          </div>
          <a className="button button-ghost nav-cta" href="#registration">
            Записаться <ArrowUpRight size={17} />
          </a>
        </nav>

        <div className="hero container">
          <div className="hero-copy">
            <div className="eyebrow"><Sparkles size={15} /> Бишкек · маленькие группы</div>
            <h1>
              <span>Учимся</span> <span className="title-soft">делать,</span><br />
              <span className="title-soft">а не просто</span> <span>смотреть.</span>
            </h1>
            <p>
              Практические мастер-классы для тех, кому интересны технологии,
              продукты и новые идеи. На выходе — результат, который можно показать.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="#workshops">
                Выбрать мастер-класс <ArrowDown size={18} />
              </a>
              <span className="hero-note">15–16 августа 2026</span>
            </div>
          </div>

          <div className="hero-facts" aria-label="Краткая информация">
            <div><strong>2</strong><span>мастер-класса</span></div>
            <div><strong>15–16</strong><span>августа 2026</span></div>
            <div><strong>1-й</strong><span>результат</span></div>
          </div>
        </div>

        <div className="tile-ribbon" aria-hidden="true">
          {tiles.map((tile) => <span key={tile} />)}
        </div>
      </section>

      <section className="section container" id="workshops">
        <div className="section-heading">
          <div>
            <p className="kicker">Ближайшие встречи</p>
            <h2>Выберите свой<br /><span>формат практики.</span></h2>
          </div>
          <p>Можно прийти без опыта. Главное — любопытство и желание сделать что-то своими руками.</p>
        </div>

        <div className="workshop-grid">
          {workshops.map((workshop) => {
            const Icon = workshop.icon;
            return (
              <article className={`workshop-card workshop-${workshop.tone}`} key={workshop.number}>
                <div className="workshop-visual">
                  <span className="card-number">{workshop.number}</span>
                  <span className="card-icon"><Icon size={34} strokeWidth={1.6} /></span>
                  <div className="mini-tiles" aria-hidden="true">
                    <i /><i /><i /><i /><i /><i />
                  </div>
                </div>
                <div className="workshop-content">
                  <time className="card-date" dateTime={workshop.dateTime}>
                    <CalendarDays size={16} /> {workshop.date}
                  </time>
                  <h3>{workshop.title}</h3>
                  <p className="card-subtitle">{workshop.subtitle}</p>
                  <p className="card-description">{workshop.description}</p>
                  <ul className="feature-list">
                    {workshop.features.map((feature) => <li key={feature}><Check size={15} />{feature}</li>)}
                  </ul>
                  <div className="card-meta">
                    <span><Clock3 size={15} />{workshop.meta[0]}</span>
                    <span><Webcam size={15} />{workshop.meta[1]}</span>
                    <span><UsersRound size={15} />{workshop.meta[2]}</span>
                    <span><Sparkles size={15} />{workshop.meta[3]}</span>
                  </div>
                  <a className="card-link" href="#registration">Занять место <ArrowUpRight size={18} /></a>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="section container" id="format">
        <div className="experience-panel">
          <div className="experience-copy">
            <p className="kicker">Как это будет</p>
            <h2>Меньше теории.<br /><span>Больше действия.</span></h2>
            <p>Никаких рядов стульев и презентаций на 80 слайдов. Работаем в маленькой группе, задаём вопросы и двигаемся в своём темпе.</p>
            <div className="venue-note"><MapPin size={18} /> Офлайн в Бишкеке · точную локацию пришлём после регистрации</div>
          </div>
          <ol className="steps">
            <li><span>01</span><div><strong>Коротко разбираемся</strong><p>Получаем ровно столько контекста, сколько нужно для старта.</p></div></li>
            <li><span>02</span><div><strong>Собираем вместе</strong><p>Ведущий показывает, вы повторяете и адаптируете под свою идею.</p></div></li>
            <li><span>03</span><div><strong>Уходим с результатом</strong><p>Готовый прототип или понятная модель — плюс материалы после встречи.</p></div></li>
          </ol>
        </div>
      </section>

      <section className="section container" id="registration">
        <div className="registration-panel">
          <div className="registration-copy">
            <span className="mini-badge"><CalendarDays size={16} /> 15–16 августа 2026</span>
            <h2>Готовы перейти<br /><span>от идеи к делу?</span></h2>
            <p>Выберите мастер-класс и оставьте контакт — пришлём все детали. Спамить не будем.</p>
            <div className="registration-orbit" aria-hidden="true"><i /></div>
          </div>
          <RegistrationForm />
        </div>
      </section>

      <footer className="footer container">
        <a className="brand" href="#top"><span className="brand-mark"><span /><span /><span /></span>мастерская</a>
        <p>Практические встречи для любопытных людей.</p>
        <a href="mailto:soloapps.dev@gmail.com">soloapps.dev@gmail.com</a>
      </footer>
    </main>
  );
}
