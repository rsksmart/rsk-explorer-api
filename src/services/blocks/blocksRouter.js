import { createRouter, services } from '../serviceFactory'

const serviceConfig = services.ROUTER

async function main () {
  try {
    const { router, startService } = await createRouter(serviceConfig, { services })
    await startService()
    router.start()
  } catch (err) {
    console.error(err)
    process.exit(9)
  }
}

main()
