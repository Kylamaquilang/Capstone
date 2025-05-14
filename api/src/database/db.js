import mysql from 'mysql2/promise';


const db = async () => {
  const connection = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "capstone",
})

connection.connect((err) => {
    if (err) throw err; 
    console.log('mysql connected');
})
}

export default db
