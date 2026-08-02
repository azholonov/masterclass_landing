import Image from "next/image";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BadgeDollarSign,
  CalendarDays,
  Check,
  Clock3,
  Code2,
  Lightbulb,
  MapPin,
  PackageCheck,
  Smartphone,
  Sparkles,
  Target,
  UsersRound,
  Webcam,
  Wrench,
} from "lucide-react";
import { RegistrationForm } from "@/components/RegistrationForm";
import { createSupabaseAdmin } from "@/lib/supabase";
import { workshops as workshopDetails, type WorkshopId } from "@/lib/workshops";

export const dynamic = "force-dynamic";

const workshopSessions = [
  {
    id: "vibecoding-kg" as const,
    number: "01",
    date: "14-август · жума",
    dateTime: "2026-08-14",
    language: "Кыргыз тилинде",
    title: "Вайбкодинг менен мобилдик тиркеме жасайбыз",
    subtitle: "Идеядан алгачкы билдге чейин — бир кечте",
    description:
      "AI куралдары менен тиркеменин иштеген прототибин түзөбүз. Идеяны ойлоп табабыз, чогултабыз жана иштетебиз — узак лекцияларсыз.",
    features: ["Идеяны жана MVPни аныктайбыз", "Интерфейсти түзөбүз", "Телефондо иштетебиз"],
    meta: ["2 саат", "офлайн"],
    capacityLabel: "Болгону 12 орун",
    image: "/art/vibecoding-robot.png",
    alt: "Робот санарип өсүмдүктүн жанында тиркеме программалап жатат",
    tone: "lime",
    priceLabel: "Катышуу баасы",
  },
  {
    id: "vibecoding" as const,
    number: "02",
    date: "15 августа · суббота",
    dateTime: "2026-08-15",
    language: "На русском языке",
    title: "Вайбкодим мобильное приложение",
    subtitle: "От идеи до первого билда — за один вечер",
    description:
      "Соберём рабочий прототип приложения с AI-инструментами. Придумали, написали, запустили — без двухчасовых лекций.",
    features: ["Выберем идею и MVP", "Соберём интерфейс", "Запустим на телефоне"],
    meta: ["2 часа", "офлайн"],
    capacityLabel: "Только 12 мест",
    image: "/art/vibecoding-robot.png",
    alt: "Робот программирует приложение рядом с цифровым растением",
    tone: "violet",
    priceLabel: "Стоимость участия",
  },
];

const productStory = [
  {
    number: "01",
    label: "Кому подойдёт",
    title: "Тем, у кого есть идея, но нет команды разработчиков",
    description:
      "Предпринимателям, продактам, дизайнерам и всем, кто хочет сам создавать мобильные продукты — даже без опыта в коде.",
    icon: Target,
    tone: "lime",
  },
  {
    number: "02",
    label: "С какой проблемой приходят",
    title: "Идея есть. Непонятно, как превратить её в приложение",
    description:
      "Курсы слишком долгие, разработка на заказ — дорогая, а десятки инструментов и технологий мешают сделать первый шаг.",
    icon: Lightbulb,
    tone: "paper",
  },
  {
    number: "03",
    label: "Что делаем на встрече",
    title: "Проходим весь путь от идеи до запуска на телефоне",
    description:
      "Формулируем MVP, создаём интерфейс с AI, собираем рабочий прототип и запускаем его на реальном устройстве.",
    icon: Wrench,
    tone: "violet",
  },
  {
    number: "04",
    label: "С чем уходите",
    title: "Своё работающее приложение, код и понятный следующий шаг",
    description:
      "Забираете проект, проверенные промпты и план развития — чтобы следующий прототип собрать уже самостоятельно.",
    icon: PackageCheck,
    tone: "paper",
  },
  {
    number: "05",
    label: "За что платите",
    title: "Не за лекцию. За короткий путь к первому результату",
    description:
      "Вместо недель хаотичных видео — два часа практики, помощь на каждом сложном шаге и готовый результат к концу встречи.",
    icon: BadgeDollarSign,
    tone: "cyan",
  },
];

