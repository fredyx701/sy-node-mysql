'use strict';

const assert = require('assert');
const SqlString = require('mysql/lib/protocol/SqlString');


class SQLBuilder {

    constructor() {
        this.timezone = 'local';
    }

    /**
     * 执行sql interface
     * @param sql
     * @param params
     * @return {Promise}
     */
    executeSql(sql, params) {
        console.log(sql, params);
    }

    query(sql, opts) {
        return this.executeSql(sql, opts || null);
    }

    select(tableName, opts) {
        const sql = this._select(tableName, opts);
        return this.executeSql(sql, (opts && opts.params) || null);
    }

    update(tableName, opts) {
        const sql = this._update(tableName, opts);
        return this.executeSql(sql, (opts && opts.params) || null);
    }

    insert(tableName, opts) {
        const sql = this._insert(tableName, opts);
        return this.executeSql(sql, (opts && opts.params) || null);
    }

    _isExistObject(obj) {
        return !(obj instanceof Array) && obj !== null
            && typeof obj === 'object' && Object.keys(obj).length > 0;
    }

    _isExitArray(arr) {
        return arr instanceof Array && arr.length > 0;
    }


    /**
     * 封装条件查询接口   select * from db_one.person
     * @param sql
     * @param opts   josn -> {where[], params[], group, having[], orders [[column, sort]], limit, offset}
     * opts.where 查询时的where 子句
     */
    _select(tableName, opts) {
        assert(tableName, 'table name is null');
        let sql = 'select ';
        if (opts && opts.fields instanceof Array && opts.fields.length > 0) {
            sql += '`';
            sql += opts.fields.join('`,`');
            sql += '`';
        } else {
            sql += '*';
        }
        sql += ' from ' + tableName;

        // 条件sql
        if (!opts) {
            return sql;
        }
        let sql_arr = null;
        let params_arr = null;
        let sql_t = '';

        // 查询
        const isWhere = this._isExistObject(opts.where);
        const isLiteralWhere = this._isExitArray(opts.literalWhere);
        if (isWhere || isLiteralWhere) {
            sql += ' where ';
            if (isWhere) {
                sql_arr = [];
                params_arr = [];
                for (const key in opts.where) {
                    sql_arr.push('`' + key + '`= ?');
                    params_arr.push(opts.where[key]);
                }
                sql_t = `(${sql_arr.join(') and (')})`;
                sql += SqlString.format(sql_t, params_arr, this.stringifyObjects, this.timezone);
            }
            if (isLiteralWhere) {
                sql += (isWhere ? ' and (' : '(') + opts.literalWhere.join(') and (') + ')';
            }
        }
        if (opts.group) {
            sql += ' group by `' + opts.group + '`';
            if (this._isExitArray(opts.having)) {
                sql += ' having (' + opts.having.join(') and (') + ')';
            }
        }
        if (opts.orders) {
            if (this._isExitArray(opts.orders)) {
                sql += ' order by ';
                for (let i = 0, len = opts.orders.length; i < len; i++) {
                    const [ column, sort ] = opts.orders[i];
                    if (i === len - 1) {
                        sql += '`' + column + '` ' + (sort || 'desc');
                    } else {
                        sql += '`' + column + '` ' + (sort || 'desc') + ', ';
                    }
                }
            }
        }
        if (opts.limit) {
            const offset = Number(opts.offset) || 0;
            const size = Number(opts.limit) || 10;
            sql += ' limit ' + offset + ',' + size;
        }
        if (opts.end) {
            sql += opts.end;
        }
        sql = sql.trim();
        if (sql.slice(-1) !== ';') {
            sql += ';';
        }
        return sql;
    }

    // update db_one.person
    _update(tableName, opts) {
        assert(tableName, 'table name is null');
        let sql = 'update ' + tableName;
        let sql_arr = null;
        let params_arr = null;
        let sql_t = '';

        // update
        const isUpdate = this._isExistObject(opts.update);
        const isLiteralUpdate = this._isExitArray(opts.literalUpdate);

        assert(isUpdate || isLiteralUpdate, 'update fields is empty');

        sql += ' set ';
        if (isUpdate) {
            sql_arr = [];
            params_arr = [];
            for (const key in opts.update) {
                sql_arr.push('`' + key + '`= ?');
                params_arr.push(opts.update[key]);
            }
            sql_t = sql_arr.join(',');
            sql += SqlString.format(sql_t, params_arr, this.stringifyObjects, this.timezone);
        }
        if (isLiteralUpdate) {
            sql += (isUpdate ? ', ' : '') + opts.literalUpdate.join(',');
        }

        // 条件
        const isWhere = this._isExistObject(opts.where);
        const isLiteralWhere = this._isExitArray(opts.literalWhere);
        if (isWhere || isLiteralWhere) {
            sql += ' where ';
            if (isWhere) {
                sql_arr = [];
                params_arr = [];
                for (const key in opts.where) {
                    sql_arr.push('`' + key + '`= ?');
                    params_arr.push(opts.where[key]);
                }
                sql_t = `(${sql_arr.join(') and (')})`;
                sql += SqlString.format(sql_t, params_arr, this.stringifyObjects, this.timezone);
            }
            if (isLiteralWhere) {
                sql += (isWhere ? ' and (' : '(') + opts.literalWhere.join(') and (') + ')';
            }
        }
        return sql;
    }

    // insert into db_one.person
    _insert(tableName, opts) {
        assert(tableName, 'table name is null');

        opts = opts || {};
        if (opts instanceof Array || typeof opts.insert !== 'object') {
            opts = { insert: opts };
        }

        let sql = 'insert into ' + tableName;
        let sql_arr = null;
        let params_arr = null;
        let sql_t = '';

        assert(opts.insert !== null && typeof opts.insert === 'object', 'invalide insert params');

        let firstObj;
        let rows = opts.insert;
        if (Array.isArray(rows)) {
            firstObj = rows[0];
        } else {
            firstObj = rows;
            rows = [ rows ];
        }
        sql_arr = [];
        const values_arr = [];
        params_arr = [];
        for (const key in firstObj) {
            sql_arr.push('`' + key + '`');
        }
        for (const row of rows) {
            const values_data = [];
            for (const key in row) {
                const value = row[key];
                if (value === undefined || value === null) {
                    continue;
                }
                values_data.push('?');
                params_arr.push(value);
            }
            values_arr.push(`(${values_data.join(',')})`);
        }
        sql_t = `(${sql_arr.join(',')}) values ${values_arr.join(',')} `;
        sql += SqlString.format(sql_t, params_arr, this.stringifyObjects, this.timezone);
        if (this._isExistObject(opts.onUpdate)) {
            sql += ' ON DUPLICATE KEY UPDATE ';
            sql_arr = [];
            params_arr = [];
            for (const key in opts.onUpdate) {
                const value = opts.onUpdate[key];
                if (value === undefined || value === null) {
                    continue;
                }
                sql_arr.push('`' + key + '`= ?');
                params_arr.push(value);
            }
            sql_t = sql_arr.join(',');
            sql += SqlString.format(sql_t, params_arr, this.stringifyObjects, this.timezone);
        }

        return sql;
    }

}

module.exports = SQLBuilder;
