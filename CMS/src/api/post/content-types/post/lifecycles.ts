module.exports = {
  beforeCreate: async (event) => {
    const { makeid } = require('../../../common')
    const { data } = event.params
    data.UUID = makeid(20)
  }
}