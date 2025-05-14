import query from '../database/db.js'

export const getUser = async () => {
    try {
  const [results, fields] = await connection.query(
    'SELECT * FROM users'
  );

  console.log(results); // results contains rows returned by server
  console.log(fields); // fields contains extra meta data about results, if available
} catch (err) {
  console.log(err);
}

}