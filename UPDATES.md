# Updates

## 1.1.0


### 1. Backup database

```shell
mongodump --out=/<backup-folder> --db=<explorer-db-name>

```

see: [MongoDB Tools](https://docs.mongodb.com/manual/tutorial/backup-and-restore-tools/)

### 2. Import collections

Import these collections from backup to a new database:

- contractsVerifications
- verificationResults
- statsCollection

```shell

cd backup-folder/dbName
mongorestore --db=<new-explorer-db-name> --collection=contractsVerifications ./contractsVerifications.bson
mongorestore --db=<new-explorer-db-name> --collection=verificationResults ./verificationResults.bson
mongorestore --db=<new-explorer-db-name> --collection=statsCollection ./statsCollection.bson

```

### 3. Start explorer-api

- start blocks service
- start api
