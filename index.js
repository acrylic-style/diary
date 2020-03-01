#!/usr/bin/env node
const inquirer = require('inquirer')
const Preferences = require('preferences')
const prefs = new Preferences('xyz.acrylicstyle.diary', { types: [] })
const prompt = inquirer.createPromptModule()
const _fs = require('fs')
const fs = _fs.promises

if (process.argv[2] && process.argv[2] === '--reset') {
  delete prefs.dialect
  delete prefs.dbhost
  delete prefs.dbname
  delete prefs.dbuser
  delete prefs.dbpassword
  prefs.save()
}

const onlyUnique = (value, index, self) => self.indexOf(value) === index

const askDBType = async () => {
  const { dbtype } = await prompt({
    type: 'list',
    name: 'dbtype',
    message: 'データベースの種類を選択',
    choices: [ { name: 'MySQL', value: 'mysql' }, { name: 'SQLite', value: 'sqlite' } ],
  })
  return dbtype
}

const askDBHost = async () => {
  const { dbhost } = await prompt({
    type: 'input',
    name: 'dbhost',
    message: 'データベースのホストを入力',
    validate: val => val ? true : 'データベースのホストを選択してください。',
  })
  return dbhost
}

const askDBName = async () => {
  const { dbname } = await prompt({
    type: 'input',
    name: 'dbname',
    message: 'データベースの名前を入力',
    validate: val => val ? true : 'データベースの名前を選択してください。',
  })
  return dbname
}

const askDBUser = async () => {
  const { dbuser } = await prompt({
    type: 'input',
    name: 'dbuser',
    message: 'データベースのユーザー名を入力',
    validate: val => val ? true : 'データベースのユーザー名を入力してください。',
  })
  return dbuser
}

const askDBPassword = async () => {
  const { dbpassword } = await prompt({
    type: 'password',
    name: 'dbpassword',
    message: 'データベースのパスワードを入力',
    validate: val => val ? true : 'データベースのパスワードを入力してください。',
  })
  return dbpassword
}

// ---

const saveConfig = prefs.save

const selectReadOrWrite = async () => {
  const { type } = await prompt({
    type: 'list',
    name: 'type',
    message: '　',
    choices: [ { name: '書く', value: 'write' }, { name: '読む', value: 'read' }, { name: '設定をリセット', value: 'reset', } ],
  })
  return type
}

const selectType = async () => {
  const { type } = await prompt({
    type: 'list',
    name: 'type',
    message: '日記の種類',
    choices: [ ...prefs.types, { name: '新しい日記の種類を作成', value: 'new' } ],
  })
  return type
}

async function askType() {
  const { type } = await prompt({
    type: 'input',
    name: 'type',
    message: '日記の種類を入力',
    validate: val => val ? true : '日記の種類を入力してください',
  })
  return type
}

async function askName() {
  const { name } = await prompt({
    type: 'input',
    name: 'name',
    message: '今日の日記のタイトル',
    validate: val => val ? true : '日記のタイトルを選択してください',
  })
  return name
}

async function askDescription() {
  const { description } = await prompt({
    type: 'input',
    name: 'description',
    message: '日記の詳細(終了は.exit)',
    validate: () => true,
  })
  return description
}

const f = async () => {
  if (!['sqlite', 'mysql'].includes(prefs.dialect)) {
    prefs.dialect = await askDBType()
  }
  if (prefs.dialect === 'mysql') {
    if (!prefs.dbhost || !prefs.dbname || !prefs.dbuser || !prefs.dbpassword) {
      prefs.dbhost = await askDBHost()
      prefs.dbname = await askDBName()
      prefs.dbuser = await askDBUser()
      prefs.dbpassword = await askDBPassword()
    }
  }
  prefs.save()
  let data
  const chalk = require('chalk')

  process.on('dbready', async () => {
    const rwType = await selectReadOrWrite()
    if (rwType === 'reset') {
      delete prefs.dialect
      delete prefs.dbhost
      delete prefs.dbname
      delete prefs.dbuser
      delete prefs.dbpassword
      prefs.save()
      return f()
    }
    let type = await selectType()
    if (type === 'new') {
      type = await askType()
      prefs.types.push(type)
      saveConfig()
    }
    data.addTable(type)
    if (rwType === 'write') {
      const name = await askName()
      let description = ''
      while (true) {
        const desc = await askDescription()
        if (desc === '.exit') break
        description = `${description}${desc}\n`
        continue
      }
      await data.addDiary(type, name, description, Date.now()/1000)
      console.log('Done! New diary has been created.')
    } else if (rwType === 'read') {
      const diary = await data.getDiary(type)
      const expandNumber = n => {
        let s = n.toString()
        if (s.length === 1) s = `0${s}`
        return s
      }
      if (diary.length === 0) {
        console.log(chalk.red('日記が少なくとも1つ必要です。'))
        return
      }
      const { year } = await prompt({
        type: 'list',
        name: 'year',
        message: '年',
        choices: diary.map(d => new Date(d.date*1000).getFullYear()).filter(onlyUnique),
      })
      const { month } = await prompt({
        type: 'list',
        name: 'month',
        message: '月',
        choices: diary.filter(d => new Date(d.date*1000).getFullYear() === year).map(d => new Date(d.date*1000).getMonth()+1).filter(onlyUnique),
      })
      const { day } = await prompt({
        type: 'list',
        name: 'day',
        message: '日',
        choices: diary.filter(d => new Date(d.date*1000).getFullYear() === year).filter(d => new Date(d.date*1000).getMonth()+1 === month).map(d => new Date(d.date*1000).getDay()+1).filter(onlyUnique),
      })
      const { title } = await prompt({
        type: 'list',
        name: 'title',
        message: '日記のタイトル',
        choices: diary.filter(d => new Date(d.date*1000).getFullYear() === year)
          .filter(d => new Date(d.date*1000).getMonth()+1 === month)
          .filter(d => new Date(d.date*1000).getDay()+1 === day)
          .filter(d => new Date(d.date*1000).getDay()+1)
          .map(d => d.name),
      })
      diary
        .filter(d => new Date(d.date*1000).getFullYear() === year)
        .filter(d => new Date(d.date*1000).getMonth()+1 === month)
        .filter(d => new Date(d.date*1000).getDay()+1 === day)
        .forEach(data => {
          const date = new Date(data.date*1000)
          console.log(chalk.yellow(`${date.getFullYear()}/${expandNumber(date.getMonth()+1)}/${expandNumber(date.getDay()+1)} ${expandNumber(date.getHours())}:${expandNumber(date.getMinutes())}:${expandNumber(date.getSeconds())}`))
          console.log(chalk.green(`タイトル: ${data.name}`))
          console.log(chalk.white(`内容: ${data.description}`))
          console.log('\n\n')
        })
    }
  })
  data = require('./data')
}
f()
