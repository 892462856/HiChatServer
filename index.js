const express = require('express')
const bodyParser = require('body-parser')
const cookieSession = require('cookie-session')
const socket = require('./socket')
const tools = require('./tools')

const app = express()
app.use(bodyParser.urlencoded({ extended: false })) // parse application/x-www-form-urlencoded
app.use(bodyParser.json()) // parse application/json

app.use(cookieSession({
  name: 'session',
  keys: ['aq(fq2@32Gd*23', 'T$@%dd9ssfsd5'],
  maxAge: 0.5 * 60 * 60 * 1000 // 0.5 hours
}))

const dal = require('./DAL/dataAccessor').create(false)

const friendMsgHandler = function (message)
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

const groupMsgHandler = function (message)
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

// //设置跨域访问
// app.all('*', (req, res, next) =>
// {
//   res.header('Access-Control-Allow-Origin', '*')
//   res.header('Access-Control-Allow-Headers', 'X-Requested-With')
//   res.header('Access-Control-Allow-Methods', 'PUT,POST,GET,DELETE,OPTIONS')
//   res.header('X-Powered-By', ' 3.2.1')
//   res.header('Content-Type', 'application/json;charset=utf-8')
//   next()
// })

app.get('/', (req, res) => res.send('Hello World!'))
app.get('/login', (req, res) =>
{
  const { mobile, password } = req.query
  dal.User.getByPWD(mobile, password).then(user =>
  {
    req.session.userId = user.id
    res.send(user)
  })
})
app.use(function (req, res, next)
{
  if (req.session.userId)
  {
    // login verify
  }
  next()
})
app.get('/reg', (req, res, next) =>
{
  const { name, ico, mobile, password } = req.query
  dal.User.add({ name, ico, mobile, password }).then(user =>
  {
    res.send(user)
  }).catch(next)
})

const routerUser = express.Router()
const routerFriend = express.Router()
const routerGroup = express.Router()
const routerGroupMember = express.Router()

routerUser.get('/byMobile', function (req, res)
{
  const { mobile } = req.query
  dal.User.getByMobile(mobile).then(user =>
  {
    res.send(user)
  })
})
routerFriend.put('/make', function (req, res)
{
  const userId = req.session.userId
  const { friendId } = req.body
  Promise.all(dal.Friend.add(userId, friendId), dal.Friend.add(friendId, userId)).then(([friend]) =>
  {
    res.send(friend)
  }).catch(next)
})
routerFriend.put(function (req, res)
{
  const userId = req.session.userId
  const { friendId } = req.body
  dal.Friend.updateIsBlacked(userId, friendId, false).then(() =>
  {
    res.send(null)
  })
})
routerFriend.delete(function (req, res)
{
  const userId = req.session.userId
  const { friendId } = req.body
  dal.Friend.updateIsBlacked(userId, friendId, true).then(() =>
  {
    res.send(null)
  })
})
routerGroup.put(function (req, res)
{
  const userId = req.session.userId
  const { name, membersId } = req.body
  const id = tools.uuid()
  dal.Group.add({ id, name, ico: 'group.png' })
    .then(group => Promise.all(group, dal.GroupMember.add(group.id, userId, true, true), dal.GroupMember.addMulti(group.id, membersId)))
    .then(([group, user, users]) =>
    {
      const content = `欢迎${users.map(t => t.name).join(',')}加入群`
      const message = socket.CreateGroupMessage('sys', user.id, group.id, content)
      setTimeout(() =>
      {
        groupMsgHandler(message)
      }, 1000)

      res.send(group)
    })
    .catch(next)
})
routerGroupMember.put(function (req, res)
{
  const userId = req.session.userId
  const { groupId, membersId } = req.body
  dal.GroupMember.addMulti(groupId, membersId).then(users =>
  {
    const content = `欢迎${users.map(t => t.name).join(',')}加入群`
    const message = socket.CreateGroupMessage('sys', userId, groupId, content)
    setTimeout(() =>
    {
      groupMsgHandler(message)
    }, 1000)

    res.send(users)
  })
})
routerGroupMember.delete(function (req, res)
{
  const { groupId, membersId } = req.body
  dal.GroupMember.delete(groupId, membersId).then(user =>
  {
    const content = `${users.map(t => t.name).join(',')} 被移出群`
    const message = socket.CreateGroupMessage('sys', userId, groupId, content)
    setTimeout(() =>
    {
      groupMsgHandler(message)
    }, 1000)

    res.send(null)
  })
})

app.route('/user', routerUser)
app.route('/friend', routerFriend)
app.route('/group', routerGroup)
app.route('/groupMember', routerGroupMember)
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