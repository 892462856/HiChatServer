const Sequelize = require('sequelize')

const sequelize = new Sequelize('HiChat', 'sa', '123456', {
  host: 'localhost',
  dialect: 'sqlite',
  pool: {
    max: 5,
    min: 0,
    idle: 10000
  },

  storage: 'C:/Projects/HichatServerDatabase/HiChat.sqlite' // 仅 SQLite 适用
})

exports.create = function ()
{
  const User = sequelize.define('User', {
    id: {
      type: Sequelize.UUID,
      primaryKey: true
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false
    },
    password: {
      type: Sequelize.STRING,
      allowNull: false
    },
    mobile: {
      type: Sequelize.STRING,
      allowNull: false
    },
    ico: {
      type: Sequelize.STRING,
      allowNull: false
    }
  }, {
    freezeTableName: true // Model 对应的表名将与model名相同
  })

  const Friend = sequelize.define('Friend', {
    userId: {
      type: Sequelize.UUID,
      primaryKey: true
    },
    friendId: {
      type: Sequelize.UUID,
      primaryKey: true
    },
    isBlacked: {
      type: Sequelize.STRING,
      allowNull: false
    }
  }, {
    freezeTableName: true // Model 对应的表名将与model名相同
  })

  const Group = sequelize.define('Group', {
    id: {
      type: Sequelize.UUID,
      primaryKey: true
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false
    },
    ico: {
      type: Sequelize.STRING,
      allowNull: false
    },
    isDeleted: {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    },
    messageReadInfo: {
      type: Sequelize.TEXT
    }  // messageReadInfo={memberId:datetime}
  }, {
    freezeTableName: true // Model 对应的表名将与model名相同
  })

  const GroupMember = sequelize.define('GroupMember', {
    groupId: {
      type: Sequelize.UUID,
      primaryKey: true
    },
    userId: {
      type: Sequelize.UUID,
      primaryKey: true
    },
    userName: {
      type: Sequelize.STRING
    },
    isOwner: {
      type: Sequelize.BOOLEAN,
      allowNull: false
    },
    isAdmin: {
      type: Sequelize.BOOLEAN,
      allowNull: false
    }
  }, {
    freezeTableName: true // Model 对应的表名将与model名相同
  })

  const Message = sequelize.define('Message', {
    id: {
      type: Sequelize.UUID,
      primaryKey: true
    },
    cid: {
      type: Sequelize.UUID,
      allowNull: false
    },
    type: {
      type: Sequelize.ENUM('text', 'image', 'video', 'file', 'system'),
      allowNull: false
    },
    senderId: {
      type: Sequelize.UUID,
      allowNull: false
    },
    targetId: {
      type: Sequelize.UUID,
      allowNull: false
    },
    targetType: {
      type: Sequelize.ENUM('friend', 'group'),
      allowNull: false
    },
    content: {
      type: Sequelize.TEXT,
      allowNull: false
    },
    callList: {
      type: Sequelize.ARRAY(Sequelize.UUID)
    },
    readTime: {
      type: Sequelize.DATE
    },
    sentTime: {
      type: Sequelize.DATE,
      allowNull: false
    },
    receiveTime: {
      type: Sequelize.DATE
    }
  }, {
    freezeTableName: true // Model 对应的表名将与model名相同
  })

  Friend.belongsTo(User, {
    as: 'user',
    foreignKey: 'userId'
  })
  // User.hasMany(Friend, { as: 'friends', foreignKey: 'userId' })
  Friend.belongsTo(User, {
    as: 'friend',
    foreignKey: 'friendId'
  })

  GroupMember.belongsTo(Group, {
    as: 'group',
    sourceKey: 'groupId'
  })
  // Group.hasMany(GroupMember, { as: 'members' })
  GroupMember.belongsTo(User, {
    as: 'user',
    sourceKey: 'userId'
  })
  // User.hasMany(GroupMember, { as: 'groups' })


  User.sync({ force: true })
  Friend.sync({ force: true })
  Group.sync({ force: true })
  GroupMember.sync({ force: true })
  Message.sync({ force: true })

  // User.sync({ force: false }).then(function ()
  // {
  //   // 已创建数据表
  //   return User.create({
  //     firstName: 'John',
  //     lastName: 'Hancock'
  //   })
  // })
}
exports.models = sequelize.models

const models = sequelize.models
const Op = Sequelize.Op

class BaseOperation
{
  constructor(model)
  {
    this.model = model
  }
  _getOrNull (id)
  {
    return this.model ? this.model.findByPk(id) : Promise.resolve(null)
  }
  get (id)
  {
    return this._getOrNull(id)
  }
  add (m)
  {
    return this.model.create(m)
  }
  delete (id)
  {
    this.model.destroy({ where: { id } })
  }
}

class UserOperation extends BaseOperation
{
  constructor(model = null)
  {
    super(model || models.User)
  }
  add (m)
  {
    return this.model.findOrCreate({ where: { mobile: m.mobile }, defaults: m })
      .then(([oldM, created]) =>
      {
        if (!created)
        {
          throw new Error(`mobile:${m.mobile} existed.`)
        }
        return oldM
      })
  }
  getByPWD (mobile, password)
  {
    return this.model.findOne({ where: { mobile, password } })
  }
  updateInfo (id, { name = null, password = null, mobile = null, ico = null })
  {
    return this.get(id).then(m =>
    {
      const obj = {}
      if (name) obj.name = name
      if (password) obj.password = password
      if (mobile) obj.mobile = mobile
      if (ico) obj.ico = ico
      return m.update(obj)
    })
  }
}

