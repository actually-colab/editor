```bash
yarn wscat -c ws://localhost:3001 -H "Bearer <token>"
```

```json
{"action": "open_notebook", "data": {"nb_id": ""}}
{"action": "create_cell", "data": {"nb_id": "", "language": "python3"}}
{"action": "edit_cell", "data": {"nb_id": "", "cell_id": "", "contents": "exit(1)"}}
{"action": "lock_cell", "data": {"nb_id": "", "cell_id": ""}}
{"action": "unlock_cell", "data": {"nb_id": "", "cell_id": ""}}
```

```json
{"action": "open_notebook", "data": {"nb_id": "bb49f1f8-975c-47d1-8a09-c5ba7a3ff755"}}
{"action": "create_cell", "data": {"nb_id": "bb49f1f8-975c-47d1-8a09-c5ba7a3ff755", "language": "python3"}}
{"action": "lock_cell", "data": {"nb_id": "bb49f1f8-975c-47d1-8a09-c5ba7a3ff755", "cell_id": "2e233097-3fb0-48b0-823c-a5b49ef5c008"}}
{"action": "edit_cell", "data": {"nb_id": "bb49f1f8-975c-47d1-8a09-c5ba7a3ff755", "cell_id": "2e233097-3fb0-48b0-823c-a5b49ef5c008", "contents": "exit(1)"}}
{"action": "unlock_cell", "data": {"nb_id": "bb49f1f8-975c-47d1-8a09-c5ba7a3ff755", "cell_id": "2e233097-3fb0-48b0-823c-a5b49ef5c008"}}
```