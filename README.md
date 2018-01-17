# sy-node-mysql
a simple mysql orm

[![npm package](https://nodei.co/npm/sy-node-mysql.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/sy-node-mysql/)


### Getting Started
```shell
$ npm install sy-node-mysql --save
```


### Example

```javascript

const MySql = require('sy-node-mysql');
const config = require('./example/config.json');
const mysql = new MySql(config);


async function select() {
    const sql = `select * from db_one.person`;
    const opts = {
        where: ['id = ?'],
        params: [100]
    };
    const res = await mysql.exec(sql, opts, 'db_one', true/*readOnly*/);
    return res[0];
}

select().then(data => {
    console.log(data);
});


async function update() {
    const sql = `update db_one.person`
    const opts = {
        set: ['name', 'age'],
        where: ['id = ?'],
        params: ['Tom', 18, 100]
    };
    return await mysql.exec(sql, opts, 'db_one');
}


async function insert() {
    const sql = `insert into db_one.person`
    const opts = {
        insert: ['name', 'age'],
        onUpdate: ['age'],
        params: ['Tom', 18, 18]
    };
    return await mysql.exec(sql, opts, 'db_one');
}

```
