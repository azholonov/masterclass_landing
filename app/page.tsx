import Image from "next/image";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  Clock3,
  MapPin,
  Sparkles,
  UsersRound,
  Webcam,
} from "lucide-react";
import { RegistrationForm } from "@/components/RegistrationForm";
import { createSupabaseAdmin } from "@/lib/supabase";
import { workshops as workshopDetails, type WorkshopId } from "@/lib/workshops";

export const dynamic = "force-dynamic";

const workshops = [
  {
    number: "01",
    date: "15 августа · суббота",
    dateTime: "2026-08-15",
    title: "Вайбкодим мобильное приложение",
    subtitle: "От идеи до первого билда — за один вечер",
    description:
      "Соберём рабочий прототип приложения с AI-инструментами. Придумали, написали, запустили — без двухчасовых лекций.",
    features: ["Выберем идею и MVP", "Соберём интерфейс", "Запустим на телефоне"],
    meta: ["2 часа", "офлайн", "до 12 человек"],
    image: "/art/vibecoding-robot.png",
    alt: "Робот программирует приложение рядом с цифровым растением",
    tone: "violet",
  },
  {
    number: "02",
    date: "16 августа · воскресенье",
    dateTime: "2026-08-16",
    title: "Экономика токенов",
    subtitle: "Меньше расходов — больше пользы от AI",
    description:
      "Разберём, куда уходит лимит, и на практике проверим способы экономить токены без потери качества результата.",
    features: ["Разложим токеномику", "Найдём главные расходы", "Проверим экономию"],
    meta: ["1 час", "онлайн", "до 16 человек"],
    image: "/art/token-robot.png",
    alt: "Робот изучает цифровые токены, диаграмму и спутник",
    tone: "lime",
  },
];

async function getWorkshopAvailability(): Promise<Record<WorkshopId, boolean>> {
  const availability: Record<WorkshopId, boolean> = {
    vibecoding: true,
    "token-economics": true,
  };
  const supabase = createSupabaseAdmin();
  if (!supabase) return availability;

  await Promise.all(
    (Object.keys(workshopDetails) as WorkshopId[]).map(async (workshop) => {
      const { count, error } = await supabase
        .from("workshop_registrations")
        .select("id", { count: "exact", head: true })
        .eq("workshop", workshop)
        .in("status", ["new", "confirmed"]);

      if (error) {
        console.error("Workshop availability error:", error.code);
        return;
      }
      availability[workshop] = (count ?? 0) < workshopDetails[workshop].capacity;
    }),
  );

  return availability;
}

