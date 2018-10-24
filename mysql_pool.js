const mysql = require('mysql');


class MySqlPool {

    /**
     * @param config   配置内容   {dbs, host, port, user, password}
     */
    constructor(config) {
        this.pools = {};
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
     * 执行sql
     * @param sql
     * @param params
     * @param dbname
     * @param readonly
     * @return {Promise}
     */
    executeSql(sql, params, dbname, readonly = false) {
        let self = this;
        return new Promise(function (resolve, reject) {
            let conn = null;
            if (readonly && self.pools[dbname].follows.length > 0) {
                if (self.pools[dbname].follows.length === 1) {
                    conn = self.pools[dbname].follows[0];
                } else {
                    conn = self.pools[dbname].follows[Math.floor(Math.random() * self.pools[dbname].follows.length)];
                }
            } else {
                if (self.pools[dbname].master) {
                    conn = self.pools[dbname].master;
                } else {
                    return reject(Error(`there is no client with ${dbname}`));
                }
            }
            conn.getConnection(function (err, client) {
                if (err) {
                    return reject(err);
                }
                client.query(sql, params, function (err, total) {
                    client.release();
                    if (err) {
                        err.message_body = {
                            sql: sql,
                            params: params
                        };
                        return reject(err);
                    }
                    resolve(total);
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
        sql = this.getSql(sql, opts);
        return this.executeSql(sql, (opts && opts.params) || null, dbname, readonly);
    };


    /**
     * 执行事务sql
     */
    executeSqlTransaction(sql, params, client) {
        return new Promise(function (resolve, reject) {
            client.query(sql, params, function (err, total) {
                if (err) {
                    err.message_body = {
                        sql: sql,
                        params: params
                    };
                    return client.rollback(() => {
                        client.release();
                        reject(err);
                    });
                }
                resolve(total);
            });
        });
    };


    /**
     * 开始执行事务
     */
    beginTransaction(dbname) {
        let self = this;
        return new Promise(function (resolve, reject) {
            let conn = null;
            if (self.pools[dbname].master) {
                conn = self.pools[dbname].master;
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
                    resolve(client);
                });
            });
        });
    }


    /**
     * 事务操作
     */
    execTransaction(sql, opts, client) {
        sql = this.getSql(sql, opts);
        return this.executeSqlTransaction(sql, (opts && opts.params) || null, client);
    }


    /**
     * 提交
     */
    commit(client) {
        return new Promise((resolve, reject) => {
            client.commit(function (err) {
                if (err) {
                    return client.rollback(function () {
                        client.release();
                        reject(err);
                    });
                }
                client.release();
                resolve();
            });
        });
    }


    /**
     * 封装条件查询接口
     * @param sql
     * @param opts   josn -> {set[], where[], params[], groupBy, having[], orderBy [[column, sort]], limit{offset, size}}
     * opts.where 查询时的where 子句， opts.set 更新时的更新选项
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
        if (opts.set && opts.set.length > 0) {
            sql += ' set ';
            for (let i = 0, len = opts.set.length; i < len; ++i) {
                if (i === len - 1) {
                    sql += opts.set[i] + '= ?';
                } else {
                    sql += opts.set[i] + '= ?, ';
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
        if (opts.groupBy) {
            sql += ' group by ' + opts.groupBy;
            if (opts.having && opts.having.length > 0) {
                sql += ' having (';
                for (let i = 0, len = opts.having.length; i < len; ++i) {
                    if (1 === len - 1) {
                        sql += opts.having[i] + ')';
                    } else {
                        sql += opts.having[i] + ') and (';
                    }
                }
            }
        }
        if (opts.orderBy) {
            if (opts.orderBy instanceof Array && opts.orderBy.length > 0) {
                sql += ' order by ';
                for (let i = 0, len = opts.orderBy.length; i < len; i++) {
                    const [column, sort] = opts.orderBy[i];
                    if (i === len - 1) {
                        sql += column + ' ' + (sort || 'desc');
                    } else {
                        sql += column + ' ' + (sort || 'desc') + ', ';
                    }
                }
            } else if (opts.orderBy.column) {
                sql += ' order by ' + opts.orderBy.column + ' ' + (opts.orderBy.sort || 'desc');
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
