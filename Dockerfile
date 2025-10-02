FROM python:3.10-slim

WORKDIR /app

# Копируем файлы зависимостей
COPY requirements.txt .

# Устанавливаем Python зависимости
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Копируем код backend
COPY backend/ /app/

# Устанавливаем переменные окружения
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app:$PYTHONPATH

# Expose port
EXPOSE 8000

# Команда запуска (будет переопределена в docker-compose)
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]