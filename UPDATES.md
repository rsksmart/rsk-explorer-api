# Updates

## 1.1.5 to 1.1.6

This release contains a db patch.

### 1 - Update rsk-explorer-api code

  ```shell
  git checkout 1.1.6
  ```

### 2 - Update dependencies

```shell
rm -rf node_modules
npm install
```

### 3 - Apply db patch

``` shell
node dist/dbPatches/tokenData.js

```

## Requisites

 [MongoDB Tools](https://docs.mongodb.com/manual/tutorial/backup-and-restore-tools/)

### 1. Backup database

``` shell
  
  cd rsk-explorer-api
  chmod +x ./dist/updates/backup-collections.sh
  ./dist/updates/backup-collections.sh -h

```

Example:

``` shell
./dist/updates/backup-collections.sh -d /tmp/explorer-back -n newExplorerDB
```

**Note:** backup-collections.sh gets the DB information from the config.json file.

### 2. Restore collections to a new DB

  Follow the instructions provided by backup-collections.sh
  Update the db.dbName field in config.json to use the new DB.

### 3. Update dependencies  

```shell
cd rsk-explorer-api
rm -rf node_modules
npm install
```

### 4. Start explorer-api

- start blocks services
- start api
