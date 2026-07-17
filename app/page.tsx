import Image from "next/image";
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
} from "lucide-react";
import { RegistrationForm } from "@/components/RegistrationForm";

const workshops = [
  {
    number: "01",
    icon: Code2,
    title: "Вайбкодим мобильное приложение",
    subtitle: "От идеи до первого билда — за один вечер",
    description:
      "Соберём рабочий прототип приложения с AI-инструментами. Без лекций на два часа: придумали, написали, запустили.",
    features: ["Выберем идею и MVP", "Соберём интерфейс", "Запустим на телефоне"],
    meta: ["2 часа", "offline", "до 12 человек", "ноутбук с собой"],
    className: "workshop-purple",
  },
  {
    number: "02",
    icon: Coins,
    title: "Экономика токенов",
    subtitle: "Как уменшить использваоние токена до минимума и при этом сделать его ценным",
    description:
      "Разберем механизмы и лайфхаки экономии токенов.",
    features: ["Разложим токеномику", "Посмотрим на что тратится лимиты", "Проверим лайфхаки экономии токенов"],
    meta: ["2 часа", "online", "до 16 человек", "без сложной математики"],
    className: "workshop-yellow",
  },
];

export default function Home() {
  return (
    <main>
      <section className="hero-shell" id="top">
        <nav className="nav container" aria-label="Главная навигация">
          <a className="brand" href="#top" aria-label="Мастерская — на главную">
            <span className="brand-mark"><span /><span /><span /><span /></span>
            мастерская
          </a>
          <div className="nav-links">
            <a href="#workshops">Мастер-классы</a>
            <a href="#format">Как это будет</a>
            <a href="#registration">Регистрация</a>
          </div>
          <a className="button button-outline nav-cta" href="#registration">
            Записаться <ArrowUpRight size={17} />
          </a>
        </nav>

        <div className="hero container">
          <div className="hero-copy">
            <div className="eyebrow"><Sparkles size={15} /> Бишкек · маленькие группы</div>
            <h1>
              Учимся <span className="accent-script purple">делать,</span><br />
              а не просто <span className="accent-script yellow">смотреть</span>
            </h1>
            <p>
              Практические мастер-классы для тех, кому интересны технологии,
              продукты и новые идеи. На выходе — результат, который можно показать.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="#workshops">
                Выбрать мастер-класс <ArrowDown size={18} />
              </a>
            </div>
          </div>

          <div className="hero-visual" aria-label="Мобильные приложения и экономика токенов">
            <div className="visual-sticker sticker-top">#создавай</div>
            <Image src="/hero-workshops.png" alt="3D иллюстрация смартфона, монеты и учебных объектов" width={900} height={900} priority />
            <div className="visual-sticker sticker-bottom">#разбирайся</div>
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
          </div>
        </div>
        <div className="hero-ticker" aria-hidden="true">
          <span>ИДЕЯ</span><i>✦</i><span>ПРАКТИКА</span><i>✦</i><span>ПЕРВЫЙ РЕЗУЛЬТАТ</span><i>✦</i><span>БЕЗ ВОДЫ</span><i>✦</i>
        </div>
      </section>

      <section className="section container" id="workshops">
        <div className="section-heading">
          <div>
            <p className="kicker">Ближайшие встречи</p>
            <h2>Выберите свой <span className="accent-script purple">мастер-класс</span></h2>
          </div>
          <p>Можно прийти без опыта. Главное — любопытство и желание сделать что-то своими руками.</p>
        </div>

        <div className="workshop-grid">
          {workshops.map((workshop) => {
            const Icon = workshop.icon;
            return (
              <article className={`workshop-card ${workshop.className}`} key={workshop.number}>
                <div className="card-topline">
                  <span className="card-number">{workshop.number}</span>
                  <span className="card-icon"><Icon size={30} strokeWidth={1.8} /></span>
                </div>
                <h3>{workshop.title}</h3>
                <p className="card-subtitle">{workshop.subtitle}</p>
                <p className="card-description">{workshop.description}</p>
                <ul className="feature-list">
                  {workshop.features.map((feature) => <li key={feature}><Check size={16} />{feature}</li>)}
                </ul>
                <div className="card-meta">
                  <span><Clock3 size={15} />{workshop.meta[0]}</span>
                  <span><UsersRound size={15} />{workshop.meta[1]}</span>
                  <span><Sparkles size={15} />{workshop.meta[2]}</span>
                </div>
                <a className="card-link" href="#registration">Занять место <ArrowUpRight size={18} /></a>
              </article>
            );
          })}
        </div>
      </section>

      <section className="format-section" id="format">
        <div className="container format-grid">
          <div className="format-copy">
            <p className="kicker">Как это будет</p>
            <h2>Меньше теории.<br /><span className="accent-script yellow">Больше действия.</span></h2>
            <p>Никаких рядов стульев и презентаций на 80 слайдов. Мы работаем в маленькой группе, задаём вопросы и двигаемся в своём темпе.</p>
            <div className="venue-note"><MapPin size={19} /> Офлайн в Бишкеке · точную локацию пришлём после регистрации</div>
          </div>
          <ol className="steps">
            <li><span>1</span><div><strong>Коротко разбираемся</strong><p>Получаем ровно столько контекста, сколько нужно для старта.</p></div></li>
            <li><span>2</span><div><strong>Собираем вместе</strong><p>Ведущий показывает, вы повторяете и адаптируете под свою идею.</p></div></li>
            <li><span>3</span><div><strong>Уходим с результатом</strong><p>Готовый прототип или понятная модель — плюс материалы после встречи.</p></div></li>
          </ol>
        </div>
      </section>

      <section className="section container" id="registration">
        <div className="registration-panel">
          <div className="registration-copy">
            <span className="mini-badge"><CalendarDays size={16} /> Следующая группа формируется</span>
            <h2>Присоединяйтесь к <span className="accent-script yellow">мастерской</span></h2>
            <p>Оставьте контакт — уточним удобную дату и пришлём все детали. Спамить не будем.</p>
            <div className="registration-doodle">↗</div>
          </div>
          <RegistrationForm />
        </div>
      </section>

      <footer className="footer container">
        <a className="brand" href="#top"><span className="brand-mark"><span /><span /><span /><span /></span>мастерская</a>
        <p>Практические встречи для любопытных людей.</p>
        <a href="mailto:hello@example.com">soloapps.dev@gmail.com</a>
      </footer>
    </main>
  );
}
