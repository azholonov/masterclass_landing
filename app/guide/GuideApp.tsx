"use client";

import type { CSSProperties } from "react";
import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Box,
  Braces,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  CloudUpload,
  Code2,
  Copy,
  Database,
  ExternalLink,
  GitBranch,
  Layers3,
  Laptop,
  LayoutGrid,
  Lightbulb,
  LogOut,
  Package,
  Play,
  RefreshCcw,
  Rocket,
  Settings2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Terminal,
  TestTube2,
  TriangleAlert,
  Workflow,
  Wrench,
} from "lucide-react";
import type { GuideChecklistItemId } from "@/lib/guide-progress";
import styles from "./guide.module.css";

type Platform = "macos" | "windows";
type GuideViewer = { role: "participant" | "admin"; name: string };

const checklistItems = [
  { id: "laptop", title: "Ноутбук и зарядка", text: "macOS или Windows, минимум 8 ГБ RAM; 16 ГБ комфортнее." },
  { id: "space", title: "30 ГБ свободного места", text: "SDK, Android Studio и симуляторы занимают больше, чем кажется." },
  { id: "ai", title: "Активный AI-аккаунт", text: "Войдите в платный ChatGPT или Claude до начала мастер-класса." },
  { id: "phone", title: "Телефон и кабель", text: "Физическое устройство быстрее и честнее показывает результат." },
  { id: "accounts", title: "Google и Apple ID", text: "Google нужен для Android-инструментов, Apple ID — для запуска на iPhone." },
  { id: "doctor", title: "Flutter Doctor без красных ошибок", text: "Предупреждения допустимы только для платформ, которые вам не нужны." },
  { id: "device", title: "Flutter видит устройство", text: "Команда flutter devices показывает телефон или эмулятор." },
  { id: "hello", title: "Тестовое приложение запускается", text: "Стартовый Flutter-проект открылся на выбранном устройстве." },
] as const;

const sections = [
  ["start", "Подготовка"],
  ["setup", "Установка"],
  ["first-run", "Первый запуск"],
  ["basics", "Основы"],
  ["architecture", "Архитектура"],
  ["types", "Типы приложений"],
  ["process", "Процесс"],
  ["release", "Публикация"],
  ["help", "Быстрая помощь"],
] as const;

const commonTools = [
  {
    number: "01",
    icon: Box,
    title: "Flutter SDK",
    text: "Фреймворк и командные инструменты для одного кода под Android и iOS.",
    href: "https://docs.flutter.dev/install",
    action: "Установить Flutter",
  },
  {
    number: "02",
    icon: Code2,
    title: "VS Code + Flutter",
    text: "Редактор и расширения Flutter/Dart. Cursor тоже подходит как совместимый редактор.",
    href: "https://docs.flutter.dev/install/with-vs-code",
    action: "Открыть инструкцию",
  },
  {
    number: "03",
    icon: GitBranch,
    title: "Git",
    text: "История проекта и безопасные контрольные точки перед изменениями от AI.",
    href: "https://git-scm.com/downloads",
    action: "Скачать Git",
  },
] as const;

const basics = [
  { icon: LayoutGrid, term: "Widget", title: "Любая часть интерфейса", text: "Текст, кнопка, экран и даже отступ во Flutter собраны из виджетов." },
  { icon: RefreshCcw, term: "State", title: "Данные, которые меняются", text: "Загрузка, выбранная вкладка, пользователь и список задач — это состояние." },
  { icon: ArrowRight, term: "Route", title: "Экран и переход", text: "Маршрут связывает экран с навигацией: открыть, вернуться, передать данные." },
  { icon: Package, term: "Package", title: "Готовая возможность", text: "Камера, сеть, карта или хранение данных подключаются как пакеты." },
  { icon: Database, term: "API", title: "Связь с сервером", text: "Приложение отправляет запрос и получает данные в формате JSON." },
  { icon: Rocket, term: "Build", title: "Собранная версия", text: "Устанавливаемый результат: APK/AAB для Android или IPA для iOS." },
] as const;

