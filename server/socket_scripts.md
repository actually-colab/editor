```bash
yarn wscat -c ws://localhost:3001 -H "Bearer <token>"
```

```json
{"action": "open_notebook", "data": {"nb_id": ""}}
{"action": "create_cell", "data": {"nb_id": "", "language": "python"}}
{"action": "edit_cell", "data": {"nb_id": "", "cell_id": "", "cellData": {"contents": "", "language": "markdown", "cursor_pos": 0}}
{"action": "lock_cell", "data": {"nb_id": "", "cell_id": ""}}
{"action": "unlock_cell", "data": {"nb_id": "", "cell_id": ""}}
```

```json
{"action": "open_notebook", "data": {"nb_id": "805d4aef-f78a-4519-a546-aaed09586666"}}
{"action": "create_cell", "data": {"nb_id": "805d4aef-f78a-4519-a546-aaed09586666", "language": "python"}}
{"action": "lock_cell", "data": {"nb_id": "805d4aef-f78a-4519-a546-aaed09586666", "cell_id": "4565720b-d243-48a9-8e4b-33971289e135"}}
{"action": "edit_cell", "data": {"nb_id": "805d4aef-f78a-4519-a546-aaed09586666", "cell_id": "4565720b-d243-48a9-8e4b-33971289e135", "cellData": {"contents": "test", "language": "markdown", "cursor_pos": 1}}}
{"action": "unlock_cell", "data": {"nb_id": "805d4aef-f78a-4519-a546-aaed09586666", "cell_id": "4565720b-d243-48a9-8e4b-33971289e135"}}
```
