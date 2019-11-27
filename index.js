const tools = require('./tools')
const socket = require('./socket')
const express = require('express')
const app = express()

const dal = require('./DAL/dataAccessor')
dal.create(false)

app.get('/', (req, res) =>
{
  res.send('Hello World!')
  // dal.User.get(2).then(user =>
  // {
  //   res.send(user.createdAt)
  // })
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