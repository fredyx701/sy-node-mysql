# sy-node-mysql
a simple mysql orm


```javascript
const MySql = require('sy-node-mysql');
const config = require('./example/config.json');
const mysql = new MySql(config);

async function getItems() {
    const sql = `select * from db_one.person where id = ?`;
    const res = await mysql.exec(sql, [100], 'db_one');
    return res[0];
}

getItems().then(data => {
    console.log(data);
});
```
