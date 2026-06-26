FROM golang:1.25-alpine AS build

WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/front-handler .

FROM alpine:3.22

WORKDIR /app
ENV FRONT_HANDLER_PORT=8082

COPY --from=build /out/front-handler /app/front-handler

EXPOSE 8082
CMD ["/app/front-handler"]
