const Sequelize = require('sequelize')
const Op = Sequelize.Op
console.log(`Connecting to the database using sqlite...`)
const sequelize = new Sequelize.Sequelize({
  dialect: 'sqlite',
  storage: `${__dirname}/database.sqlite`,
  logging: false,
})
sequelize.authenticate()
  .then(() => {
    console.info(`Connection has been established successfully. (Type: ${sequelize.getDialect()})`)
    process.emit('dbready')
  })
  .catch(err => {
    process.exit(1)
  })
/**
 * @type {{[table: string]: typeof Sequelize.Model}}
 */
const diary = {}
module.exports = {
  addTable(table) {
    diary[table] = sequelize.define(table, {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: Sequelize.TEXT,
        unique: false,
      },
      description: {
        type: Sequelize.TEXT,
        unique: false,
      },
      date: {
        type: Sequelize.INTEGER,
        unique: true,
      },
    })
    sequelize.sync()
  },
  getTable(table) {
    return diary[table]
  },
  addDiary(table, name, description, date) {
    return diary[table].create({ name, description, date })
  },
  getDiary(table) {
    return diary[table].findAll({ order: [['date', 'DESC']] })
  },
}