const appTypes = [
  {
    label: "Native",
    title: "Отдельно для каждой платформы",
    stack: "Swift / Kotlin",
    text: "Максимальный доступ к платформе и точная нативная интеграция, но две кодовые базы.",
    good: "Сложные системные функции, премиальный platform-specific UX.",
    featured: false,
  },
  {
    label: "Cross-platform",
    title: "Один продукт, общий код",
    stack: "Flutter / React Native",
    text: "Одна команда создаёт Android и iOS-приложение с общей логикой и интерфейсом.",
    good: "MVP, стартапы, небольшие команды и быстрые итерации.",
    featured: true,
  },
  {
    label: "Web / PWA",
    title: "Сайт, похожий на приложение",
    stack: "Web technologies",
    text: "Открывается по ссылке и может устанавливаться, но имеет ограничения платформы.",
    good: "Контент, кабинеты, формы и быстрый охват без магазинов.",
    featured: false,
  },
  {
    label: "No-code",
    title: "Продукт из блоков",
    stack: "Visual builders",
    text: "Быстрый способ проверить идею, пока сложность и уникальность продукта невысоки.",
    good: "Прототипы, внутренние инструменты и проверка спроса.",
    featured: false,
  },
] as const;

const deliverySteps = [
  ["01", "Проблема", "Кто пользователь и какую конкретную боль мы решаем?"],
  ["02", "MVP", "Оставляем один главный сценарий и убираем всё необязательное."],
  ["03", "Прототип", "Рисуем экраны и путь пользователя до написания логики."],
  ["04", "Фундамент", "Создаём проект, структуру, тему, модели и навигацию."],
  ["05", "Вертикальный срез", "Делаем один сценарий полностью: UI → логика → данные."],
  ["06", "Проверка", "Тестируем на реальном телефоне, исправляем ошибки и неудобства."],
  ["07", "Beta", "Отдаём сборку небольшой группе через internal testing или TestFlight."],
  ["08", "Release", "Публикуем, смотрим метрики и планируем следующую итерацию."],
] as const;

const commandGroups: Record<Platform, { title: string; text: string; command: string; href: string; link: string }[]> = {
  macos: [
    {
      title: "Установите Xcode",
      text: "Нужен для iOS Simulator, сборки и подписи приложений. iOS-разработка доступна только на macOS.",
      command: "sudo xcode-select -s /Applications/Xcode.app/Contents/Developer\nsudo xcodebuild -runFirstLaunch",
      href: "https://docs.flutter.dev/platform-integration/ios/setup",
      link: "Настройка iOS",
    },
    {
      title: "Установите Android Studio",
      text: "В Setup Wizard оставьте Android SDK, Platform Tools и Emulator. Создайте виртуальное устройство.",
      command: "flutter doctor --android-licenses",
      href: "https://docs.flutter.dev/platform-integration/android/setup",
      link: "Настройка Android",
    },
  ],
  windows: [
    {
      title: "Установите Android Studio",
      text: "В Setup Wizard оставьте Android SDK, Platform Tools и Emulator. В BIOS должна быть включена виртуализация.",
      command: "flutter doctor --android-licenses",
      href: "https://docs.flutter.dev/platform-integration/android/setup",
      link: "Настройка Android",
    },
    {
      title: "Планируете выпуск на iOS?",
      text: "Писать общий Flutter-код можно на Windows, но для сборки, подписи и публикации iOS понадобится Mac с Xcode.",
      command: "flutter devices\nflutter doctor -v",
      href: "https://docs.flutter.dev/platform-integration",
      link: "Поддерживаемые платформы",
    },
  ],
};

function CodeBlock({ command, copied, onCopy }: { command: string; copied: boolean; onCopy: () => void }) {
  return (
    <div className={styles.codeBlock}>
      <div className={styles.codeDots} aria-hidden="true"><i /><i /><i /></div>
      <pre><code>{command}</code></pre>
      <button type="button" onClick={onCopy} aria-label="Скопировать команду">
        {copied ? <Check size={16} /> : <Copy size={16} />}
        <span>{copied ? "Скопировано" : "Копировать"}</span>
      </button>
    </div>
  );
}

