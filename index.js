#!/usr/bin/env node
const inquirer = require('inquirer')
const prompt = inquirer.createPromptModule()
const _fs = require('fs')
const fs = _fs.promises
const config = _fs.existsSync('config.json') && _fs.readFileSync('./config.json').length != 0 ? JSON.parse(_fs.readFileSync('./config.json')) : { types: [] }
const data = require('./data')
const chalk = require('chalk')

const saveConfig = () => {
  _fs.writeFileSync('config.json', JSON.stringify(config))
}

const selectReadOrWrite = async () => {
  const { type } = await prompt({
    type: 'list',
    name: 'type',
    message: '　',
    choices: [ { name: '書く', value: 'write' }, { name: '読む', value: 'read' } ],
  })
  return type
}

const selectType = async () => {
  const { type } = await prompt({
    type: 'list',
    name: 'type',
    message: '日記の種類',
    choices: [ ...config.types, { name: '新しい日記の種類を作成', value: 'new' } ],
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

process.on('dbready', () => {
  !(async () => {
    const rwType = await selectReadOrWrite()
    let type = await selectType()
    if (type === 'new') {
      type = await askType()
      config.types.push(type)
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
      await data.addDiary(type, name, description, Date.now())
      console.log('Done! New diary has been created.')
    } else if (rwType === 'read') {
      const diary = await data.getDiary(type)
      const expandNumber = n => {
        let s = n.toString()
        if (s.length === 1) s = `0${s}`
        return s
      }
      diary.forEach(data => {
        const date = new Date(data.date)
        console.log(chalk.yellow(`${date.getFullYear()}/${expandNumber(date.getMonth()+1)}/${expandNumber(date.getDay()+1)} ${expandNumber(date.getHours())}:${expandNumber(date.getMinutes())}:${expandNumber(date.getSeconds())}`))
        console.log(chalk.green(`タイトル: ${data.name}`))
        console.log(chalk.white(`内容: ${data.description}`))
        console.log('\n\n')
      })
    }
  })()
})
