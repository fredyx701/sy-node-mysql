const mysql = require('mysql');


class MySqlPool {

    /**
     * @param config   配置内容   {dbs, host, port, user, password}
     */
    constructor(config) {
        this.pool = {};
        for (let info of config) {
            const readOnly = info.readOnly;
            const item = mysql.createPool({
                connectionLimit: 100,
                host: info.host,
                user: info.user,
                password: info.password,
                port: info.port
            });
            for (let name of  info.dbs) {
                name = (readOnly ? 'readOnly:' : '') + name;
                this.pool[name] = item;
            }
        }
    }


    /**
     * 执行sql
     * @param sql
     * @param params
     * @param dbname
     * @param readOnly
     * @return {Promise}
     */
    executeSql(sql, params, dbname, readOnly = false) {
        return new Promise(function (resolve, reject) {
            let conn = null;
            if (readOnly) {
                conn = this.pool['readOnly:' + dbname];
            } else {
                conn = this.pool[dbname];
            }
            conn.getConnection(function (err, client) {
                if (err) {
                    return reject(err);
                }
                client.query(sql, params, function (err, total) {
                    client.release();
                    if (err) {
                        return reject(err);
                    }
                    resolve(total);
                });
            });
        });
    };


    /**
     * 封装条件查询接口
     * @param sql
     * @param opts   josn -> {set[], where[], params[], gropuBy, orderBy{column, sort}, limit{offset, size}}
     * opts.where 查询时的where 子句， opts.set 更新时的更新选项
     * @param dbname
     * @param readOnly 是否从从库读取数据
     * @returns {*}
     */
    exec(sql, opts, dbname, readOnly = false) {
        // 条件sql
        if (opts) {
            // 修改
            if (opts.set && opts.set.length > 0) {
                sql += ' set ';
                for (let i = 0; i < opts.set.length; ++i) {
                    if (i === opts.set.length - 1) {
                        sql += opts.set[i] + '= ? ';
                    } else {
                        sql += opts.set[i] + '= ? , ';
                    }
                }
            }
            // 查询
            if (opts.where && opts.where.length > 0) {
                sql += ' where (';
                for (let i = 0; i < opts.where.length; ++i) {
                    if (i === opts.where.length - 1) {
                        sql += opts.where[i] + ')';
                    } else {
                        sql += opts.where[i] + ') and (';
                    }
                }
            }
            if (opts.groupBy) {
                sql += ' group by ' + opts.groupBy;
            }
            if (opts.orderBy && opts.orderBy.column) {
                sql += ' order by ' + opts.orderBy.column + ' ' + (opts.orderBy.sort || 'desc');
            }
            if (opts.limit) {
                const offset = opts.limit.offset || 0;
                const size = opts.limit.size || 10;
                sql += ' limit ' + offset + ',' + size;
            }
            if (opts.end) {
                sql += opts.end;
            }
            return this.executeSql(sql, opts.params, dbname, readOnly);
        }
        // 非条件sql
        return this.executeSql(sql, null, dbname, readOnly);
    };
}


module.exports = MySqlPool;