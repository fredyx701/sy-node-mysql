'use strict';

const SqlString = require('mysql/lib/protocol/SqlString');


const insert_rds = function(table, rows, options) {
    options = options || {};
    let firstObj;
    // insert(table, rows)
    if (Array.isArray(rows)) {
        firstObj = rows[0];
    } else {
        // insert(table, row)
        firstObj = rows;
        rows = [ rows ];
    }
    if (!options.columns) {
        options.columns = Object.keys(firstObj);
    }

    const params = [ table, options.columns ];
    const strs = [];
    for (let i = 0; i < rows.length; i++) {
        const values = [];
        const row = rows[i];
        for (let j = 0; j < options.columns.length; j++) {
            values.push(row[options.columns[j]]);
        }
        strs.push('(?)');
        params.push(values);
    }

    console.log(strs, params);

    const sql = SqlString.format('INSERT INTO ??(??) VALUES' + strs.join(', '), params);
    return sql;
};

let opts = null;
let res = null;


opts = [{ name: 'Tom', age: 18, tt: null }, { name: 'Tom1', age: 17, aa: null }, { name: 'Tom2', age: 16 }];
res = insert_rds('person', opts);
console.log(res);