export function GuideApp({
  viewer,
  initialCompletedItems,
}: {
  viewer: GuideViewer;
  initialCompletedItems: GuideChecklistItemId[];
}) {
  const [platform, setPlatform] = useState<Platform>("macos");
  const [checked, setChecked] = useState<Record<string, boolean>>(
    Object.fromEntries(initialCompletedItems.map((id) => [id, true])),
  );
  const [copiedCommand, setCopiedCommand] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const saveQueue = useRef<Promise<void>>(Promise.resolve());

  const completed = useMemo(
    () => checklistItems.filter((item) => checked[item.id]).length,
    [checked],
  );
  const progress = Math.round((completed / checklistItems.length) * 100);

  const queueProgressSave = (completedItems: string[]) => {
    if (viewer.role !== "participant") return;
    setSaveState("saving");
    saveQueue.current = saveQueue.current.then(async () => {
      const response = await fetch("/api/guide/progress", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completedItems }),
      });
      if (!response.ok) throw new Error("Guide progress save failed");
      setSaveState("saved");
    }).catch(() => {
      setSaveState("error");
    });
  };

  const toggleItem = (id: GuideChecklistItemId) => {
    setChecked((current) => {
      const next = { ...current, [id]: !current[id] };
      queueProgressSave(checklistItems.filter((item) => next[item.id]).map((item) => item.id));
      return next;
    });
  };

  const copy = async (command: string) => {
    try {
      await navigator.clipboard.writeText(command);
      setCopiedCommand(command);
      window.setTimeout(() => setCopiedCommand(""), 1800);
    } catch {
      setCopiedCommand("");
    }
  };

  const resetProgress = () => {
    setChecked({});
    queueProgressSave([]);
  };

  return (
    <main className={styles.app}>
      <header className={styles.topbar}>
        <div className={styles.shell}>
          <Link className={styles.brand} href="/" aria-label="Вернуться на главную">
            <span className={styles.brandMark}>✦</span>
            <span>МАСТЕР<span>СКАЯ</span></span>
          </Link>
          <span className={styles.topbarLabel}>{viewer.role === "admin" ? "Режим организатора" : viewer.name}</span>
          <div className={styles.viewerControls}>
            {viewer.role === "admin" ? (
              <Link className={styles.backLink} href="/crm"><ArrowLeft size={17} /> <span>В CRM</span></Link>
            ) : (
              <form action="/api/guide/logout" method="post">
                <button type="submit"><LogOut size={15} /> <span>Выйти</span></button>
              </form>
            )}
          </div>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={`${styles.shell} ${styles.heroGrid}`}>
          <div className={styles.heroCopy}>
            <p className={styles.kicker}><Sparkles size={15} /> Flutter + AI · подготовка и база</p>
            <h1>ТВОЙ МОБИЛЬНЫЙ<br /><em>СТАРТОВЫЙ НАБОР.</em></h1>
            <p className={styles.heroLead}>
              Всё, что нужно до, во время и после мастер-класса: настройка среды,
              устройство приложения и путь от идеи до App Store и Google Play.
            </p>
            <div className={styles.heroActions}>
              <a className={styles.primaryButton} href="#start">Начать подготовку <ArrowRight size={19} /></a>
              <a className={styles.textButton} href="#basics"><BookOpen size={18} /> Изучить основы</a>
            </div>
          </div>

          <div className={styles.statusCard}>
            <div className={styles.statusTop}>
              <span>{viewer.role === "admin" ? "Предпросмотр организатора" : `Прогресс · ${viewer.name}`}</span>
              <ShieldCheck size={21} />
            </div>
            <div className={styles.progressVisual}>
              <div
                className={styles.progressRing}
                style={{ "--progress": `${progress * 3.6}deg` } as CSSProperties}
                aria-label={`Готовность ${progress}%`}
              >
                <div><strong>{progress}%</strong><span>{completed}/{checklistItems.length} готово</span></div>
              </div>
              <div className={styles.progressCopy}>
                <p>{viewer.role === "admin"
                  ? "Вы видите закрытую инструкцию как организатор. Этот прогресс не сохраняется."
                  : progress === 100
                    ? "Среда готова. Прогресс сохранён в вашем профиле."
                    : "Отмечайте пункты — прогресс автоматически сохранится в вашем профиле."}</p>
                {viewer.role === "participant" && saveState !== "idle" ? (
                  <span className={`${styles.saveState} ${saveState === "error" ? styles.saveStateError : ""}`} aria-live="polite">
                    {saveState === "saving" ? "Сохраняем…" : saveState === "saved" ? "Сохранено" : "Не сохранено — повторите действие"}
                  </span>
                ) : null}
                {completed > 0 && <button type="button" onClick={resetProgress}><RefreshCcw size={13} /> Сбросить</button>}
              </div>
            </div>
            <div className={styles.statusFooter}>
              <span><Laptop size={16} /> Личный ноутбук</span>
              <span><Smartphone size={16} /> Телефон</span>
              <span><Sparkles size={16} /> AI-подписка</span>
            </div>
          </div>
        </div>
        <div className={styles.heroTicker} aria-hidden="true">
          FLUTTER ✦ DART ✦ AI ✦ BUILD ✦ TEST ✦ SHIP ✦ FLUTTER ✦ DART ✦ AI ✦ BUILD ✦
        </div>
      </section>

      <div className={`${styles.shell} ${styles.guideLayout}`}>
        <aside className={styles.sidebar} aria-label="Содержание руководства">
          <div className={styles.sidebarTitle}><span>Содержание</span><strong>09 разделов</strong></div>
          <nav>
            {sections.map(([id, label], index) => (
              <a href={`#${id}`} key={id}><span>{String(index + 1).padStart(2, "0")}</span>{label}<ChevronRight size={14} /></a>
            ))}
          </nav>
          <div className={styles.sidebarTip}>
            <Lightbulb size={18} />
            <p><strong>Не застревайте.</strong> Если настройка не получается, приходите за час до начала — настроим вместе.</p>
          </div>
        </aside>

        <div className={styles.content}>
          <section className={styles.guideSection} id="start">
            <div className={styles.sectionHeading}>
              <span className={styles.sectionNumber}>01</span>
              <div><p>До мастер-класса</p><h2>ПРОВЕРЬТЕ, ЧТО ВСЁ С СОБОЙ.</h2></div>
            </div>
            <div className={styles.callout}><TriangleAlert size={21} /><p><strong>Главное:</strong> не приходите с разряженным ноутбуком и незнакомыми паролями. Войдите во все аккаунты заранее.</p></div>
            <div className={styles.checkGrid}>
              {checklistItems.slice(0, 5).map((item) => {
                const isChecked = Boolean(checked[item.id]);
                return (
                  <button
                    className={`${styles.checkCard} ${isChecked ? styles.checked : ""}`}
                    type="button"
                    aria-pressed={isChecked}
                    onClick={() => toggleItem(item.id)}
                    key={item.id}
                  >
                    <span className={styles.checkIcon}>{isChecked ? <Check size={18} /> : <Circle size={18} />}</span>
                    <span><strong>{item.title}</strong><small>{item.text}</small></span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className={styles.guideSection} id="setup">
            <div className={styles.sectionHeading}>
              <span className={styles.sectionNumber}>02</span>
              <div><p>Среда разработки</p><h2>УСТАНОВИТЕ РАБОЧИЙ СТЕК.</h2></div>
            </div>

            <div className={styles.toolGrid}>
              {commonTools.map(({ number, icon: Icon, title, text, href, action }) => (
                <article className={styles.toolCard} key={title}>
                  <div className={styles.toolCardTop}><span>/{number}</span><Icon size={23} /></div>
                  <h3>{title}</h3><p>{text}</p>
                  <a href={href} target="_blank" rel="noreferrer">{action} <ExternalLink size={14} /></a>
                </article>
              ))}
            </div>

            <div className={styles.platformBlock}>
              <div className={styles.platformHeader}>
                <div><p>Выберите систему</p><h3>Дальше инструкции отличаются</h3></div>
                <div className={styles.tabs} role="tablist" aria-label="Операционная система">
                  <button role="tab" aria-selected={platform === "macos"} onClick={() => setPlatform("macos")}>macOS</button>
                  <button role="tab" aria-selected={platform === "windows"} onClick={() => setPlatform("windows")}>Windows</button>
                </div>
              </div>
              <div className={styles.platformSteps}>
                {commandGroups[platform].map((step, index) => (
                  <article key={step.title}>
                    <div className={styles.stepTitle}><span>{index + 1}</span><div><h4>{step.title}</h4><p>{step.text}</p></div></div>
                    <CodeBlock command={step.command} copied={copiedCommand === step.command} onCopy={() => copy(step.command)} />
                    <a href={step.href} target="_blank" rel="noreferrer">{step.link} <ExternalLink size={13} /></a>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className={styles.guideSection} id="first-run">
            <div className={styles.sectionHeading}>
              <span className={styles.sectionNumber}>03</span>
              <div><p>Контрольная точка</p><h2>ЗАПУСТИТЕ ПЕРВОЕ ПРИЛОЖЕНИЕ.</h2></div>
            </div>
            <div className={styles.firstRunGrid}>
              <div>
                <p className={styles.lead}>Если этот сценарий работает, к мастер-классу вы готовы.</p>
                <ol className={styles.simpleSteps}>
                  <li><span>1</span><p><strong>Проверьте среду</strong>Исправьте красные пункты Flutter Doctor.</p></li>
                  <li><span>2</span><p><strong>Создайте проект</strong>Имя — латиницей, маленькими буквами.</p></li>
                  <li><span>3</span><p><strong>Выберите устройство</strong>Телефон или запущенный эмулятор.</p></li>
                  <li><span>4</span><p><strong>Запустите</strong>Дождитесь стандартного приложения со счётчиком.</p></li>
                </ol>
              </div>
              <div className={styles.terminalCard}>
                <div className={styles.terminalTitle}><Terminal size={17} /><span>Terminal</span><i>ready</i></div>
                <CodeBlock
                  command={"flutter doctor -v\nflutter create vibe_app\ncd vibe_app\nflutter devices\nflutter run"}
                  copied={copiedCommand === "first-run"}
                  onCopy={() => {
                    copy("flutter doctor -v\nflutter create vibe_app\ncd vibe_app\nflutter devices\nflutter run");
                    setCopiedCommand("first-run");
                  }}
                />
                <div className={styles.successLine}><CheckCircle2 size={17} /> Ожидаемый результат: приложение открылось на устройстве.</div>
              </div>
            </div>
            <div className={styles.checkGrid}>
              {checklistItems.slice(5).map((item) => {
                const isChecked = Boolean(checked[item.id]);
                return (
                  <button
                    className={`${styles.checkCard} ${isChecked ? styles.checked : ""}`}
                    type="button"
                    aria-pressed={isChecked}
                    onClick={() => toggleItem(item.id)}
                    key={item.id}
                  >
                    <span className={styles.checkIcon}>{isChecked ? <Check size={18} /> : <Circle size={18} />}</span>
                    <span><strong>{item.title}</strong><small>{item.text}</small></span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className={`${styles.guideSection} ${styles.darkSection}`} id="basics">
            <div className={styles.sectionHeading}>
              <span className={styles.sectionNumber}>04</span>
              <div><p>Мобильная база</p><h2>ШЕСТЬ СЛОВ, КОТОРЫЕ НУЖНО ЗНАТЬ.</h2></div>
            </div>
            <div className={styles.basicsGrid}>
              {basics.map(({ icon: Icon, term, title, text }) => (
                <article key={term}><div><span>{term}</span><Icon size={22} /></div><h3>{title}</h3><p>{text}</p></article>
              ))}
            </div>
            <div className={styles.layersDiagram}>
              <div className={styles.diagramCopy}><p>Как течёт приложение</p><h3>От касания к данным — и обратно</h3><span>Пользователь видит только верхний слой. Хороший код разделяет ответственность ниже.</span></div>
              <div className={styles.layers}>
                <div><LayoutGrid size={18} /><span><strong>UI</strong> widgets & screens</span></div>
                <div><RefreshCcw size={18} /><span><strong>STATE</strong> loading, data, errors</span></div>
                <div><Braces size={18} /><span><strong>LOGIC</strong> rules & use cases</span></div>
                <div><Database size={18} /><span><strong>DATA</strong> API, database, cache</span></div>
              </div>
            </div>
          </section>

          <section className={styles.guideSection} id="architecture">
            <div className={styles.sectionHeading}>
              <span className={styles.sectionNumber}>05</span>
              <div><p>Архитектура</p><h2>ДЕРЖИТЕ ПРОЕКТ ПОНЯТНЫМ.</h2></div>
            </div>
            <p className={styles.lead}>Архитектура — не количество папок. Это правило: где живёт код, кто за что отвечает и в каком направлении идут зависимости.</p>
            <div className={styles.archGrid}>
              <div className={styles.fileTree}>
                <div className={styles.fileTreeHeader}><Layers3 size={18} /> Рекомендуемая структура</div>
                <pre>{`lib/
├── app/              # запуск, тема, маршруты
├── core/             # общие сервисы и UI
├── features/
│   └── tasks/
│       ├── data/     # API и хранилище
│       ├── domain/   # модели и правила
│       └── presentation/ # экраны и state
└── main.dart`}</pre>
              </div>
              <div className={styles.archRules}>
                <article><span>01</span><div><h3>Группируйте по функции</h3><p>Всё про задачи лежит рядом, а не разбросано по всему проекту.</p></div></article>
                <article><span>02</span><div><h3>UI не ходит в базу напрямую</h3><p>Экран просит state/logic, а те работают через слой данных.</p></div></article>
                <article><span>03</span><div><h3>Начинайте проще</h3><p>Для прототипа достаточно ясных границ. Усложняйте после реальной боли.</p></div></article>
              </div>
            </div>
            <div className={styles.aiRule}><Sparkles size={22} /><p><strong>Правило работы с AI:</strong> сначала попросите объяснить план и файлы, затем дайте одну маленькую задачу, просмотрите изменения, запустите приложение — и только потом продолжайте.</p></div>
          </section>

          <section className={styles.guideSection} id="types">
            <div className={styles.sectionHeading}>
              <span className={styles.sectionNumber}>06</span>
              <div><p>Выбор технологии</p><h2>НЕ ВСЕМ ПРИЛОЖЕНИЯМ НУЖЕН FLUTTER.</h2></div>
            </div>
            <div className={styles.typeGrid}>
              {appTypes.map((type) => (
                <article className={type.featured ? styles.featuredType : ""} key={type.label}>
                  <div><span>{type.label}</span>{type.featured && <em>Наш выбор</em>}</div>
                  <h3>{type.title}</h3><code>{type.stack}</code><p>{type.text}</p>
                  <small><strong>Когда подходит:</strong> {type.good}</small>
                </article>
              ))}
            </div>
          </section>

          <section className={`${styles.guideSection} ${styles.processSection}`} id="process">
            <div className={styles.sectionHeading}>
              <span className={styles.sectionNumber}>07</span>
              <div><p>От идеи до пользователей</p><h2>РАЗРАБАТЫВАЙТЕ ВОСЕМЬЮ ШАГАМИ.</h2></div>
            </div>
            <div className={styles.processGrid}>
              {deliverySteps.map(([number, title, text]) => (
                <article key={number}><span>{number}</span><div><h3>{title}</h3><p>{text}</p></div></article>
              ))}
            </div>
            <div className={styles.aiLoop}>
              <p><Sparkles size={18} /> Цикл вайбкодинга</p>
              <div><span>Контекст</span><ArrowRight /><span>Маленькая задача</span><ArrowRight /><span>Review diff</span><ArrowRight /><span>Run & test</span><ArrowRight /><span>Commit</span></div>
            </div>
          </section>

          <section className={styles.guideSection} id="release">
            <div className={styles.sectionHeading}>
              <span className={styles.sectionNumber}>08</span>
              <div><p>Deploy</p><h2>ПРОТОТИП — НЕ РЕЛИЗ.</h2></div>
            </div>
            <div className={styles.releaseIntro}><CloudUpload size={29} /><div><h3>Перед публикацией нужен отдельный проход качества</h3><p>Название, иконка, версия, подпись, разрешения, политика конфиденциальности, скриншоты и тестирование на реальных устройствах.</p></div></div>
            <div className={styles.releaseGrid}>
              <article>
                <div className={styles.releaseTitle}><span>Android</span><strong>Google Play</strong></div>
                <ol><li>Задайте уникальный application ID.</li><li>Настройте release signing.</li><li>Соберите AAB и загрузите в Internal testing.</li><li>Проверьте карточку, privacy и Data safety.</li></ol>
                <CodeBlock command="flutter build appbundle" copied={copiedCommand === "flutter build appbundle"} onCopy={() => copy("flutter build appbundle")} />
                <a href="https://docs.flutter.dev/deployment/android" target="_blank" rel="noreferrer">Официальная инструкция <ExternalLink size={13} /></a>
              </article>
              <article>
                <div className={styles.releaseTitle}><span>iOS</span><strong>TestFlight → App Store</strong></div>
                <ol><li>Задайте уникальный Bundle ID.</li><li>Выберите Apple Developer Team и signing.</li><li>Соберите IPA и загрузите в App Store Connect.</li><li>Сначала отдайте сборку тестировщикам.</li></ol>
                <CodeBlock command="flutter build ipa" copied={copiedCommand === "flutter build ipa"} onCopy={() => copy("flutter build ipa")} />
                <a href="https://docs.flutter.dev/deployment/ios" target="_blank" rel="noreferrer">Официальная инструкция <ExternalLink size={13} /></a>
              </article>
            </div>
          </section>

          <section className={styles.guideSection} id="help">
            <div className={styles.sectionHeading}>
              <span className={styles.sectionNumber}>09</span>
              <div><p>Когда что-то сломалось</p><h2>СНАЧАЛА ПРОВЕРЬТЕ ЭТО.</h2></div>
            </div>
            <div className={styles.helpGrid}>
              <article><Wrench size={21} /><h3>Flutter не найден</h3><p>Перезапустите терминал/редактор и проверьте, что папка Flutter bin добавлена в PATH.</p><code>flutter doctor -v</code></article>
              <article><Smartphone size={21} /><h3>Устройство не видно</h3><p>Разблокируйте телефон, подтвердите Trust/USB debugging, замените кабель и повторите.</p><code>flutter devices</code></article>
              <article><Package size={21} /><h3>Пакеты не скачались</h3><p>Проверьте интернет, имя пакета и файл pubspec.yaml, затем восстановите зависимости.</p><code>flutter pub get</code></article>
              <article><TestTube2 size={21} /><h3>После AI всё красное</h3><p>Не просите новую правку вслепую. Покажите AI первую ошибку и последние изменения.</p><code>flutter analyze</code></article>
            </div>
            <div className={styles.finalCta}>
              <div><p>Подготовка занимает 60–90 минут</p><h2>ГОТОВЫ? ТЕПЕРЬ МОЖНО СОЗДАВАТЬ.</h2></div>
              <a href="#start">Проверить прогресс <ArrowRight size={18} /></a>
            </div>
          </section>
        </div>
      </div>

      <footer className={styles.footer}>
        <div className={styles.shell}>
          <div className={styles.brand}><span className={styles.brandMark}>✦</span><span>МАСТЕР<span>СКАЯ</span></span></div>
          <p>Полевой гид участника · Flutter + AI</p>
          <Link href="/">Вернуться к мастер-классу <ArrowRight size={15} /></Link>
        </div>
      </footer>
    </main>
  );
}
