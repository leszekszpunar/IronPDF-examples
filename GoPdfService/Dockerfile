FROM golang:1.21-alpine AS builder

WORKDIR /app

# Kopiuj go.mod
COPY go.mod ./

# Pobierz zależności i wygeneruj go.sum
RUN go mod download && go mod tidy

# Kopiuj kod aplikacji
COPY . .

# Zbuduj aplikację
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main .

# Final stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /root/

# Kopiuj binarkę z builder stage
COPY --from=builder /app/main .

# Eksponuj port
EXPOSE 5034

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5034/health || exit 1

# Uruchom aplikację
CMD ["./main"] 