export default async function Home() {
  const availability = await getWorkshopAvailability();
  return (
    <main>
      <section className="hero" id="top">
        <nav className="nav container" aria-label="Главная навигация">
          <a className="brand" href="#top" aria-label="Мастерская — на главную">
            <span className="brand-spark" aria-hidden="true">✦</span>
            <span>МАСТЕР<span>СКАЯ</span></span>
          </a>
          <div className="nav-links">
            <a href="#workshops">Встречи</a>
            <a href="#format">Как это будет</a>
            <a href="#registration">Регистрация</a>
          </div>
          <a className="round-link" href="#registration" aria-label="Записаться">
            <ArrowUpRight size={21} />
          </a>
        </nav>

        <Image
          className="hero-art"
          src="/art/lab-hero.png"
          alt="Дружелюбный робот в ярком жилете рядом с большим растением"
          fill
          priority
          sizes="100vw"
        />
        <div className="hero-shade" />

        <div className="hero-content container">
          <div className="hero-kicker"><span>Бишкек</span><span>15–16 августа</span><span>2026</span></div>
          <h1>НЕ СМОТРИ.<br /><em>СОЗДАВАЙ.</em></h1>
          <p>Практические мастер-классы для тех, кому мало просто знать. Сделай первый результат своими руками.</p>
          <div className="hero-actions">
            <a className="button button-lime" href="#workshops">
              Выбрать мастер-класс <ArrowDownRight size={20} />
            </a>
            <span>Можно без опыта.<br />Нужно любопытство.</span>
          </div>
        </div>

        <div className="hero-counter" aria-label="Два мастер-класса">
          <strong>02</strong><span>две встречи<br />два результата</span>
        </div>
        <div className="marquee" aria-hidden="true">
          <div>ПРАКТИКА ✦ ИДЕИ ✦ ТЕХНОЛОГИИ ✦ ПЕРВЫЙ БИЛД ✦ ПРАКТИКА ✦ ИДЕИ ✦ ТЕХНОЛОГИИ ✦</div>
        </div>
      </section>

      <section className="workshops section" id="workshops">
        <div className="container">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Ближайшие встречи / 02</p>
              <h2>ВЫБЕРИ СВОЮ<br /><span>ТОЧКУ СТАРТА.</span></h2>
            </div>
            <p>Небольшая группа, живой ведущий и задача, которую ты действительно успеешь закончить.</p>
          </div>

          <div className="workshop-grid">
            {workshops.map((workshop) => (
              <article className={`workshop-card card-${workshop.tone}`} key={workshop.number}>
                <div className="workshop-image">
                  <Image src={workshop.image} alt={workshop.alt} fill sizes="(max-width: 760px) 100vw, 50vw" />
                  <span className="card-index">/{workshop.number}</span>
                  <a href="#registration" className="card-arrow" aria-label={`Записаться: ${workshop.title}`}>
                    <ArrowUpRight size={26} />
                  </a>
                </div>
                <div className="workshop-content">
                  <time dateTime={workshop.dateTime}><CalendarDays size={16} /> {workshop.date}</time>
                  <h3>{workshop.title}</h3>
                  <p className="card-subtitle">{workshop.subtitle}</p>
                  <p className="card-description">{workshop.description}</p>
                  <ul>
                    {workshop.features.map((feature) => <li key={feature}><Check size={15} />{feature}</li>)}
                  </ul>
                  <div className="card-meta">
                    <span><Clock3 size={15} />{workshop.meta[0]}</span>
                    <span><Webcam size={15} />{workshop.meta[1]}</span>
                    <span><UsersRound size={15} />{workshop.meta[2]}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="format section" id="format">
        <div className="container format-grid">
          <div className="format-title">
            <p className="eyebrow">Как это работает</p>
            <h2>МЕНЬШЕ<br />ТЕОРИИ.<br /><span>БОЛЬШЕ<br />ДЕЙСТВИЯ.</span></h2>
            <div className="orbit-badge" aria-hidden="true"><span>✦</span></div>
          </div>
          <ol className="steps">
            <li><span>01</span><div><strong>Быстро разбираемся</strong><p>Получаем ровно столько контекста, сколько нужно для уверенного старта.</p></div></li>
            <li><span>02</span><div><strong>Собираем вместе</strong><p>Ведущий показывает, вы повторяете и сразу адаптируете под свою идею.</p></div></li>
            <li><span>03</span><div><strong>Уходим с результатом</strong><p>Рабочий прототип или понятная модель — плюс материалы после встречи.</p></div></li>
          </ol>
          <div className="format-note">
            <MapPin size={21} />
            <p><strong>Бишкек + онлайн</strong>Точную локацию офлайн-встречи и ссылку на онлайн пришлём после регистрации.</p>
          </div>
        </div>
      </section>

      <section className="registration section" id="registration">
        <div className="container registration-grid">
          <div className="registration-copy">
            <div className="registration-tag"><Sparkles size={15} /> Остался один шаг</div>
            <h2>ЗАЙМИ<br /><span>СВОЁ МЕСТО.</span></h2>
            <p>Выбери мастер-класс и оставь контакт. Пришлём все детали — без спама и длинных цепочек писем.</p>
            <a href="mailto:soloapps.dev@gmail.com">Есть вопрос? Напиши нам <ArrowRight size={17} /></a>
          </div>
          <RegistrationForm availability={availability} />
        </div>
      </section>

      <footer className="footer container">
        <a className="brand" href="#top"><span className="brand-spark">✦</span><span>МАСТЕР<span>СКАЯ</span></span></a>
        <p>Практические встречи для любопытных людей.</p>
        <p>Бишкек · 2026</p>
      </footer>
    </main>
  );
}
