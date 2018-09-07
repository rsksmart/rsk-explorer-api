# Updates

## 0.3.x to 0.4.0

1. Backup db
  ```
  mongodump --db blockDB
  ```
2. Run db patches
  ```
  node dist/dbPatches/0.4.0.js
  ```
3. Start blocks service
4. Start api 