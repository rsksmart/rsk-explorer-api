export async function connectToNode (nod3) {
  let retries = 3
  let connected
  try {
    while (retries) {
      connected = await nod3.isConnected()
      retries--
    }
  } catch (error) {
    console.log(error)
  }

  if (!connected) {
    throw new Error('Could not connect to node.')
  }
}
