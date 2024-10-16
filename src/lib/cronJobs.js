import { CronJob } from 'cron'
import { prismaClient } from './prismaClient'
import Logger from './Logger'

/*
Supported Ranges

* means not specified (i.e. any value)

field:             minute    hour    day of month    month    day of week
allowed values:    0-59      0-23    1-31            1-12     0-7

For day of week, both 0 and 7 are considered Sunday
In case of month and day of week, names can be used. Name examples: "mon,WED,fri", "JAN,mar".

Schedule examples:

* * * * * = every minute

0 * * * * = every hour
1 * * * * = every hour at minute 1

0 0 * * * = every day at midnight
0 1 * * * = every day at 1:00 AM

0 0 1 * * = the first day of every month at midnight

0 0 * * 0 = every Sunday at midnight
0 0 * * 7 = every Sunday at midnight
0 0 * * SUN = every Sunday at midnight

Check cron docs for more info: https://www.npmjs.com/package/cron
*/

const cronsConfig = {
  timeZone: 'UTC-0',
  schedules: {
    everySecond: {
      value: '* * * * * *',
      description: 'every second'
    },
    everyFiveSeconds: {
      value: '*/5 * * * * *',
      description: 'every five seconds'
    },
    everyMinute: {
      value: '* * * * *',
      description: 'every minute'
    },
    hourly: {
      value: '0 * * * *',
      description: 'every hour'
    },
    dailyMidnight: {
      value: '0 0 * * *',
      description: 'every day at midnight'
    },
    daily3_00AM: {
      value: '0 3 * * *',
      description: 'every day at 3:00 AM'
    },
    daily3_05AM: {
      value: '5 3 * * *',
      description: 'every day at 3:05 AM'
    },
    daily3_10AM: {
      value: '10 3 * * *',
      description: 'every day at 3:10 AM'
    },
    daily3_15AM: {
      value: '15 3 * * *',
      description: 'every day at 3:15 AM'
    }
  }
}

function createCronJob ({ schedule, action }) {
  if (!schedule || !schedule.value || !action) throw new Error('Invalid cron job configuration')
  if (typeof action !== 'function') throw new Error('Cron job action must be a function')

  return CronJob.from({
    cronTime: schedule.value,
    onTick: action,
    timeZone: cronsConfig.timeZone
  })
}

// Daily gas fees updater
function dailyGasFeesUpdater () {
  const name = 'daily-gas-fees-updater'
  const log = Logger(`[${name}]`)
  const schedule = cronsConfig.schedules.daily3_00AM
  const action = async () => {
    try {
      log.info(`Started at ${new Date().toISOString()} (${cronsConfig.timeZone}). Job Schedule: ${schedule.value} (${schedule.description})`)
      log.info(`Updating daily gas fees...`)

      const started = Date.now()
      await prismaClient.$executeRaw`
        INSERT INTO bo_gas_fee_daily_aggregated (date_1, gas_fee)
        SELECT
            datetime::date AS date_1,
            SUM(gas_price::bigint * 1.0 * 10^(-18) * gas_used) AS gas_fee
        FROM
            "transaction"
        WHERE datetime >= NOW()::date - INTERVAL '1 day'
        GROUP BY
            datetime::date
        ON CONFLICT (date_1)
        DO UPDATE SET gas_fee = EXCLUDED.gas_fee;
      `
      log.info(`Daily gas fees updated (${Date.now() - started} ms)`)
      log.info(`Finished at ${new Date().toISOString()} (${cronsConfig.timeZone})`)
    } catch (error) {
      log.error(`Error updating daily gas fees: ${error.message}`)
      log.error(error.stack)
    }
  }
  const cronJob = createCronJob({ schedule, action })

  return {
    schedule,
    name,
    cronJob,
    start: () => cronJob.start()
  }
}

// New Addresses updater
function newAddressesUpdater () {
  const name = 'new-addresses-updater'
  const log = Logger(`[${name}]`)
  const schedule = cronsConfig.schedules.daily3_05AM
  const action = async () => {
    try {
      log.info(`Started at ${new Date().toISOString()} (${cronsConfig.timeZone}). Job Schedule: ${schedule.value} (${schedule.description})`)
      log.info(`Updating new addresses...`)

      const started = Date.now()
      await prismaClient.$executeRaw`
        WITH new_addresses AS (
          -- Select 'from' addresses for the last day, ignoring nulls
          SELECT datetime::date AS transaction_date, "from" AS address
          FROM transaction
          WHERE datetime::date = CURRENT_DATE - INTERVAL '1 day'
            AND "from" IS NOT NULL
          UNION ALL
          -- Select 'to' addresses for the last day, ignoring nulls
          SELECT datetime::date AS transaction_date, "to" AS address
          FROM transaction
          WHERE datetime::date = CURRENT_DATE - INTERVAL '1 day'
            AND "to" IS NOT NULL
        )
        INSERT INTO bo_new_addresses (address, first_transaction_date)
        SELECT
            address,
            MIN(transaction_date) AS first_transaction_date
        FROM
            new_addresses
        GROUP BY
            address
        ON CONFLICT (address)
        DO NOTHING;
      `

      log.info(`New addresses updated (${Date.now() - started} ms)`)
      log.info(`Finished at ${new Date().toISOString()} (${cronsConfig.timeZone})`)
    } catch (error) {
      log.error(`Error updating new addresses: ${error.message}`)
      log.error(error.stack)
    }
  }
  const cronJob = createCronJob({ schedule, action })

  return {
    schedule,
    name,
    cronJob,
    start: () => cronJob.start()
  }
}

