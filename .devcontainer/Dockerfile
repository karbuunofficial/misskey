FROM mcr.microsoft.com/devcontainers/javascript-node:4.0.3-24-trixie

# AMIXOF: media processing (video thumbnails / transcoding / media tests)
# requires FFmpeg, and .devcontainer/init.sh provisions the application
# database with the PostgreSQL client. Node.js / pnpm versions are pinned by
# the devcontainer features in devcontainer.json, not by this image.
RUN apt-get update \
	&& apt-get install -y --no-install-recommends ffmpeg postgresql-client \
	&& rm -rf /var/lib/apt/lists/*
