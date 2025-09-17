# @ts-core/backend

[![npm version](https://badge.fury.io/js/%40ts-core%2Fbackend.svg)](https://badge.fury.io/js/%40ts-core%2Fbackend)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

**@ts-core/backend** — это модульная TypeScript-библиотека для построения серверных приложений с поддержкой микросервисной архитектуры, работы с базами данных, обмена сообщениями и централизованного управления настройками.

## 🚀 Возможности

- **🏗️ Архитектура приложений** — базовые классы для создания приложений с поддержкой различных режимов работы
- **🎮 Контроллеры** — абстрактные контроллеры с автоматической валидацией входных и выходных данных
- **🗄️ Работа с БД** — интеграция с TypeORM, трансформеры для различных типов данных, утилиты для запросов
- **📁 Файловые операции** — утилиты для работы с файлами, директориями, хэширования
- **⚙️ Управление настройками** — централизованное хранение и доступ к настройкам через переменные окружения
- **🔄 AMQP транспорт** — полная реализация обмена сообщениями через RabbitMQ с поддержкой команд, событий и ответов
- **📊 Логирование** — интеграция с системой логирования из @ts-core/common

## 📦 Установка

```bash
npm install @ts-core/backend
```

## 🏗️ Архитектура

### Основные модули

#### 1. **Application** (`src/application/`)
Базовые классы для создания приложений:

- `ModeApplication<T>` — абстрактный класс приложения с поддержкой различных режимов работы (development, production, test, demo)
- Автоматическое логирование запуска приложения
- Управление жизненным циклом приложения

```typescript
class MyApplication extends ModeApplication<IMySettings> {
    constructor(settings: IMySettings, logger?: ILogger) {
        super('MyService', settings, logger);
    }
    
    async onApplicationBootstrap(): Promise<void> {
        // Инициализация приложения
        await super.onApplicationBootstrap();
    }
}
```

#### 2. **Controller** (`src/controller/`)
Система контроллеров с валидацией:

- `DefaultController<U, V>` — абстрактный контроллер с автоматической валидацией
- Валидация входных параметров (U) и выходных данных (V)
- Обработка ошибок валидации

```typescript
class UserController extends DefaultController<IUserRequest, IUserResponse> {
    protected async execute(params: IUserRequest): Promise<IUserResponse> {
        // Логика контроллера
        return result;
    }
}
```

#### 3. **Database/TypeORM** (`src/database/typeorm/`)
Интеграция с TypeORM:

**Трансформеры:**
- `TypeormDateEpochTransformer` — преобразование дат в Unix timestamp
- `TypeormDecimalTransformer` — работа с десятичными числами
- `TypeormJsonTransformer` — сериализация/десериализация JSON
- `TypeormJsonClassTransformer<T>` — работа с массивами объектов

**Утилиты:**
- `TypeormUtil` — мощный набор утилит для работы с запросами
- `TypeormValidableEntity` — базовый класс для сущностей с автоматической валидацией

**Основные возможности TypeormUtil:**
- Применение фильтров и сортировки к запросам
- Пагинация результатов
- Обработка ошибок PostgreSQL
- Валидация сущностей
- Очистка базы данных

```typescript
// Пример использования TypeormUtil
const query = dataSource
    .getRepository(User)
    .createQueryBuilder('user');

TypeormUtil.applyFilterProperties(query, {
    conditions: { name: 'John', age: MoreThan(18) },
    sort: { createdAt: true }
});

const result = await TypeormUtil.toPagination(query, paginationParams, transform);
```

#### 4. **File** (`src/file/`)
Утилиты для работы с файлами:

- Синхронные и асинхронные операции с файлами
- Работа с JSON файлами
- Создание директорий
- Хэширование файлов и URL
- Проверка существования файлов

```typescript
// Примеры использования
const exists = await FileUtil.isExists('/path/to/file');
const content = await FileUtil.read('/path/to/file', 'utf8');
const hash = await FileUtil.hashByUrl('https://example.com/file.jpg');
```

#### 5. **Settings** (`src/settings/`)
Система управления настройками:

**Интерфейсы настроек:**
- `IModeSettings` — режимы работы приложения
- `IDatabaseSettings` — настройки базы данных
- `IAmqpSettings` — настройки AMQP
- `IWebSettings` — настройки веб-сервера
- `ILoggerSettings` — настройки логирования
- `IPrometheusSettings` — настройки мониторинга

**Реализации:**
- `EnvSettingsStorage` — загрузка настроек из .env файлов и переменных окружения
- `LoggerSettings` — настройки логирования с поддержкой уровней

```typescript
class MySettings extends EnvSettingsStorage implements IDatabaseSettings, IAmqpSettings {
    get databaseHost(): string { return this.getValue('DB_HOST'); }
    get databasePort(): number { return this.getValue('DB_PORT', 5432); }
    get amqpHost(): string { return this.getValue('AMQP_HOST'); }
    // ... другие настройки
}
```

#### 6. **Transport/AMQP** (`src/transport/amqp/`)
Полная реализация AMQP транспорта:

**Основные классы:**
- `TransportAmqp` — основной класс транспорта
- `TransportAmqpRequestPayload` — пейлоад для команд
- `TransportAmqpResponsePayload` — пейлоад для ответов
- `TransportAmqpEventPayload` — пейлоад для событий

**Возможности:**
- Отправка команд с ожиданием ответа и без
- Публикация событий
- Автоматическое переподключение
- Обработка таймаутов
- Dead letter queues
- Поддержка отложенных команд

```typescript
// Пример использования AMQP транспорта
const transport = new TransportAmqp(logger, settings);

await transport.connect();

// Отправка команды без ожидания ответа
transport.send(new UserCreateCommand(userData));

// Отправка команды с ожиданием ответа
const result = await transport.sendListen(new UserGetCommand(userId));

// Публикация события
transport.dispatch(new UserCreatedEvent(user));

// Подписка на команды
transport.listen('user.create').subscribe(command => {
    // Обработка команды
    transport.complete(command, result);
});
```

## 🔧 Конфигурация

### Переменные окружения

```bash
# Режим работы
NODE_ENV=development|production|test|demo

# База данных
DB_HOST=localhost
DB_PORT=5432
DB_NAME=myapp
DB_USER=user
DB_PASSWORD=password

# AMQP
AMQP_HOST=localhost
AMQP_PORT=5672
AMQP_USER=guest
AMQP_PASSWORD=guest
AMQP_VHOST=/

# Логирование
LOGGER_LEVEL=LOG|DEBUG|INFO|WARN|ERROR|FATAL|OFF|ALL

# Веб-сервер
WEB_HOST=localhost
WEB_PORT=3000

# Prometheus
PROMETHEUS_PATH=/metrics
PROMETHEUS_PORT=9090
```

## 📚 Примеры использования

### Создание простого приложения

```typescript
import { ModeApplication, EnvSettingsStorage } from '@ts-core/backend';

interface IAppSettings extends IModeSettings, IDatabaseSettings {
    // дополнительные настройки
}

class AppSettings extends EnvSettingsStorage implements IAppSettings {
    get databaseHost(): string { return this.getValue('DB_HOST'); }
    get databasePort(): number { return this.getValue('DB_PORT', 5432); }
    get databaseName(): string { return this.getValue('DB_NAME'); }
    get databaseUserName(): string { return this.getValue('DB_USER'); }
    get databaseUserPassword(): string { return this.getValue('DB_PASSWORD'); }
}

class MyApplication extends ModeApplication<IAppSettings> {
    constructor() {
        const settings = new AppSettings();
        super('MyService', settings);
    }
    
    async onApplicationBootstrap(): Promise<void> {
        await super.onApplicationBootstrap();
        // Инициализация сервисов
    }
}

// Запуск приложения
const app = new MyApplication();
app.onApplicationBootstrap();
```

### Создание контроллера

```typescript
import { DefaultController } from '@ts-core/backend';

interface IUserRequest {
    name: string;
    email: string;
}

interface IUserResponse {
    id: number;
    name: string;
    email: string;
}

class UserController extends DefaultController<IUserRequest, IUserResponse> {
    protected async execute(params: IUserRequest): Promise<IUserResponse> {
        // Валидация происходит автоматически
        const user = await this.createUser(params);
        return user;
    }
    
    private async createUser(data: IUserRequest): Promise<IUserResponse> {
        // Логика создания пользователя
    }
}
```

## 🛠️ Разработка

### Сборка проекта

```bash
make build
```

### Очистка

```bash
make clean
```

### Публикация

```bash
make publish          # patch версия
make publish_patch    # patch версия
make publish_minor    # minor версия
make publish_major    # major версия
```

## 📋 Зависимости

- `@ts-core/common` — общие утилиты и интерфейсы
- `typeorm` — ORM для работы с базами данных
- `amqplib` — клиент для AMQP (RabbitMQ)
- `dotenv` — загрузка переменных окружения
- `date-fns` — работа с датами

## 📄 Лицензия

ISC License

## 👨‍💻 Автор

**Renat Gubaev**  
Email: renat.gubaev@gmail.com  
GitHub: [@ManhattanDoctor](https://github.com/ManhattanDoctor)

## 🔗 Ссылки

- [Репозиторий](https://github.com/ManhattanDoctor/ts-core-backend)
- [NPM пакет](https://www.npmjs.com/package/@ts-core/backend)
- [Issues](https://github.com/ManhattanDoctor/ts-core-backend/issues)