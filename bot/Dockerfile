FROM golang:1.25-alpine AS build

WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/samdang-bot .

FROM alpine:3.22

WORKDIR /app
ENV PORT=8080

COPY --from=build /out/samdang-bot /app/samdang-bot

EXPOSE 8080
CMD ["/app/samdang-bot"]