// Daily active addresses updater
function dailyActiveAddressesUpdater () {
  const name = 'daily-active-addresses'
  const log = Logger(`[${name}]`)
  const schedule = cronsConfig.schedules.daily3_10AM
  const action = async () => {
    try {
      log.info(`Started at ${new Date().toISOString()} (${cronsConfig.timeZone}). Job Schedule: ${schedule.value} (${schedule.description})`)
      log.info(`Updating daily active addresses...`)

      const started = Date.now()
      await prismaClient.$executeRaw`
        INSERT INTO bo_active_addresses_daily_aggregated (date_1, active_addresses)
        SELECT
            datetime::date AS date_1,
            COUNT(DISTINCT t."from") AS active_addresses
        FROM
            transaction t
        WHERE
            t.tx_type != 'remasc'
            AND datetime >= NOW()::date - INTERVAL '1 day'
        GROUP BY
            datetime::date
        ON CONFLICT (date_1)
        DO UPDATE SET active_addresses = EXCLUDED.active_addresses;
      `

      log.info(`Daily active addresses updated (${Date.now() - started} ms)`)
      log.info(`Finished at ${new Date().toISOString()} (${cronsConfig.timeZone})`)
    } catch (error) {
      log.error(`Error updating daily active addresses: ${error.message}`)
      log.error(error.stack)
    }
  }
  const cronJob = createCronJob({ schedule, action })

  return {
    schedule,
    name,
    cronJob,
    start: () => cronJob.start()
  }
}

// Daily number of transactions updater
function dailyNumberOfTransactionsUpdater () {
  const name = 'daily-number-of-transactions'
  const log = Logger(`[${name}]`)
  const schedule = cronsConfig.schedules.daily3_15AM
  const action = async () => {
    try {
      log.info(`Started at ${new Date().toISOString()} (${cronsConfig.timeZone}). Job Schedule: ${schedule.value} (${schedule.description})`)
      log.info(`Updating daily number of transactions...`)

      const started = Date.now()
      await prismaClient.$executeRaw`
        INSERT INTO bo_number_transactions_daily_aggregated (date_1, number_of_transactions)
        SELECT
            datetime::date AS date_1,
            count(distinct(t."hash")) AS number_of_transactions
        FROM transaction t
        WHERE t.tx_type != 'remasc'
        AND datetime >= NOW()::date - INTERVAL '1 day'
        GROUP BY datetime::date
        ON CONFLICT (date_1)
        DO UPDATE SET number_of_transactions = EXCLUDED.number_of_transactions;
      `

      log.info(`Daily number of transactions updated (${Date.now() - started} ms)`)
      log.info(`Finished at ${new Date().toISOString()} (${cronsConfig.timeZone})`)
    } catch (error) {
      log.error(`Error updating daily number of transactions: ${error.message}`)
      log.error(error.stack)
    }
  }
  const cronJob = createCronJob({ schedule, action })

  return {
    schedule,
    name,
    cronJob,
    start: () => cronJob.start()
  }
}

const cronJobs = {
  dailyGasFeesUpdater: dailyGasFeesUpdater(),
  newAddressesUpdater: newAddressesUpdater(),
  dailyActiveAddressesUpdater: dailyActiveAddressesUpdater(),
  dailyNumberOfTransactionsUpdater: dailyNumberOfTransactionsUpdater()
}

export function startCronJobs ({ log = Logger('[CronJobs]') } = {}) {
  log.info(`Executing cron jobs using default timezone ${cronsConfig.timeZone}`)

  for (const cronJob of Object.values(cronJobs)) {
    try {
      log.info(`Starting cronjob "${cronJob.name}" with schedule ${cronJob.schedule.value} (${cronJob.schedule.description})`)
      cronJob.start()
    } catch (error) {
      log.error(`Error executing cron job: ${error.message}`)
      log.error(error.stack)
    }
  }
}
