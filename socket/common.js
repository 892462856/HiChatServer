exports.MessageType = {
  sys: 0,
  text: 1,
  image: 2,
  video: 3,
  file: 4,
  0: 'sys',
  1: 'text',
  2: 'image',
  3: 'video',
  4: 'file'
}
exports.CreateGroupMessage = function (type, senderId, targetId, content, callList = [])
{
  const message = {
    id: tools.uuid(),
    cid: tools.uuid(),
    type,
    senderId,
    targetId,
    targetType: 'group',
    content,
    callList,
    sentTime: Sequelize.NOW
  }
  return message
}