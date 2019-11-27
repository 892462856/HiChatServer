const express = require('express')
const app = express()

const dataAccessor = require('./DAL/dataAccessor')
dataAccessor.create()

app.get('/', (req, res) =>
{
  // res.send('Hello World!')
  dataAccessor.models.User.findByPk(2).then(user =>
  {
    res.send(user.createdAt)
  })
})

app.listen(3000, () =>
{
  console.log('Example app listening on port 3000!')
})