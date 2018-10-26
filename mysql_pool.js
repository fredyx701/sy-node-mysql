const mysql = require('mysql');


class MySqlPool {

    /**
     * @param config   配置内容   {dbs, host, port, user, password}
     */
    constructor(config) {
        this.pools = {};
        config = config instanceof Array ? config : [config];
        for (let info of config) {
            const readonly = info.readOnly || info.readonly;
            const pool = mysql.createPool({
                connectionLimit: info.connectionLimit || 100,
                host: info.host,
                user: info.user,
                password: info.password,
                port: info.port
            });
            for (let dbname of info.dbs) {
                if (!this.pools[dbname]) {
                    this.pools[dbname] = {
                        master: null,
                        follows: []
                    }
                }
                if (readonly) {
                    this.pools[dbname].follows.push(pool);
                } else {
                    this.pools[dbname].master = pool;
                }
            }
        }
    }


    /**
     * 更新连接池连接数上限
     */
    updateConnectionLimit(dbname, limit_count) {
        if (!this.pools[dbname]) {
            return;
        }
        if (this.pools[dbname].master) {
            this.pools[dbname].master.config.connectionLimit = limit_count;
        }
        if (this.pools[dbname].follows.length > 0) {
            for (let pool of this.pools[dbname].follows) {
                pool.config.connectionLimit = limit_count;
            }
        }
    }


    /**
     * 获取mysql实例
     * @param {String} dbname 
     * @param {Boolean} readonly 
     */
    getInstance(dbname, readonly) {
        if (readonly && this.pools[dbname].follows.length > 0) {
            if (this.pools[dbname].follows.length === 1) {
                return this.pools[dbname].follows[0];
            }
            return this.pools[dbname].follows[Math.floor(Math.random() * this.pools[dbname].follows.length)];
        }
        if (this.pools[dbname].master) {
            return this.pools[dbname].master;
        }
        return null;
    }


    /**
     * 执行sql
     * @param sql
     * @param params
     * @param dbname
     * @param readonly
     * @return {Promise}
     */
    executeSql(sql, params, dbname, readonly = false) {
        const _this = this;
        return new Promise(function (resolve, reject) {
            let conn = null;
            conn = _this.getInstance(dbname, readonly);
            if (!conn) {
                return reject(Error(`there is no client with ${dbname}`));
            }
            conn.getConnection(function (err, client) {
                if (err) {
                    return reject(err);
                }
                client.query(sql, params, function (err, results) {
                    client.release();
                    if (err) {
                        err.message_body = {
                            sql: sql,
                            params: params
                        };
                        return reject(err);
                    }
                    resolve(results);
                });
            });
        });
    };


    /**
     * query
     * @param sql
     * @param opts
     * @param dbname
     * @param readonly 是否从从库读取数据
     * @returns {*}
     */
    exec(sql, opts, dbname, readonly = false) {
        if (opts instanceof Array) {
            return this.executeSql(sql, opts, client);
        }
        sql = this.getSql(sql, opts);
        return this.executeSql(sql, (opts && opts.params) || null, dbname, readonly);
    };


    /**
     * 执行事务sql
     */
    _executeSqlTransaction(sql, params, client) {
        return new Promise(function (resolve, reject) {
            client.query(sql, params, function (err, results) {
                if (err) {
                    err.message_body = {
                        sql: sql,
                        params: params
                    };
                    return reject(err);
                }
                resolve(results);
            });
        });
    };


    /**
     * 开始执行事务
     */
    beginTransaction(dbname) {
        const _this = this;
        return new Promise(function (resolve, reject) {
            let conn = null;
            if (_this.pools[dbname].master) {
                conn = _this.pools[dbname].master;
            } else {
                return reject(Error(`there is no client with ${dbname}`));
            }
            conn.getConnection(function (err, client) {
                if (err) {
                    return reject(err);
                }
                client.beginTransaction(function (err) {
                    if (err) {
                        client.release();
                        return reject(err);
                    }
                    client.exec = function (sql, opts) {
                        return _this._execTransaction(sql, opts, client);
                    }
                    client.commit = function () {
                        return _this._commit(client);
                    }
                    client.rollback = function () {
                        return _this._rollback(client);
                    }
                    resolve(client);
                });
            });
        });
    }


    /**
     * 事务操作
     */
    _execTransaction(sql, opts, client) {
        if (opts instanceof Array) {
            return this._executeSqlTransaction(sql, opts, client);
        }
        sql = this.getSql(sql, opts);
        return this._executeSqlTransaction(sql, (opts && opts.params) || null, client);
    }


    /**
     * 提交
     */
    _commit(client) {
        return new Promise((resolve, reject) => {
            client.commit(function (err) {
                if (err) {
                    return reject(err);
                }
                client.release();
                resolve();
            });
        });
    }

    /**
     * 回滚 
     */
    _rollback(client) {
        return new Promise((resolve, reject) => {
            client.rollback(function () {
                client.release();
                resolve();
            });
        });
    }


    /**
     * 封装条件查询接口
     * @param sql
     * @param opts   josn -> {update[], where[], params[], group, having[], order [[column, sort]], limit{offset, size}}
     * opts.where 查询时的where 子句， opts.update 更新时的更新选项
     */
    getSql(sql, opts) {
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
        if (opts.order) {
            if (opts.order instanceof Array && opts.order.length > 0) {
                sql += ' order by ';
                for (let i = 0, len = opts.order.length; i < len; i++) {
                    const [column, sort] = opts.order[i];
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
}


module.exports = MySqlPool;
