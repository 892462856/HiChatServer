const tools = require('./tools')
const socket = require('./socket')
const express = require('express')
const bodyParser = require('body-parser')

const app = express()
app.use(bodyParser.urlencoded({ extended: false })) // parse application/x-www-form-urlencoded
app.use(bodyParser.json()) // parse application/json

const dal = require('./DAL/dataAccessor').create(false)

app.get('/', (req, res) =>
{
  res.send('Hello World!')
  // dal.User.get(2).then(user =>
  // {
  //   res.send(user.createdAt)
  // })
})

app.get('/login', (req, res) =>
{
  const { mobile, password } = req.body
  dal.User.getByPWD(mobile, password).then(user =>
  {
    res.send(user)
  })
})
app.get('/reg', (req, res, next) =>
{
  const { name, ico, mobile, password } = req.query
  dal.User.add({ name, ico, mobile, password }).then(user =>
  {
    res.send(user)
  }).catch(next)
})

app.use(function (error, req, res, next)
{
  // console.log(error.code, error.message)
  res.status(500).send({ code: error.code, messge: error.message })
  // next(error)
})

app.listen(3000, () =>
{
  console.log('Example app listening on port 3000!')
})

const friendMsgHandler = function (userId, message)
{
  socket.send(message.targetId, message).then(() =>
  {
    message.receiveTime = Sequelize.NOW
    dal.FriendMessage.add(message)
  }).catch(() =>
  {
    dal.FriendMessage.add(message)
  })
}

const groupMsgHandler = function (userId, message)
{
  dal.GroupMessage.add(message)
    .then(() => dal.GroupMember.getSimpleList(message.targetId))
    .then(members =>
    {
      members.forEach(member =>
      {
        socket.send(member.userId, message).then(() =>
        {
          dal.GroupMessage.updateReceiveTime(message.targetId, member.userId)
        })
      })
    })
}

const sendUnreadFreindMessags = function (userId)
{
  dal.FriendMessage.getUnreceiveList(userId).then(list =>
  {
    list.forEach(msg =>
    {
      socket.send(userId, msg).then(() =>
      {
        dal.FriendMessage.updateReceiveTime(msg.id)
      })
    })
  })
}

const sendUnreadGroupMessags = function (userId)
{
  dal.GroupMember.getSimpleListBy(userId).then(groups =>
  {
    groups.forEach(({ groupId }) =>
    {
      dal.GroupMessage.getUnreceiveList(groupId, userId).then(list =>
      {
        socket.send(userId, list).then(() =>
        {
          dal.GroupMessage.updateReceiveTime(groupId, userId)
        }) // 批量发 [message,message]

        // list.forEach(msg =>
        // {
        //   socket.send(userId, msg).then(() =>
        //   {
        //     dal.GroupMessage.updateReceiveTime(groupId, userId)
        //   })
        // })
      })
    })
  })
}

socket.listen(8001, userId =>
{
  // return false if unlogin
  sendUnreadFreindMessags(userId)
  sendUnreadGroupMessags(userId)
  return Promise.resolve()
}, (userId, message) =>
{
  message.id = tools.uuid()
  message.senderId = userId
  message.sentTime = Sequelize.NOW

  if (message.targetType === 'friend') friendMsgHandler(message)
  if (message.targetType === 'group') groupMsgHandler(message)
})