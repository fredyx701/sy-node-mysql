'use strict';

const MySQL = require('../mysql_pool');

const config = [
    {
        name: 'TEST_DATABASE', // config name
        database: 'db_one',
        port: 3306,
        host: 'localhost',
        user: 'root',
        password: 'root',
        charset: 'UTF8MB4_GENERAL_CI',
        connectionLimit: 50,
        timezone: 'Z',
    },
];

const mysql = new MySQL(config);


async function select1() {
    const res = await mysql.select('person', { where: { id: 100 } }, 'TEST_DATABASE', true);
    console.log(res);
}

async function select2() {
    const opts = {
        fields: [ 'city' ],
        literalFields: [ 'sum(score) as scores', 'avg(age) as ages' ],
        where: { tt: 1 },
        literalWhere: [ 'id in (?)' ],
        group: 'city',
        having: [ 'ages >= ?' ],
        orders: [[ 'ages', 'desc' ], [ 'city', 'asc' ]],
        limit: 10,
        offset: 0,
        params: [[ 2, 100, 101 ], 10 ],
    };
    const res = await mysql.select('person', opts, 'TEST_DATABASE');
    console.log(res.length);
}

async function select3() {
    const pool = mysql.get('TEST_DATABASE');
    const sql = 'select * from person where age > ? and age < ? and id = ?';
    const params = [ 10, 20, 100 ];
    const res = await pool.query(sql, params);
    console.log(res);
}

async function update() {
    const opts = {
        update: { name: 'NICK', age: 17, updated_at: new Date() },
        literalUpdate: [ 'score = score + ?' ],
        where: { id: 100 },
        literalWhere: [ 'age > ?' ],
        params: [ 1, 10 ],
    };
    await mysql.update('db_one.person', opts, 'TEST_DATABASE');
}


async function insert() {
    const opts = {
        insert: { name: 'Tom', age: 18 },
        onUpdate: { age: 18 },
    };
    await mysql.insert('person', opts, 'TEST_DATABASE');
}

async function insert1() {
    const opts = {
        insert: [{ name: 'Tom1', age: 15 }, { name: 'Tom2', age: 17 }, { name: 'Tom3', age: 16 }],
        onUpdate: { age: 18 },
    };
    await mysql.insert('person', opts, 'TEST_DATABASE');
}

async function insert4() {
    const opts = {
        insert: [
            { id: 100, name: 'Tom', age: 18 },
            { id: 107, name: 'Tom1', age: 17 },
            { id: 104, name: 'Tom2', age: 16 },
        ],
        onUpdate: [ 'name', 'age' ],
    };
    await mysql.insert('person', opts, 'TEST_DATABASE');
}

async function insert2() {
    const opts = { name: 'Tom', age: 18 };
    await mysql.insert('person', opts, 'TEST_DATABASE');
}

async function insert3() {
    const opts = [{ name: 'Tom1', age: 15 }, { name: 'Tom2', age: 17 }, { name: 'Tom3', age: 16 }];
    await mysql.insert('person', opts, 'TEST_DATABASE');
}


async function transaction() {
    const transaction = await mysql.beginTransaction('TEST_DATABASE');
    try {
        const opts1 = {
            update: { name: 'Tom', age: 18, updated_at: new Date() },
            where: { id: 100 },
        };
        await transaction.update('person', opts1);

        const opts2 = {
            update: { name: 'John', age: 16, updated_at: new Date() },
            where: { id: 100 },
        };
        await transaction.update('person', opts2);

        // throw 'transaction error';

        await transaction.commit();

    } catch (err) {
        await transaction.rollback();
        throw err;
    }
}


void async function() {
    await select2();

    await insert();
    await insert1();
    await insert2();
    await insert3();
    await insert4();

    await select3();
    await update();
    await select1();
    await transaction();
    await select1();

    process.exit(0);
}().catch(err => {
    console.error(err);
});
