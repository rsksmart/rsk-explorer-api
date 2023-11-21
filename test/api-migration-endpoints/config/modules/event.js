const endpoints = {
  getEvent: ({ eventId }) => `/api?module=events&action=getEvent&eventId=${eventId}`,
  getEventsByAddress: ({ address, signatures, contract }) => {
    return `/api?module=events&action=getEventsByAddress&address=${address}${signatures ? `&signatures=${signatures}` : ''}${contract ? `&contract=${contract}` : ''}`
  },
  getAllEventsByAddress: ({ address }) => `/api?module=events&action=getAllEventsByAddress&address=${address}`
}

const fixtures = {
  testnet: {
    eventIdsForGetEventEndpoint: [
      '03e8fa5001000ca56137e756e34a2fcc',
      '02dc6d00050007b49b09e024ace751aa',
      '02dc6c60020002adaf9d4cfde48963b1'
    ],
    addressesForGetEventsByAddressEndpoint: [
      '0x6aff5f3d80744d84a4e4033b27de2ac1d6a49f34',
      '0xdabadabadabadabadabadabadabadabadaba0003',
      '0x1fab9a0e24ffc209b01faa5a61ad4366982d0b7f'
    ],
    addressesForGetAllEventsByAddressEndpoint: [
      '0x6aff5f3d80744d84a4e4033b27de2ac1d6a49f34',
      '0xdabadabadabadabadabadabadabadabadaba0003',
      '0x1fab9a0e24ffc209b01faa5a61ad4366982d0b7f'
    ]
  },
  mainnet: {}
}

export {
  endpoints,
  fixtures
}
