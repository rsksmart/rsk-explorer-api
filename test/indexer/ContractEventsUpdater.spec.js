import { expect } from 'chai'
import sinon from 'sinon'
import ContractEventsUpdater from '../../src/services/classes/ContractEventsUpdater'

const TRANSFER_SINGLE_TOPIC0 = '0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62'
const TRANSFER_BATCH_TOPIC0 = '0x4a39dc06d4c0dbc64b70af90fd698a233a518aa5d07e595d983b8c0526c8f7fb'

const checksummedAddress = '0x11b64191106b1Cf66FCd2F8389077c596cDc5646'
const lowercaseAddress = checksummedAddress.toLowerCase()

const makeFakePrismaClient = () => ({
  event: { groupBy: sinon.stub() },
  contract_interface: { createMany: sinon.stub() },
  contract_method: { createMany: sinon.stub() },
  $transaction: sinon.stub()
})

describe('ContractEventsUpdater', () => {
  describe('findEventEmittersByTopic0', () => {
    it('rejects when no topic0s are provided', async () => {
      const updater = new ContractEventsUpdater({ prismaClient: makeFakePrismaClient() })
      for (const badInput of [undefined, [], 'not-an-array']) {
        let error
        try {
          await updater.findEventEmittersByTopic0(badInput)
        } catch (err) {
          error = err
        }
        expect(error, `input: ${JSON.stringify(badInput)}`).to.be.an('error')
      }
    })

    it('groups events by address and returns the distinct emitters', async () => {
      const prismaClient = makeFakePrismaClient()
      prismaClient.event.groupBy.resolves([
        { address: '0xb8ef8a681c00d41cc0ca6e64b7415b020a6a206a' },
        { address: lowercaseAddress }
      ])
      const updater = new ContractEventsUpdater({ prismaClient })

      const topic0s = [TRANSFER_SINGLE_TOPIC0, TRANSFER_BATCH_TOPIC0]
      const emitters = await updater.findEventEmittersByTopic0(topic0s)

      expect(prismaClient.event.groupBy.calledOnce).to.equal(true)
      expect(prismaClient.event.groupBy.firstCall.args[0]).to.deep.equal({
        by: ['address'],
        where: { topic0: { in: topic0s } },
        orderBy: { address: 'asc' }
      })
      expect(emitters).to.deep.equal([
        '0xb8ef8a681c00d41cc0ca6e64b7415b020a6a206a',
        lowercaseAddress
      ])
    })
  })

  describe('saveContractDetails', () => {
    it('rejects invalid contract addresses', async () => {
      const prismaClient = makeFakePrismaClient()
      const updater = new ContractEventsUpdater({ prismaClient })
      for (const badAddress of [undefined, '', '0x123', 'not-an-address']) {
        let error
        try {
          await updater.saveContractDetails(badAddress, { interfaces: ['ERC1155'] })
        } catch (err) {
          error = err
        }
        expect(error, `address: ${JSON.stringify(badAddress)}`).to.be.an('error')
      }
      expect(prismaClient.$transaction.called).to.equal(false)
    })

    it('persists interfaces and methods lowercased, skipping duplicates, and returns the created row count', async () => {
      const prismaClient = makeFakePrismaClient()
      prismaClient.contract_interface.createMany.returns({ query: 'interfaces' })
      prismaClient.contract_method.createMany.returns({ query: 'methods' })
      prismaClient.$transaction.resolves([{ count: 2 }, { count: 3 }])
      const updater = new ContractEventsUpdater({ prismaClient })

      const saved = await updater.saveContractDetails(checksummedAddress, {
        interfaces: ['ERC1155', 'ERC1155MetadataURI'],
        methods: ['uri(uint256)', 'balanceOf(address,uint256)', 'balanceOfBatch(address[],uint256[])']
      })

      expect(prismaClient.contract_interface.createMany.firstCall.args[0]).to.deep.equal({
        data: [
          { interface: 'ERC1155', contractAddress: lowercaseAddress },
          { interface: 'ERC1155MetadataURI', contractAddress: lowercaseAddress }
        ],
        skipDuplicates: true
      })
      expect(prismaClient.contract_method.createMany.firstCall.args[0]).to.deep.equal({
        data: [
          { method: 'uri(uint256)', contractAddress: lowercaseAddress },
          { method: 'balanceOf(address,uint256)', contractAddress: lowercaseAddress },
          { method: 'balanceOfBatch(address[],uint256[])', contractAddress: lowercaseAddress }
        ],
        skipDuplicates: true
      })
      expect(prismaClient.$transaction.firstCall.args[0]).to.deep.equal([{ query: 'interfaces' }, { query: 'methods' }])
      expect(saved).to.equal(5)
    })

    it('runs an empty transaction and reports zero rows when there is nothing to persist', async () => {
      const prismaClient = makeFakePrismaClient()
      prismaClient.$transaction.resolves([])
      const updater = new ContractEventsUpdater({ prismaClient })

      const saved = await updater.saveContractDetails(checksummedAddress, {})

      expect(prismaClient.contract_interface.createMany.called).to.equal(false)
      expect(prismaClient.contract_method.createMany.called).to.equal(false)
      expect(prismaClient.$transaction.firstCall.args[0]).to.deep.equal([])
      expect(saved).to.equal(0)
    })
  })
})
