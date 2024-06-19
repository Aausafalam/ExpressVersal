const express = require('express')

const app = express()

app.use("/",(req,res) => {
 return res.json({message:"Heello world"})
})

app.listen(3500,() => {
    console.log('listening on 3500')
})