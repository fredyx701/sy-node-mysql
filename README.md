# sy-node-mysql
a simple mysql builder

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
    const res = await mysql.query(sql, opts, 'db_one', true/*readonly*/);
    return res[0];
}

select().then(data => {
    console.log(data);
});


async function select2() {
    const sql = `select * from db_one.person`;
    const opts = {
        where: ['id in (?)'],
        group: 'city',
        having: ['age >= ?'],
        order: [['age','desc'], ['name', 'asc']],
        limit: {offset: 0, size: 10},
        params: [[100,101], 10]
    };
    const res = await mysql.query(sql, opts, 'db_one', true/*readonly*/);
    return res[0];
}

//query directly
async function select3() {
    const sql = `select * from person where age > ? and age < ?`;
    const params = [10, 20];
    const res = await mysql.query(sql, params, 'db_one', true);
    return res[0];
}


async function update() {
    const sql = `update db_one.person`
    const opts = {
        update: ['name', 'age'],
        literalUpdate: ['score = score + ?'],
        where: ['id = ?'],
        params: ['Tom', 18, 20, 100]
    };
    return await mysql.query(sql, opts, 'db_one');
}


async function insert() {
    const sql = `insert into db_one.person`
    const opts = {
        insert: ['name', 'age'],
        onUpdate: ['age'],
        params: ['Tom', 18, 18]
    };
    return await mysql.query(sql, opts, 'db_one');
}


async function transaction() {
    const transaction = await mysql_client.beginTransaction('db_one');
    try{
        const sql1 = `update db_one.person`;
        const opts1 = {
            set: ['name', 'age'],
            where: ['id = ?'],
            params: ['Tom', 18, 100]
        };
        await transaction.query(sql1, opts1);
        
        const sql2 = `update db_one.person`;
        const opts2 = {
            set: ['name', 'age'],
            where: ['id = ?'],
            params: ['John', 16, 10]
        };
        await transaction.query(sql2, opts2);

        await transaction.commit();

    } catch(err){
        await transaction.rollback();
        throw err;
    }
}
```
