FROM python:3.10-slim

WORKDIR /app

# Копируем файлы зависимостей
COPY requirements.txt .

# Устанавливаем Python зависимости
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Копируем весь код проекта
COPY . .

# Устанавливаем переменные окружения
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app/backend:$PYTHONPATH
ENV PORT=8000

# Даем права на выполнение скрипта
RUN chmod +x run.sh 2>/dev/null || true

# Команда запуска - используем run.sh
CMD ["bash", "run.sh"]