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

# Даем права на выполнение
RUN chmod +x run.sh start.py 2>/dev/null || true

# Expose port
EXPOSE 8000

# Команда запуска
CMD ["python", "start.py"]