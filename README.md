# @ts-core/backend

[![npm version](https://badge.fury.io/js/%40ts-core%2Fbackend.svg)](https://badge.fury.io/js/%40ts-core%2Fbackend)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

**@ts-core/backend** — модульная TypeScript-библиотека для построения серверных приложений с поддержкой микросервисной архитектуры, работы с базами данных через TypeORM, обмена сообщениями через AMQP/RabbitMQ и централизованного управления настройками через переменные окружения.

## Содержание

- [Возможности](#-возможности)
- [Установка](#-установка)
- [Быстрый старт](#-быстрый-старт)
- [Архитектура](#️-архитектура)
- [API Reference](#-api-reference)
- [Конфигурация](#-конфигурация)
- [Примеры использования](#-примеры-использования)
- [Разработка](#️-разработка)
- [Зависимости](#-зависимости)

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

### Peer Dependencies

```bash
npm install @ts-core/common typeorm amqplib
```

## 🚀 Быстрый старт

```typescript
import {
    ModeApplication,
    EnvSettingsStorage,
    TransportAmqp,
    TypeormUtil
} from '@ts-core/backend';
import { Logger } from '@ts-core/common';

// 1. Настройки из .env
class Settings extends EnvSettingsStorage {
    get amqpHost() { return this.getValue('AMQP_HOST', 'localhost'); }
    get amqpPort() { return this.getValue('AMQP_PORT', 5672); }
    get amqpUserName() { return this.getValue('AMQP_USER', 'guest'); }
    get amqpPassword() { return this.getValue('AMQP_PASSWORD', 'guest'); }
    get amqpProtocol() { return this.getValue('AMQP_PROTOCOL', 'amqp'); }
}

// 2. Приложение
class App extends ModeApplication {
    private transport: TransportAmqp;

    constructor() {
        const settings = new Settings();
        super('MyService', settings, new Logger(settings.mode));
    }

    async onApplicationBootstrap() {
        await super.onApplicationBootstrap();

        // Подключение к RabbitMQ
        this.transport = new TransportAmqp(this.logger, this.settings);
        await this.transport.connect();

        this.log('Service ready!');
    }
}

new App().onApplicationBootstrap();
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

## 📖 API Reference

### TypeORM Transformers

#### TypeormDecimalTransformer

Преобразует строковые значения decimal из PostgreSQL в числа JavaScript.

```typescript
import { TypeormDecimalTransformer } from '@ts-core/backend';
import { Column, Entity } from 'typeorm';

@Entity()
class Product {
    @Column({
        type: 'decimal',
        precision: 10,
        scale: 2,
        transformer: TypeormDecimalTransformer.instance
    })
    price: number;
}
```

#### TypeormDateEpochTransformer

Преобразует даты в Unix timestamp (миллисекунды) и обратно.

```typescript
import { TypeormDateEpochTransformer } from '@ts-core/backend';

@Entity()
class Event {
    @Column({
        type: 'bigint',
        transformer: TypeormDateEpochTransformer.instance
    })
    scheduledAt: Date;
}
```

#### TypeormJsonTransformer

Сериализует/десериализует JSON-поля.

```typescript
import { TypeormJsonTransformer } from '@ts-core/backend';

@Entity()
class User {
    @Column({
        type: 'jsonb',
        transformer: new TypeormJsonTransformer()
    })
    metadata: Record<string, any>;
}
```

#### TypeormJsonClassTransformer

Преобразует JSON в экземпляры классов с использованием `class-transformer`.

```typescript
import { TypeormJsonClassTransformer } from '@ts-core/backend';
import { TransformUtil } from '@ts-core/common';

class Address {
    city: string;
    street: string;
}

@Entity()
class User {
    @Column({
        type: 'jsonb',
        transformer: new TypeormJsonClassTransformer(
            (item) => TransformUtil.toClass(Address, item)
        )
    })
    address: Address;
}
```

#### TypeormJsonArrayClassTransformer

Преобразует массивы JSON в массивы экземпляров классов.

```typescript
import { TypeormJsonArrayClassTransformer } from '@ts-core/backend';

@Entity()
class Order {
    @Column({
        type: 'jsonb',
        transformer: new TypeormJsonArrayClassTransformer(
            (item) => TransformUtil.toClass(OrderItem, item)
        )
    })
    items: OrderItem[];
}
```

### TypeormUtil

Утилиты для работы с запросами TypeORM.

#### Методы

| Метод | Описание |
|-------|----------|
| `applyFilterProperties(query, properties, alias?)` | Применяет фильтры и сортировку к запросу |
| `applySort(query, sort, alias?)` | Применяет сортировку |
| `applyConditions(query, conditions, alias?)` | Применяет условия фильтрации |
| `applyCondition(query, name, value, alias?, key?)` | Применяет одно условие |
| `toPagination(query, params, transform)` | Возвращает пагинированный результат |
| `toFilterable(query, params, transform)` | Возвращает отфильтрованный массив |
| `isUniqueError(error)` | Проверяет ошибку уникальности PostgreSQL |
| `isSerializationError(error)` | Проверяет ошибку сериализации |
| `validateEntity(entity, options?, code?)` | Валидирует сущность |
| `clearEntities(dataSource)` | Очищает все таблицы |
| `databaseClear(dataSource)` | Синхронизирует схему (drop + create) |

#### Пример пагинации

```typescript
import { TypeormUtil } from '@ts-core/backend';

async function getUsers(params: IPaginable<User>): Promise<IPagination<UserDto>> {
    const query = dataSource
        .getRepository(User)
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.profile', 'profile');

    return TypeormUtil.toPagination(
        query,
        params,
        async (user) => new UserDto(user)
    );
}
```

### TransportAmqp

AMQP транспорт для микросервисной коммуникации.

#### Конфигурация

```typescript
interface ITransportAmqpSettings {
    // Обязательные
    amqpHost: string;
    amqpPort: number;
    amqpUserName: string;
    amqpPassword: string;
    amqpProtocol: string;

    // Опциональные
    amqpVhost?: string;                      // default: undefined
    amqpQueuePrefix?: string;                // default: 'AMQP'
    reconnectDelay?: number;                 // default: 1000ms
    reconnectMaxAttempts?: number;           // default: 10
    isDisconnectOnChannelClose?: boolean;    // default: true
    isExitApplicationOnDisconnect?: boolean; // default: true
    timeout?: number;                        // default: 30000ms
}
```

#### Методы

| Метод | Описание |
|-------|----------|
| `connect()` | Подключение к брокеру |
| `disconnect(error?)` | Отключение от брокера |
| `send(command, options?)` | Отправка команды без ожидания ответа |
| `sendListen(command, options?)` | Отправка команды с ожиданием ответа |
| `listen(name)` | Подписка на команды |
| `complete(command, result?)` | Завершение обработки команды |
| `wait(command)` | Отложить обработку команды |
| `dispatch(event)` | Публикация события |
| `purge(command)` | Очистка очереди команды |
| `check(command)` | Проверка состояния очереди |
| `destroy()` | Уничтожение транспорта |

#### Пример: Producer/Consumer

```typescript
// Producer (отправитель)
const transport = new TransportAmqp(logger, settings);
await transport.connect();

// Fire-and-forget
transport.send(new NotifyUserCommand({ userId: 1, message: 'Hello' }));

// Request-response
const user = await transport.sendListen(new GetUserCommand({ id: 1 }));

// Consumer (получатель)
transport.listen<INotifyUserCommand>('NotifyUserCommand').subscribe(command => {
    try {
        await sendNotification(command.request);
        transport.complete(command);
    } catch (error) {
        transport.complete(command, error);
    }
});
```

### FileUtil

Утилиты для работы с файловой системой.

#### Методы

| Метод | Описание |
|-------|----------|
| `isExists(path)` | Проверка существования файла |
| `isExistsSync(path)` | Синхронная проверка существования |
| `read(path, encoding)` | Чтение файла |
| `readSync(path, encoding)` | Синхронное чтение |
| `save(path, data, encoding)` | Запись файла |
| `saveSync(path, data, encoding)` | Синхронная запись |
| `remove(path)` | Удаление файла |
| `removeSync(path)` | Синхронное удаление |
| `jsonRead(path, encoding?)` | Чтение JSON файла |
| `jsonSave(path, data, encoding?)` | Запись JSON файла |
| `directoryCreate(path, options?)` | Создание директории |
| `directoryCreateIfNeed(path, options?)` | Создание директории если не существует |
| `hash(binary, algorithm?, digest?)` | Хэширование данных |
| `hashByUrl(url, algorithm?, digest?)` | Хэширование по URL |
| `hashByPath(path, algorithm?, digest?)` | Хэширование файла |

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

### Runtime Dependencies

| Пакет | Версия | Назначение |
|-------|--------|------------|
| `@ts-core/common` | ~3.0.62 | Общие утилиты, интерфейсы, базовые классы |
| `typeorm` | ^0.3.7 | ORM для работы с базами данных |
| `amqplib` | ^0.8.0 | Клиент для AMQP (RabbitMQ) |
| `dotenv` | ^14.2.0 | Загрузка переменных окружения |
| `date-fns` | ^2.28.0 | Работа с датами |

### Dev Dependencies

| Пакет | Версия | Назначение |
|-------|--------|------------|
| `@types/amqplib` | ^0.8.2 | TypeScript типы для amqplib |
| `gulp-npm-module-publisher` | ^3.0.5 | Публикация пакета |

## 📁 Структура проекта

```
src/
├── application/           # Базовые классы приложений
│   └── ModeApplication.ts
├── controller/            # Абстрактные контроллеры
│   └── DefaultController.ts
├── database/
│   └── typeorm/           # TypeORM интеграция
│       ├── TypeormDecimalTransformer.ts
│       ├── TypeormDateEpochTransformer.ts
│       ├── TypeormJsonTransformer.ts
│       ├── TypeormJsonClassTransformer.ts
│       ├── TypeormJsonArrayClassTransformer.ts
│       ├── TypeormValidableEntity.ts
│       └── TypeormUtil.ts
├── file/                  # Утилиты для работы с файлами
│   └── FileUtil.ts
├── settings/              # Интерфейсы и классы настроек
│   ├── EnvSettingsStorage.ts
│   ├── LoggerSettings.ts
│   ├── IAmqpSettings.ts
│   ├── IDatabaseSettings.ts
│   ├── ILoggerSettings.ts
│   ├── IModeSettings.ts
│   ├── IPrometheusSettings.ts
│   └── IWebSettings.ts
├── transport/
│   └── amqp/              # AMQP транспорт
│       ├── TransportAmqp.ts
│       ├── TransportAmqpRequestPayload.ts
│       ├── TransportAmqpResponsePayload.ts
│       └── TransportAmqpEventPayload.ts
└── public-api.ts          # Точка входа (экспорты)
```

## 🔄 Dual Module Support

Библиотека поддерживает как ESM, так и CommonJS:

```json
{
    "main": "./cjs/public-api.js",
    "module": "./esm/public-api.js",
    "exports": {
        ".": {
            "import": "./esm/public-api.js",
            "require": "./cjs/public-api.js"
        }
    }
}
```

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