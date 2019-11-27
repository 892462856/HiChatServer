const ws = require('nodejs-websocket')

let _receiver = () => 0
let _onConne = (userId) => true

const server = ws.createServer(function (conn)
{
  _onConne(conn.path.substr(1)).then(() =>
  {
    console.log(`new conn:${conn.path}`)
    conn.on('text', function (str)
    {
      _receiver(conn.path.substr(1), JSON.parse(str))
      console.log(`text:${str}`)
    })
    conn.on('close', function (code, reason)
    {
      console.log(`conn closed:${conn.path}`)
    })
    conn.on('error', function (error)
    {
      console.log(`conn error:${conn.path}`)
    })
  }).reject(() =>
  {
    conn.close(0, '')
    console.log(`unlogin:${conn.path}`)
  })
}) // .listen(8001)

const listen = function (port, onConne, receiver)
{
  _onConne = onConne
  _receiver = receiver
  server.listen(port)
}
const close = function (userId)
{
  const path = `/${userId}`
  const conns = server.connections.filter(t => t.path === path)
  if (conns.length > 0)
  {
    conns.forEach(conn =>
    {
      conn.close(0, '')
    })
  }
}
const isExist = function (userId)
{
  return server.connections.find(t => t.path === `/${userId}`)
}
const send = function (userId, message)
{
  const ids = `/${userId}`
  const conns = server.connections.filter(t => t.path === ids)
  if (conns.length > 0)
  {
    const tasks = conns.map(conn =>
    {
      return new Promise(function (resolve)
      {
        conn.sendText(JSON.stringify(message), resolve)
      })
    })
    return Promise.any(tasks)
  }
  else
  {
    return Promise.reject()
  }
}

exports.listen = listen
exports.close = close
exports.isExist = isExist
exports.send = send
exports.CreateGroupMessage = function (type, senderId, targetId, content)
{
  const message = {
    id: tools.uuid(),
    cid: tools.uuid(),
    type,
    senderId,
    targetId,
    targetType: 'group',
    content,
    callList: [],
    sentTime: Sequelize.NOW
  }
  return message
}