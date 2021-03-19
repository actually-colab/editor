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

## Adhoc WebSocket API Testing

1.) Get a session token from `POST /login`

2.) Establish connection

```bash
yarn wscat -c ws://localhost:3001 -H "Bearer <token>"
```

3.) Send any of the following messages with corresponding schemas

*More detailed usage can be found in the API client

```json
{"action": "open_notebook", "data": {"nb_id": ""}}
{"action": "create_cell", "data": {"nb_id": "", "language": "python"}}
{"action": "edit_cell", "data": {"nb_id": "", "cell_id": "", "contents": "exit(1)"}}
{"action": "lock_cell", "data": {"nb_id": "", "cell_id": ""}}
{"action": "unlock_cell", "data": {"nb_id": "", "cell_id": ""}}
```
