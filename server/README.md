## Local Setup

```bash
yarn
sls dynamodb install
```

## REST API

### GET /notebooks?uid={uid}

### POST /notebook?uid={uid}

body

```json
{
  "name": "string"
}
```

### POST /notebook/{nb_id}/share?uid={uid}

body

```json
{
  "uid": "string",
  "access_level": "string" // 'Full Access' | 'Read Only'
}
```