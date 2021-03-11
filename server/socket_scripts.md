```bash
yarn wscat -c ws://localhost:3001 -H "Bearer <token>"
```

```json
{"action": "open_notebook", "data": {"nb_id": ""}}
{"action": "create_cell", "data": {"nb_id": "", "language": "python3"}}
{"action": "edit_cell", "data": {"nb_id": "", "cell_id": "", "contents": "exit(1)"}}
{"action": "lock_cell", "data": {"nb_id": "", "cell_id": ""}}
```

```json
{"action": "open_notebook", "data": {"nb_id": "bb49f1f8-975c-47d1-8a09-c5ba7a3ff755"}}
{"action": "create_cell", "data": {"nb_id": "bb49f1f8-975c-47d1-8a09-c5ba7a3ff755", "language": "python3"}}
{"action": "lock_cell", "data": {"nb_id": "bb49f1f8-975c-47d1-8a09-c5ba7a3ff755", "cell_id": "291220dc-ab64-43d9-be7f-d42987a2ad73"}}
{"action": "edit_cell", "data": {"nb_id": "bb49f1f8-975c-47d1-8a09-c5ba7a3ff755", "cell_id": "291220dc-ab64-43d9-be7f-d42987a2ad73", "contents": "exit(1)"}}
```