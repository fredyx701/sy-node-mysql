'use strict';

const SQLBuilder = require('../sql_builder');

const buider = new SQLBuilder();


let opts = {
    fields: [ 'age', 'name' ],
    where: { age: 1, name: 'Tom' },
    literalWhere: [ 'id in (?)', 'id > ?' ],
    group: 'city',
    having: [ 'age >= ?', 'age <= ?' ],
    orders: [[ 'age', 'desc' ], [ 'name', 'asc' ]],
    limit: 10,
    offset: 5,
    params: [[ 100, 101 ], 20, 10, 100 ],
};
let res = buider._select('db_one.person', opts);
console.log(res);

opts = {
    update: { name: 'Tom', age: 18 },
    literalUpdate: [ 'score = score + ?', 'age = age + ?' ],
    where: { id: 100, age: 20 },
    literalWhere: [ 'age > ?', 'id > ?' ],
    params: [ 20, 10, 20, 10 ],
};
res = buider._update('db_one.person', opts);
console.log(res);

opts = {
    insert: { name: 'Tom', age: 18 },
    onUpdate: { age: 18, name: 'John' },
};
res = buider._insert('person', opts);
console.log(res);

opts = {
    insert: [{ name: 'Tom', age: 18 }, { name: 'Tom1', age: 17 }, { name: 'Tom2', age: 16 }],
    onUpdate: { age: 18, name: 'John' },
};
res = buider._insert('person', opts);
console.log(res);

opts = { name: 'Tom', age: 18 };
res = buider._insert('person', opts);
console.log(res);

opts = [{ name: 'Tom', age: 18 }, { name: 'Tom1', age: 17 }, { name: 'Tom2', age: 16 }];
res = buider._insert('person', opts);
console.log(res);