class FriendOperation // extends BaseOperation
{
  constructor()
  {
    this.model = models.Friend
  }
  get (userId, friendId)
  {
    return this.model.findOne({ where: { userId, friendId }, include: { model: models.User, as: 'friend' } })
  }
  getList (userId)
  {
    return this.model.findAll({ where: { userId }, include: { model: models.User, as: 'friend' } })
  }
  add (usrId, friendId)
  {
    return this.model.findOrCreate({ where: { usrId, friendId }, defaults: { usrId, friendId, isBlacked: false } })
      .then(([oldM, created]) =>
      {
        if (!created)
        {
          throw new Error(`friend existed.`)
        }
        return this.get(usrId, friendId)
      })
  }
  updateIsBlacked (usrId, friendId, isBlacked)
  {
    return this.model.update({ isBlacked }, { where: { usrId, friendId } })
  }
}

class GroupOperation extends BaseOperation
{
  constructor(model = null)
  {
    super(model || models.Group)
  }
  get (id)
  {
    return super.get(id).then(m =>
    {
      delete m.messageReadInfo
      return m
    })
  }
  updateName (id, name)
  {
    return this.get(id).then(m =>
    {
      return m.update({ name })
    })
  }
  delete (id)
  {
    return this.get(id).then(m =>
    {
      return m.update({ isDeleted: true })
    })
  }
}

class GroupMemberOperation // extends BaseOperation
{
  constructor()
  {
    this.model = models.GroupMember
  }
  get (groupId, userId)
  {
    return this.model.findOne({ where: { groupId, userId }, include: { model: models.User, as: 'user' } })
  }
  getList (groupId)
  {
    return this.model.findAll({ where: { groupId }, include: { model: models.User, as: 'user' } })
  }
  add (groupId, userId, isOwner = false, isAdmin = false)
  {
    return this.model.findOrCreate({ where: { groupId, userId }, defaults: { groupId, userId, isOwner, isAdmin } })
      .then(([oldM, created]) =>
      {
        if (!created)
        {
          throw new Error(`member existed.`)
        }
        return this.get(groupId, userId)
      })
  }
  addMulti (groupId, usersId)
  {
    const promises = usersId.map(userId => this.add(groupId, userId))
    return Promise.allSettled(promises).then(data =>
    {
      const results = data.filter(t => t.status === 'fulfilled').map(t => t.value)
      return results
    })
  }
  delete (groupId, userId)
  {
    this.model.destroy({ where: { groupId, userId, isOwner: false } }) // 不能删除群主
  }
}

class FriendMessageOperation extends BaseOperation
{
  constructor(model = null)
  {
    super(model || models.Message)
  }
  add (m)
  {
    m.targetType = 'friend'
    return super.add(m)
  }
  getUnreceiveList (targetId, limit = 100000000)
  {
    return this.model.findAll({
      limit,
      where: {
        targetId,
        targetType: 'friend',
        receiveTime: { [Op.is]: null }
      }
    })
  }
  updateReceiveTime (ids)
  {
    return this.model.update({ receiveTime: Sequelize.NOW }, { where: { targetType: 'friend', id: { [Op.in]: ids } } })
    // return this.get(id).then(m =>
    // {
    //   return m.update({ receiveTime: Sequelize.NOW, })
    // })
  }
  updateReadTime (id)
  {
    return this.get(id).then(m =>
    {
      return m.update({ readTime: Sequelize.NOW, })
    })
  }
}

class GroupMessageOperation extends BaseOperation
{
  constructor(model = null)
  {
    super(model || models.Message)
  }
  add (props)
  {
    props.targetType = 'group'
    return Promise.all(this.model.create(props)
      , models.Group.findByPk(m.targetId)
      , models.GroupMember.findAll({ where: { groupId: m.targetId } }))
      .then((msg, group, member) =>
      {
        const messageReadInfo = JSON.parse(group.messageReadInfo) || {}
        member.forEach(t =>
        {
          if (!messageReadInfo[t.userId])
          {
            messageReadInfo[t.userId] = Sequelize.NOW
          }
        })
        return group.update({ messageReadInfo: JSON.stringify(messageReadInfo) }).then(() => msg)
      })
  }
  getUnreceiveList (targetId, userId, limit = 100000000)
  {
    return models.Group.findByPk(targetId).then(g =>
    {
      const messageReadInfo = JSON.parse(m.messageReadInfo) || {}
      const userUnreadTime = messageReadInfo[userId]
      if (userUnreadTime)
      {
        return this.model.findAll({
          limit,
          where: {
            targetId,
            targetType: 'group',
            sentTime: { [Op.gte]: userUnreadTime }
          }
        })
      } else
      {
        return []
      }
    })
  }
  updateReceiveTime (groupId, userId)
  {
    return models.Group.findByPk(groupId).then(m =>
    {
      const messageReadInfo = JSON.parse(m.messageReadInfo)
      if (messageReadInfo && messageReadInfo[userId])
      {
        delete messageReadInfo[userId]
        m.update({ messageReadInfo: JSON.stringify(messageReadInfo) })
        return true
      }
    })
  }
}

exports.User = UserOperation
exports.Friend = FriendOperation
exports.Group = GroupOperation
exports.GroupMember = GroupMemberOperation
exports.FriendMessage = FriendMessageOperation
exports.GroupMessage = GroupMessageOperation