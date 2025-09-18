#!/bin/bash

# Загружаем токен из .env файла
source .env

if [ -z "$GITHUB_TOKEN" ]; then
    echo "❌ Ошибка: GITHUB_TOKEN не найден в .env файле"
    exit 1
fi

# Временно устанавливаем URL с токеном
git remote set-url origin https://Bulllgakov:$GITHUB_TOKEN@github.com/Bulllgakov/trenergram.git

# Выполняем push
echo "📤 Отправка изменений на GitHub..."
git push

# Сразу удаляем токен из URL для безопасности
git remote set-url origin https://github.com/Bulllgakov/trenergram.git

echo "✅ Готово! Изменения отправлены."