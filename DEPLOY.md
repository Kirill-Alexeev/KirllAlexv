# Деплой: бэкенд на PythonAnywhere, фронтенд на Vercel

Оба сервиса бесплатные. Ниже `LOGIN` — ваш логин на PythonAnywhere,
`FRONT` — домен фронтенда на Vercel (например, `corespace.vercel.app`).

Перед началом закоммитьте и запушьте все изменения в GitHub:
оба сервиса берут код из репозитория `Kirill-Alexeev/KirllAlexv`.

---

## 1. Бэкенд (Django) на PythonAnywhere

### 1.1. Аккаунт и код

1. Зарегистрируйтесь на <https://www.pythonanywhere.com> (тариф **Beginner**, бесплатный).
2. Откройте **Consoles → Bash** и выполните:

```bash
git clone https://github.com/Kirill-Alexeev/KirllAlexv.git ~/KirllAlexv
mkdir -p ~/data/media ~/data/staticfiles
mkvirtualenv --python=python3.13 corespace
pip install -r ~/KirllAlexv/backend/requirements.txt
```

Если Python 3.13 на вашем аккаунте недоступен, укажите `python3.12`, Django 5.2 работает и на нём.

### 1.2. Переменные окружения

Сгенерируйте секретный ключ (выведенную строку сохраните, она понадобится дважды):

```bash
python -c "import secrets; print(secrets.token_urlsafe(50))"
```

Чтобы переменные были доступны в консоли (для `migrate` и т. п.),
добавьте их в скрипт активации виртуального окружения:

```bash
cat >> ~/.virtualenvs/corespace/bin/postactivate <<'EOF'
export DJANGO_DEBUG=False
export DJANGO_SECRET_KEY='ВСТАВЬТЕ_КЛЮЧ'
export DJANGO_ALLOWED_HOSTS='LOGIN.pythonanywhere.com'
export DJANGO_FRONTEND_ORIGINS='https://FRONT'
export DJANGO_DB_PATH="$HOME/data/db.sqlite3"
export DJANGO_STATIC_ROOT="$HOME/data/staticfiles"
export DJANGO_MEDIA_ROOT="$HOME/data/media"
EOF
workon corespace
```

> База, статика и загруженные фото лежат в `~/data`, вне репозитория,
> поэтому `git pull` их не затрёт.

### 1.3. База и статика

```bash
cd ~/KirllAlexv/backend
python manage.py migrate
python manage.py collectstatic --noinput
python manage.py createsuperuser
```

Если хотите перенести текущие локальные данные, перед `migrate` скопируйте базу:
`cp ~/KirllAlexv/backend/db.sqlite3 ~/data/db.sqlite3`.

### 1.4. Веб-приложение

1. **Web → Add a new web app → Next → Manual configuration** → выберите ту же версию Python.
2. На странице приложения заполните:
   - **Source code:** `/home/LOGIN/KirllAlexv/backend`
   - **Working directory:** `/home/LOGIN/KirllAlexv/backend`
   - **Virtualenv:** `/home/LOGIN/.virtualenvs/corespace`
3. Откройте **WSGI configuration file** (ссылка на той же странице), удалите всё и вставьте:

```python
import os
import sys

path = '/home/LOGIN/KirllAlexv/backend'
if path not in sys.path:
    sys.path.insert(0, path)

os.environ['DJANGO_SETTINGS_MODULE'] = 'core.settings'
os.environ['DJANGO_DEBUG'] = 'False'
os.environ['DJANGO_SECRET_KEY'] = 'ВСТАВЬТЕ_КЛЮЧ'
os.environ['DJANGO_ALLOWED_HOSTS'] = 'LOGIN.pythonanywhere.com'
os.environ['DJANGO_FRONTEND_ORIGINS'] = 'https://FRONT'
os.environ['DJANGO_DB_PATH'] = '/home/LOGIN/data/db.sqlite3'
os.environ['DJANGO_STATIC_ROOT'] = '/home/LOGIN/data/staticfiles'
os.environ['DJANGO_MEDIA_ROOT'] = '/home/LOGIN/data/media'

from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
```

4. **Static files** — добавьте две строки:

| URL        | Directory                        |
|------------|----------------------------------|
| `/static/` | `/home/LOGIN/data/staticfiles`   |
| `/media/`  | `/home/LOGIN/data/media`         |

5. Включите **Force HTTPS** и нажмите **Reload**.
6. Проверка: <https://LOGIN.pythonanywhere.com/admin/> должна открыть админку со стилями.

> Бесплатное приложение нужно продлевать: раз в месяц зайдите во вкладку **Web**
> и нажмите **Run until 1 month from today**, иначе сайт отключится
> (за неделю до отключения PythonAnywhere присылает письмо).

---

## 2. Фронтенд (React + Vite) на Vercel

1. Зайдите на <https://vercel.com> через GitHub → **Add New → Project** → выберите репозиторий `KirllAlexv`.
2. **Root Directory:** `frontend` (фреймворк Vite определится сам, настройки сборки есть в `frontend/vercel.json`).
3. **Environment Variables:** `VITE_API_URL` = `https://LOGIN.pythonanywhere.com/api`
4. **Deploy**. Домен вида `FRONT.vercel.app` будет на странице проекта.
5. Если домен отличается от того, что вы указали в `DJANGO_FRONTEND_ORIGINS`,
   исправьте его в WSGI-файле и в `postactivate` на PythonAnywhere и нажмите **Reload**.

`vercel.json` перенаправляет все пути на `index.html`, поэтому прямые ссылки
(`/tasks`, приглашения `/tasks/workspaces/join/...`) открываются без 404.

> Запросы разрешены только с основного домена. Превью-сборки Vercel
> (`...-git-branch-....vercel.app`) получат ошибку CORS — это нормально.
> Нужен доступ и с них — добавьте их адреса в `DJANGO_FRONTEND_ORIGINS` через запятую.

---

## 3. Как выкладывать обновления

- **Фронтенд:** обновится сам после `git push` в `main`.
- **Бэкенд:** в Bash-консоли PythonAnywhere:

```bash
workon corespace
cd ~/KirllAlexv && git pull
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput
```

Затем **Web → Reload**.

---

## Локальная разработка

Ничего не меняется: без переменных окружения Django работает в режиме `DEBUG`
с базой `backend/db.sqlite3` и пускает запросы с `localhost:5173`.
