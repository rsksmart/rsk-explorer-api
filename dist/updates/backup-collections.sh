#!/bin/bash
WORKDIR=/tmp
DIR=$( dirname "${BASH_SOURCE[0]}" )
dbName=$(node ${DIR}/getConfig.js dbName)
IFS=',' read -ra collections <<< $(node ${DIR}/getConfig.js collections)
newDbName=new${dbName}

show_help() {
    echo "Usage:"
    echo ""
    echo "`basename $0` [-d destinationDir] [-n newDBName]"
    echo ""
}

if [ "$1" == "-h" ] ; then
  show_help
  exit 0
fi

while getopts d:n: flag
do
    case "${flag}" in
        d) WORKDIR=${OPTARG};;
        n) newDbName=${OPTARG};;
    esac
done

BACKUPDIR=${WORKDIR}/${dbName}

RESTORE_SCRIPT=${WORKDIR}/restoreDB.sh
rm ${RESTORE_SCRIPT}
touch ${RESTORE_SCRIPT}

echo '#!/bin/bash' >> ${RESTORE_SCRIPT}
echo '# Target DB:' ${newDbName} >> ${RESTORE_SCRIPT}

mkdir -p ${BACKUPDIR}

for collection in "${collections[@]}"
do
  echo ""
  echo Creating backup of $collection on $BACKUPDIR
  echo ""
  FILE=${BACKUPDIR}/${collection}.gz
  mongodump --db=${dbName}  --gzip --archive=${FILE} --collection=${collection}
  echo mongorestore --gzip  --nsInclude="${dbName}.*" --archive=${FILE} --nsFrom="${dbName}.*" --nsTo="${newDbName}.*" >> ${RESTORE_SCRIPT}
done
echo ""
echo "DONE"
echo ""
echo Use ${RESTORE_SCRIPT} to restore collections
echo ""
echo '*********************************** WARNING ***********************************'
echo ""
echo              Check the target db name before running ${RESTORE_SCRIPT}
echo ""
echo '*******************************************************************************'
echo ""
echo 'cat' ${RESTORE_SCRIPT}:
echo ""
chmod +x ${RESTORE_SCRIPT}
cat ${RESTORE_SCRIPT}

