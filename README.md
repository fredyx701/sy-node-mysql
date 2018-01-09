# sy-node-mysql
a simple mysql orm


```javascript
const mysql = require('sy-node-mysql');

async function getItems() {
    const sql = `select * from db_test.person where id = ?`;
    const res = await mysql.exec(sql, [100], 'db_test');
    return res[0];
}

getItems().then(data => {
    console.log(data);
});
```
