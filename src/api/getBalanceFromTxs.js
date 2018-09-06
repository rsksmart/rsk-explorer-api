import { BigNumber } from 'bignumber.js'

export const GetTxBalance = (Tx) => {
  function getTxs (query) {
    return Tx.db.find(query, {})
      .project({ value: 1 })
      .toArray()
      .then(data => { return data })
  }

  function sumValues (values) {
    let total = new BigNumber(0)
    values
      .map(v => v.value)
      .forEach(value => {
        total = total.plus(new BigNumber(value.value))
      })
    return total
  }

  async function getBalanceFromTx (address) {
    const to = await getTxs({ to: address })
    const fr = await getTxs({ from: address })
    return (sumValues(to).minus(sumValues(fr)))
  }
  return getBalanceFromTx
}
