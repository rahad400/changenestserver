import express from 'express';

const app = express()
const PORT = 8000


app.get('/',(req,res)=>{
    res.send({message:'server is runing'})
})

// http://localhost:8000
app.listen (PORT,()=>{
    console.log(`server port${PORT}`)
}) 

