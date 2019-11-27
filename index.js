require('./socket')
const express = require('express')
const app = express()

const dal = require('./DAL/dataAccessor')
dal.create()

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