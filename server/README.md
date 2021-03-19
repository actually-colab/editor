# Actually Colab Editor Server

The REST and WebSocket API for Actually Colab.

## Setup

1.) Create a `.env` file with the following vars defined

```bash
GOOGLE_AUTH_WEB_CLIENT_ID="<from google auth console>"
GOOGLE_AUTH_WEB_CLIENT_SECRET="<from google auth console>"
PROD_AUTH_SECRET="<anything random>"
```

2.) Install docker & docker-compose to your system

3.) Install dependencies

```bash
yarn install
```

4.) Run the dev environment locally

```bash
yarn start
```