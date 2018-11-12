# sy-node-mysql
a simple mysql builder

[![npm package](https://nodei.co/npm/sy-node-mysql.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/sy-node-mysql/)


### Getting Started
```shell
$ npm install sy-node-mysql --save
```


### init
> 多个config可以有相同的name, 其中只能有一个可写库，可以有多个只读库

```js
const config = [
    {
        "name": 'TEST_DATABASE',     // config name
        "database": "db_one",
        "port": 3306,
        "host": "192.168.0.1",
        "user": "root",
        "password": "root",
        "charset": "UTF8MB4_GENERAL_CI",
        "connectionLimit": 50
    },
    {
        "name": 'TEST_DATABASE', 
        "readonly": true,           // mark as readonly
        "database": "db_one",
        "port": 3306,
        "host": "192.168.1.1",
        "user": "root",
        "password": "root",
        "charset": "UTF8MB4_GENERAL_CI",
        "connectionLimit": 100,
    },
    {
        "name": "TEST_DATABASE_TWO",
        "readonly": false,
        "database": "db_two",
        "port": 3306,
        "host": "192.168.0.2",
        "user": "root",
        "password": "root",
        "charset": "UTF8MB4_GENERAL_CI",
        "connectionLimit": 100,
        "timezone": "Z",
        "bigNumberStrings": true,
        "supportBigNumbers": true
    }
]

const MySQL = require('bi-node-mysql');
const mysql = new MySQL(config);

```

### pool instance:   mysql.get(name, readonly)
```js
const pool = mysql.get('TEST_DATABASE');
await pool.query(sql, opts);

//the same as
await mysql.query(sql, opts, 'TEST_DATABASE');
```

### select

* simple select

```js
const res = await mysql.select('person', { where: { id: 100 } }, 'TEST_DATABASE', true);
```

* conditional select

```js
const opts = {
    fields: ['age', 'name'],
    where: { aa: 1 },
    literalWhere: ['id in (?)'],
    group: 'city',
    having: ['age >= ?'],
    orders: [['age', 'desc'], ['name', 'asc']],
    limit: 10,
    offset: 5,
    params: [[100, 101], 10]
};
const res = await mysql.select('person', opts, 'TEST_DATABASE');
```

* query directly

```js
const sql = `select * from person where age > ? and age < ?`;
const params = [10, 20];
const res = await mysql.query(sql, params, 'TEST_DATABASE');
```


### update

```js
const opts = {
    update: { name: 'Tom', age: 18 },
    literalUpdate: ['score = score + ?'],
    where: { id: 100 },
    literalWhere: [ 'age > ?' ],
    params: [20, 20]
};
await mysql.update('db_one.person', opts, 'TEST_DATABASE');
```

### insert

```js
const opts = {
    insert: { name: 'Tom', age: 18 },
    onUpdate: { age: 18 }
};
await mysql.insert('person', opts, 'TEST_DATABASE');
```

### transaction

```js
const transaction = await mysql.beginTransaction('TEST_DATABASE');
try {
    const opts1 = {
        update: { name: 'Tom', age: 18 },
        where: { id: 100 },
    };
    await transaction.update('person', opts1);

    const opts2 = {
        update: { name: 'John', age: 16 },
        where: { id: 10 },
    };
    await transaction.update('person', opts2);

    await transaction.commit();

} catch (err) {
    await transaction.rollback();
    throw err;
}
```