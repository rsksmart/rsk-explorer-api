# Updates

## 0.5.3

 1. Drop Database
 2. Start blocks service 

## 0.4.0 to 0.4.1

 1. Backup db
 2. Run db patches
  ```
  node dist/dbPatches/0.4.1/0.4.1-a.js
  node dist/dbPatches/0.4.1/0.4.1-b.js
  ```
3. Start blocks service
4. Start api 

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
