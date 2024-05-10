
const express = require('express');
const app = express();
const mysql = require('mysql');
const cors = require('cors');
const bcript = require('bcrypt');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
require('dotenv').config();

// Middleware
app.use(bodyParser.json());
app.use(cors());
app.use(express.json());

// MySQL Connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'todo'
});

// Connect
db.connect((err) => {
  if (err) {
    throw err;
  }
  console.log('MySQL connected');
});

function generateAccessToken(user) {
  return jwt.sign(user, process.env.ACCESS_TOKEN_SECRET);
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization']
  let token = authHeader && authHeader.split(' ')[1]    
  
  if (token === null ) {
      return res.sendStatus(401)
  }    
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
      if (err) return res.sendStatus("this is a error \n",403)            
      req.user = user
      next()
  })
}


//user
app.post('/user/register', async (req, res) => {
    const { username, password, role } = req.body;
    const salt = 10;
    const hashedpass = await bcript.hash(password, salt);
    const sql = 'INSERT INTO users (username, password, role) VALUES (?, ?, ?)';
    db.query(sql, [username, hashedpass, role], (err, result) => {
      if (err) {
        res.status(500).send({ error: err.message });
        return;
      }
      res.status(201).send({ message: 'User created successfully', user_id: result.insertId });
    });
  });

  app.post('/user/login',(req,res)=>{
    
    const username = req.body.username;
    const password = req.body.password;
    const sqlSelect = "SELECT * FROM users WHERE username = '" + username + "';";    
    db.query(sqlSelect,async (err,result)=>{
      try {
        if (result.length > 0) {
          const validpass = await bcript.compare(password, result[0].password);
         console.log(validpass);
          if(validpass===true){                      
            const user = {
              username: result[0].username,
              role: result[0].role
            };

            
            const Token = generateAccessToken(user) 
            console.log(user);
            res.status(201).send({status : "Succesfully Logged in ",Token : Token});
          }
          else{
            res.status(400).send('Invalid Password');
          }
        }
        else{
          res.status(400).send('Invalid Username');
            return;
        }
      } catch (error) {
        res.status(500).send('Request Error');
      }
    })  



  })

  app.get('/users',(req, res) => {


    if (req.role === "admin") {
        const sqlSelect = "SELECT * FROM users";
        db.query(sqlSelect, (err, result) => {
            res.send(result);
        });
    }
    else {
        res.send("Only admin can see the user list");
    }
});



// Create a task
app.post('/tasks',authenticateToken, (req, res) => {
  const { task_id, task_name, user_id , description, status} = req.body;
  // let sqlSelect = "SELECT * FROM users WHERE username = '" + username + "';";    
     
  // db.query(sqlSelect,(err,result)=>{
  //   const user_id = result[0].user_id;
  //   sqlSelect = "SELECT * FROM tasks WHERE user_id = " + user_id + ";"; 
  //   console.log(sqlSelect)
    // db.query(sqlSelect,(err,tasks)=>{
      
     const sqlSelect = `INSERT INTO tasks (task_id, task_name,user_id, description, status) VALUES (?,?,?, ?, ?);`     
  
      db.query(sqlSelect,[task_id, task_name,user_id, description, status],(err,result)=>{
        res.send(result);
      })
    // })
  // })
});

// Read all tasks
app.get('/tasks',authenticateToken, (req, res) => {  
  const username = req.user.username;
  let sqlSelect = "SELECT * FROM users WHERE username = '" + username + "';";    
  db.query(sqlSelect,(err,result)=>{
    const user_id = result[0].user_id;
    sqlSelect = "SELECT * FROM tasks WHERE user_id = '" + user_id + "';"; 
    db.query(sqlSelect, (err, tasks)=>{
      res.status(201).send(tasks);
    })
  })
});

// Update a task
app.put('/tasks/:task_id', (req, res) => {
  const { task_name } = req.body;
  const { task_id } = req.params;
  const sql = 'UPDATE tasks SET task_name = ? WHERE task_id = ?';
  db.query(sql, [task_name, task_id], (err, result) => {
    if (err) {
      res.status(500).send({ error: err.message });
      return;
    }
    res.send({ message: 'Task updated successfully' });
  });
});

// Delete a task
app.delete('/tasks/:task_id', (req, res) => {
  const { task_id } = req.params;
  const sql = 'DELETE FROM tasks WHERE task_id = ?';
  db.query(sql, [task_id], (err, result) => {
    if (err) {
      res.status(500).send({ error: err.message });
      return;
    }
    res.send({ message: 'Task deleted successfully' });
  });
});

// Server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
