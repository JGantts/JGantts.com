module.exports = {
  beforeCreate: async (event) => {
    const { makeid } = require('../../../common')
    const { data } = event.params
    if (!data.UUID) {
      data.UUID = makeid(20)
    }
  }
}