FROM python:3.11-slim

WORKDIR /app

# Zainstaluj biblioteki systemowe wymagane przez OpenCV
RUN apt-get update && apt-get install -y \
  libgl1-mesa-glx \
  libglib2.0-0 \
  libsm6 \
  libxext6 \
  libxrender-dev \
  libgomp1 \
  libgthread-2.0-0 \
  && rm -rf /var/lib/apt/lists/*

# Kopiuj pliki zależności
COPY requirements.txt .

# Zainstaluj zależności
RUN pip install --no-cache-dir -r requirements.txt

# Kopiuj kod aplikacji
COPY . .

# Utwórz katalog tymczasowy
RUN mkdir -p /tmp

# Ustaw zmienne środowiskowe
ENV FLASK_APP=app.py
ENV FLASK_ENV=production

# Otwórz port
EXPOSE 5032

# Uruchom aplikację
CMD ["python", "app.py"] 