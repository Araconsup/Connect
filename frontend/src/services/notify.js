let handler = null

export function setNotifyHandler(fn) {
  handler = fn
}

export function notify(message, type = 'info') {
  if (handler) handler({ message, type })
}

export default { setNotifyHandler, notify }
