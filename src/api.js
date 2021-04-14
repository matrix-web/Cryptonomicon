const API_KEY = '64a401a968a916af2db25d3d839922a052ca1945533a8788bba42cdd4895d8f3'

const tickersHandlers = new Map()
const socket = new WebSocket(`wss://streamer.cryptocompare.com/v2?api_key=${API_KEY}`)
const AGGREGATE_INDEX = "5"

export function getAvailableCoinList () {
  return fetch(`https://min-api.cryptocompare.com/data/blockchain/list?api_key=${API_KEY}`)
    .then(response => response.json())
    .then(coinList => Object.keys(coinList.Data))
}

function sendToWebSocket(message) {
  const stringifiedMessage = JSON.stringify(message)

  if (socket.readyState === WebSocket.OPEN) {
    socket.send(stringifiedMessage)
    return
  }

  socket.addEventListener('open', () => {
    socket.send(stringifiedMessage)
  }, { once: true })
}

function subscribeToTickerOnWS (ticker) {
  sendToWebSocket({
    action: "SubAdd",
    subs: [`5~CCCAGG~${ticker}~USD`]
  })
}

function unsubscribeFromTickerOnWS (ticker) {
  sendToWebSocket({
    action: "SubRemove",
    subs: [`5~CCCAGG~${ticker}~USD`]
  })
}

export const subscribeToTicker = (ticker, cb) => {
  const subscribers = tickersHandlers.get(ticker) || []
  tickersHandlers.set(ticker, [...subscribers, cb])

  subscribeToTickerOnWS(ticker)
}

export const unsubscribeFromTicker = (ticker, cb) => {
  const subscribers = tickersHandlers.get(ticker) || []
  tickersHandlers.set(ticker, subscribers.filter(fn => fn !== cb))
  unsubscribeFromTickerOnWS(ticker)
}

socket.addEventListener('message', event => {
  const {TYPE: type, FROMSYMBOL: currency, PRICE: newPrice} = JSON.parse(event.data)

  if (type !== AGGREGATE_INDEX || newPrice === undefined) {
    return
  }

  const handlers = tickersHandlers.get(currency) ?? []
  handlers.forEach(fn => fn(newPrice))
})