async function getWorkshopAvailability(): Promise<Record<WorkshopId, boolean>> {
  const availability: Record<WorkshopId, boolean> = {
    "vibecoding-kg": true,
    vibecoding: true,
    "token-economics": false,
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
            <a href="/guide">Подготовка</a>
            <a href="#expert">Эксперт</a>
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
          <div className="hero-kicker"><span>Бишкек</span><span>14–15 августа</span><span>2026</span></div>
          <h1>НЕ СМОТРИ.<br /><em>СОЗДАВАЙ.</em></h1>
          <p>Практический мастер-класс по мобильному вайбкодингу на кыргызском и русском языках. Сделай своё первое приложение своими руками.</p>
          <div className="hero-actions">
            <a className="button button-lime" href="#workshops">
              Узнать о мастер-классе <ArrowDownRight size={20} />
            </a>
            <span>Можно без опыта.<br />Нужно любопытство.</span>
          </div>
        </div>

        <div className="hero-counter" aria-label="Две встречи">
          <strong>02</strong><span>два языка<br />готовый прототип</span>
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
              <h2>ТВОЯ ТОЧКА<br /><span>СТАРТА.</span></h2>
            </div>
            <p>Небольшая группа, живой ведущий и задача, которую ты действительно успеешь закончить.</p>
          </div>

          <div className="workshop-grid">
            {workshopSessions.map((workshop) => (
              <article className={`workshop-card card-${workshop.tone}`} key={workshop.id}>
                <div className="workshop-image">
                  <Image src={workshop.image} alt={workshop.alt} fill sizes="(max-width: 700px) 100vw, 50vw" />
                  <span className="card-index">/{workshop.number}</span>
                  <span className="capacity-badge"><UsersRound size={17} />{workshop.capacityLabel}</span>
                  <a href="#registration" className="card-arrow" aria-label={`Записаться: ${workshop.title}`}>
                    <ArrowUpRight size={26} />
                  </a>
                </div>
                <div className="workshop-content">
                  <time dateTime={workshop.dateTime}><CalendarDays size={16} /> {workshop.date}</time>
                  <p className="workshop-language">{workshop.language}</p>
                  <h3>{workshop.title}</h3>
                  <p className="card-subtitle">{workshop.subtitle}</p>
                  <div className="workshop-price">
                    <span>{workshop.priceLabel}</span>
                    <strong>{workshopDetails[workshop.id].price}</strong>
                  </div>
                  <p className="card-description">{workshop.description}</p>
                  <ul>
                    {workshop.features.map((feature) => <li key={feature}><Check size={15} />{feature}</li>)}
                  </ul>
                  <div className="card-meta">
                    <span><Clock3 size={15} />{workshop.meta[0]}</span>
                    <span><Webcam size={15} />{workshop.meta[1]}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="product-story section" id="product">
        <div className="container">
          <div className="product-story-heading">
            <div>
              <p className="eyebrow">Мастер-класс как продукт / 05 частей</p>
              <h2>НЕ ПРОСТО<br /><span>ПОСЛУШАТЬ.</span></h2>
            </div>
            <div className="product-promise">
              <p>За одну встречу превратите идею мобильного приложения в работающий прототип на своём телефоне.</p>
            </div>
          </div>

          <div className="product-story-grid">
            {productStory.map(({ number, label, title, description, icon: Icon, tone }) => (
              <article className={`product-story-card story-${tone}`} key={number}>
                <div className="story-card-top">
                  <span>/{number}</span>
                  <Icon size={25} strokeWidth={1.8} aria-hidden="true" />
                </div>
                <p className="story-label">{label}</p>
                <h3>{title}</h3>
                <p className="story-description">{description}</p>
              </article>
            ))}
          </div>

          <div className="product-story-cta">
            <p><strong>На выходе — не домашнее задание.</strong> На выходе — приложение, которое уже можно показать.</p>
            <a className="button button-dark" href="#registration">Собрать своё <ArrowDownRight size={20} /></a>
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
            <li><span>03</span><div><strong>Уходим с результатом</strong><p>Рабочий прототип приложения — плюс материалы после встречи.</p></div></li>
          </ol>
          <div className="format-support">
            <div className="prep-note">
              <div className="prep-note-icon"><Wrench size={21} /></div>
              <div>
                <span>Подготовка входит в стоимость</span>
                <h3>Настройтесь сами или приходите на час раньше</h3>
                <p>Для участия нужны личный ноутбук и активная платная подписка на один AI-инструмент — ChatGPT или Claude. После регистрации пришлём пошаговую инструкцию. Если удобнее подготовиться вместе, эксперт поможет установить и настроить всё необходимое за час до начала.</p>
                <a className="prep-note-link" href="/guide">Открыть инструкцию <ArrowRight size={16} /></a>
              </div>
            </div>
            <div className="format-note">
              <MapPin size={21} />
              <p><strong>Офлайн в Бишкеке</strong>Точную локацию и инструкцию по подготовке пришлём после регистрации.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="expert section" id="expert">
        <div className="container expert-grid">
          <div className="expert-visual" aria-label="Акыл Жолонов, ведущий мастер-класса">
            <Image
              className="expert-photo"
              src="/art/akyl-zholonov.png"
              alt="Акыл Жолонов — ведущий мастер-класса"
              width={1018}
              height={1018}
              sizes="(max-width: 940px) 90vw, 480px"
            />
            <div className="expert-years"><strong>10+</strong><span>лет в<br />разработке</span></div>
            <span className="expert-role">Senior Software Engineer</span>
          </div>

          <div className="expert-copy">
            <p className="eyebrow">Кто ведёт мастер-класс</p>
            <h2>АКЫЛ<br /><span>ЖОЛОНОВ.</span></h2>
            <p className="expert-lead">Senior software engineer с более чем 10-летним опытом разработки.</p>
            <p className="expert-bio">Работает с .NET, мобильной разработкой и AI-инструментами, создаёт собственные iOS-приложения и проводит практические технологические воркшопы.</p>

            <ul className="expert-skills" aria-label="Экспертиза">
              <li><Code2 size={17} /> .NET</li>
              <li><Smartphone size={17} /> Mobile &amp; iOS</li>
              <li><Sparkles size={17} /> AI-инструменты</li>
            </ul>

            <div className="expert-note">
              <span>Подход</span>
              <p>Не пересказывает документацию — показывает рабочий процесс, которым пользуется сам.</p>
            </div>
            <a className="expert-link" href="#registration">Попасть на мастер-класс <ArrowDownRight size={18} /></a>
          </div>
        </div>
      </section>

      <section className="registration section" id="registration">
        <div className="container registration-grid">
          <div className="registration-copy">
            <div className="registration-tag"><UsersRound size={15} /> Только 12 мест на каждом мастер-классе</div>
            <h2>ЗАЙМИ<br /><span>СВОЁ МЕСТО.</span></h2>
            <div className="registration-price"><strong>{workshopDetails.vibecoding.price}</strong><span>за участие</span></div>
            <p>Оставь контакт, чтобы забронировать место. Пришлём все детали — без спама и длинных цепочек писем.</p>
            <a href="mailto:soloapps.dev@gmail.com">Есть вопрос? Напиши нам <ArrowRight size={17} /></a>
          </div>
          <RegistrationForm availability={availability} />
        </div>
      </section>

      <footer className="footer container">
        <a className="brand" href="#top"><span className="brand-spark">✦</span><span>МАСТЕР<span>СКАЯ</span></span></a>
        <p><a href="/guide">Инструкция участника</a></p>
        <p>Бишкек · 2026</p>
      </footer>
    </main>
  );
}
