# ---- builder ----
FROM rust:1-bookworm AS builder
WORKDIR /app

# Build dependencies first for better layer caching.
COPY Cargo.toml Cargo.lock ./
COPY crates ./crates
RUN cargo build --release -p server

# ---- runtime ----
FROM debian:bookworm-slim AS runtime
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY --from=builder /app/target/release/admin-backend /usr/local/bin/admin-backend
COPY config ./config
COPY rbac_model.conf ./rbac_model.conf

ENV RUN_MODE=production
EXPOSE 8080
CMD ["admin-backend"]
