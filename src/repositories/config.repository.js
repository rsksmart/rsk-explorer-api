import { CONTRACT_VERIFIER_SOLC_VERSIONS_ID, EXPLORER_INITIAL_CONFIG_ID, EXPLORER_SETTINGS_ID } from '../lib/defaultConfig'

export function getConfigRepository (prismaClient) {
  return {
    [EXPLORER_SETTINGS_ID]: {
      get () {
        return prismaClient.explorer_settings.findFirst({ where: { id: EXPLORER_SETTINGS_ID } })
      },
      upsert ({ hash }) {
        return prismaClient.explorer_settings.upsert({
          where: { id: EXPLORER_SETTINGS_ID },
          create: { id: EXPLORER_SETTINGS_ID, hash },
          update: { hash }
        })
      }
    },
    [EXPLORER_INITIAL_CONFIG_ID]: {
      async get () {
        let initConfig = await prismaClient.explorer_initial_config.findFirst({ where: { id: EXPLORER_INITIAL_CONFIG_ID } })

        if (initConfig) {
          initConfig.nativeContracts = JSON.parse(initConfig.nativeContracts)
          initConfig.net = JSON.parse(initConfig.net)
        }

        return initConfig
      },
      save (initConfig) {
        return prismaClient.explorer_initial_config.create({
          data: {
            id: EXPLORER_INITIAL_CONFIG_ID,
            nativeContracts: JSON.stringify(initConfig.nativeContracts),
            net: JSON.stringify(initConfig.net)
          }
        })
      }
    },
    [CONTRACT_VERIFIER_SOLC_VERSIONS_ID]: {
      async get () {
        const res = await prismaClient.contract_verifier_solc_versions.findFirst({ where: { id: CONTRACT_VERIFIER_SOLC_VERSIONS_ID } })

        const versions = {
          builds: JSON.parse(res.builds),
          latestRelease: res.latestRelease,
          releases: JSON.parse(res.releases)
        }

        return versions
      },
      async upsert (versions) {
        return prismaClient.contract_verifier_solc_versions.upsert({
          where: { id: CONTRACT_VERIFIER_SOLC_VERSIONS_ID },
          create: {
            id: CONTRACT_VERIFIER_SOLC_VERSIONS_ID,
            builds: JSON.stringify(versions.builds),
            latestRelease: versions.latestRelease,
            releases: JSON.stringify(versions.releases)
          },
          update: {
            builds: JSON.stringify(versions.builds),
            latestRelease: versions.latestRelease,
            releases: JSON.stringify(versions.releases)
          }
        })
      }
    }
  }
}
