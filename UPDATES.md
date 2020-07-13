# Updates

## 1.1.0


### 1. Backup database

```shell
mongodump --out=/<backup-folder>

```

see: [MongoDB Tools](https://docs.mongodb.com/manual/tutorial/backup-and-restore-tools/)


### 2. Import collections

Import these collections from backup to a new database:

- contractsVerifications
- verificationResults
- statsCollection

```
cd backup-folder/dbName
mongorestore --db=contractsVerifications --collection=config ./contractsVerifications.bson
mongorestore --db=verificationResults --collection=config ./verificationResults.bson
mongorestore --db=statsCollection --collection=config ./statsCollection.bson

```

### 3. Start explorer-api

- start blocks service
- start api

