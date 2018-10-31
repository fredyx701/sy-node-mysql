const assert = require('assert');


class SQLBuilder {

    /**
     * 执行sql interface
     * @param sql
     * @param params
     * @param dbname
     * @param readonly
     * @return {Promise}
     */
    executeSql(sql, params, dbname, readonly = false) { }


    /**
     * query
     * @param sql
     * @param opts
     * @param dbname
     * @param readonly 是否从从库读取数据
     * @returns {*}
     */
    query(sql, opts, dbname, readonly = false) {
        if (opts instanceof Array) {
            return this.executeSql(sql, opts, dbname, readonly);
        }
        sql = this.build(sql, opts);
        return this.executeSql(sql, (opts && opts.params) || null, dbname, readonly);
    };


    select(tableName, opts, dbname, readonly = false) {
        const sql = this._select(tableName, opts);
        return this.executeSql(sql, (opts && opts.params) || null, dbname, readonly);
    }


    update(tableName, opts, dbname) {
        const sql = this._update(tableName, opts);
        return this.executeSql(sql, (opts && opts.params) || null, dbname);
    }


    insert(tableName, opts, dbname) {
        const sql = this._insert(tableName, opts);
        return this.executeSql(sql, (opts && opts.params) || null, dbname);
    }


    /**
     * 封装条件查询接口
     * @param sql
     * @param opts   josn -> {update[], where[], params[], group, having[], orders [[column, sort]], limit{offset, size}}
     * opts.where 查询时的where 子句， opts.update 更新时的更新选项
     */
    build(sql, opts) {
        //条件sql
        if (!opts) {
            return sql;
        }
        // insert
        if (opts.insert && opts.insert.length > 0) {
            let insert_str = ' (';
            let value_str = ' values(';
            for (let i = 0, len = opts.insert.length; i < len; ++i) {
                if (i === len - 1) {
                    insert_str += opts.insert[i] + ')';
                    value_str += '?) ';
                } else {
                    insert_str += opts.insert[i] + ',';
                    value_str += '?,';
                }
            }
            sql += insert_str + value_str;
            if (opts.onUpdate && opts.onUpdate.length > 0) {
                sql += ' ON DUPLICATE KEY UPDATE ';
                for (let i = 0, len = opts.onUpdate.length; i < len; ++i) {
                    if (i === opts.onUpdate.length - 1) {
                        sql += opts.onUpdate[i] + '= ?';
                    } else {
                        sql += opts.onUpdate[i] + '= ?, ';
                    }
                }
            }
        }
        // update
        const isUpdate = opts.update && opts.update.length > 0;
        const isLiteralUpdate = opts.literalUpdate && opts.literalUpdate.length > 0;
        if (isUpdate || isLiteralUpdate) {
            sql += ' set ';
            if (isUpdate) {
                for (let i = 0, len = opts.update.length; i < len; ++i) {
                    if (i === len - 1) {
                        sql += opts.update[i] + '= ?';
                    } else {
                        sql += opts.update[i] + '= ?, ';
                    }
                }
            }
            if (isLiteralUpdate) {
                sql += isUpdate ? ', ' : '';
                for (let i = 0, len = opts.literalUpdate.length; i < len; ++i) {
                    if (i === len - 1) {
                        sql += opts.literalUpdate[i];
                    } else {
                        sql += opts.literalUpdate[i] + ', ';
                    }
                }
            }
        }
        // 查询
        if (opts.where && opts.where.length > 0) {
            sql += ' where (';
            for (let i = 0, len = opts.where.length; i < len; ++i) {
                if (i === len - 1) {
                    sql += opts.where[i] + ')';
                } else {
                    sql += opts.where[i] + ') and (';
                }
            }
        }
        if (opts.group) {
            sql += ' group by ' + opts.group;
            if (opts.having && opts.having.length > 0) {
                sql += ' having (';
                for (let i = 0, len = opts.having.length; i < len; ++i) {
                    if (i === len - 1) {
                        sql += opts.having[i] + ')';
                    } else {
                        sql += opts.having[i] + ') and (';
                    }
                }
            }
        }
        if (opts.orders) {
            if (opts.orders instanceof Array && opts.orders.length > 0) {
                sql += ' order by ';
                for (let i = 0, len = opts.orders.length; i < len; i++) {
                    const [column, sort] = opts.orders[i];
                    if (i === len - 1) {
                        sql += column + ' ' + (sort || 'desc');
                    } else {
                        sql += column + ' ' + (sort || 'desc') + ', ';
                    }
                }
            }
        }
        if (opts.limit) {
            const offset = opts.limit.offset || 0;
            const size = opts.limit.size || 10;
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

    _select(tableName, opts) {
        assert(tableName, 'table name is null');
        let sql = 'select ';
        if (opts.fields instanceof Array && opts.fields.length > 0) {
            sql += opts.fields.join(',');
        } else {
            sql += '*';
        }
        sql += ' from ' + tableName;
        return this.build(sql, opts);
    }

    _update(tableName, opts) {
        assert(tableName, 'table name is null');
        let sql = 'update ' + tableName;
        return this.build(sql, opts);
    }

    _insert(tableName, opts) {
        assert(tableName, 'table name is null');
        let sql = 'insert into ' + tableName;
        return this.build(sql, opts);
    }

}

module.exports = SQLBuilder;