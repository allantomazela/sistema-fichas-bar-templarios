# Build Linux (Ubuntu 22.04) — gera .deb e AppImage com glibc estável
FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive \
    RUSTUP_HOME=/usr/local/rustup \
    CARGO_HOME=/usr/local/cargo \
    PATH=/usr/local/cargo/bin:/usr/local/bin:$PATH \
    CI=true \
    NO_STRIP=true

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl ca-certificates build-essential pkg-config \
    libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev \
    librsvg2-dev patchelf libssl-dev \
    file wget xdg-utils \
    libfuse2 \
  && rm -rf /var/lib/apt/lists/*

# Node.js 22 + pnpm
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
  && apt-get install -y --no-install-recommends nodejs \
  && corepack enable \
  && corepack prepare pnpm@10.28.1 --activate \
  && rm -rf /var/lib/apt/lists/*

# Rust stable
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable \
  && rustc --version && cargo --version

WORKDIR /app

# Script de entrada (o compose monta o projeto em /app)
COPY docker/entrypoint-linux-build.sh /usr/local/bin/entrypoint-linux-build.sh
RUN chmod +x /usr/local/bin/entrypoint-linux-build.sh

ENTRYPOINT ["/usr/local/bin/entrypoint-linux-build.sh"]
