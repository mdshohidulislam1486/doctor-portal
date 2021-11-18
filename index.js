const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const { MongoClient } = require('mongodb');
const port = process.env.port || 5000
const ObjectId = require('mongodb').ObjectId
const stripe = require('stripe')(process.env.STRIPE_SECRET)
const fileUpload = require('express-fileupload')


app.use(cors());
app.use(express.json())
app.use(fileUpload())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.pp3lw.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function run(){
 try{
     await client.connect();
     const database = client.db('doctors_portal')
     const appointmentCollection= database.collection('appointments');
     const usersCollcectiion=database.collection('users')
     const doctorsCollection = database.collection('doctors')

     // users: get 
     app.get('/appointments', async (req, res) => {
      const email = req.query.email;
      const date =new Date(req.query.date).toLocaleDateString(); 
      const query = { email: email, date: date }
      const cursor = appointmentCollection.find(query);
      const appointments = await cursor.toArray();
      res.json(appointments);
  })

  //  get appointment with id 
  app.get('/appointments/:id', async(req, res)=>{
    const id = req.params.id;
    const query = {_id:ObjectId(id)}
    const result = await appointmentCollection.findOne(query)
    res.json(result)
  })



     // user : post appointment 
     app.post('/appointments', async (req, res) =>{
       const appointments = req.body;
       const result = await appointmentCollection.insertOne(appointments)
       console.log(result)
       res.json(result)
     })

     app.put('/appointments/:id', async (req, res)=>{
       const id = req.params.id;
       const payment = req.body;
       const filter = {_id:ObjectId(id)}
       const updateDoc= {
         $set:{
           payment: payment
         }
       }
       const result = await appointmentCollection.updateOne(filter, updateDoc);
       res.json(result)
     })

    app.get('/users/:email', async (req, res)=>{
      const email = req.params.email
      const query ={email:email}
      const user = await usersCollcectiion.findOne(query)
      let isAdmin= false;
      if(user.role ==='admin'){
        isAdmin= true;
      }
      res.json({admin:isAdmin})
    })
     
    // post a new doctors 
    app.post('/doctors', async(req, res)=>{
      const name = req.body.name;
      const email = req.body.email;
      const pic = req.files.image;
      const picData = pic?.data;
      const encodePic = picData.toString('base64')
      const imageBuffer = Buffer.from(encodePic, 'base64')
      const doctor = {
        name, 
        email,
        image: imageBuffer
      }

      const result = await doctorsCollection.insertOne(doctor)
      res.json(result)

    })

    // get doctor 

    app.get('/doctors', async(req, res)=>{
      const cursor= doctorsCollection.find({})
      const doctors = await cursor.toArray()
      res.json(doctors)
    })



    //  post user data 
    app.post('/users', async (req, res)=>{
      const user = req.body;
      const result = await usersCollcectiion.insertOne(user)
      console.log(result)
      res.json(result);
    })

    app.put('/users', async (req, res)=>{
      const user = req.body;
      const filter = {email: user.email}
      const options ={upsert:true}
      const updateDoc = {$set: user}
      const result = await usersCollcectiion.updateOne(filter, updateDoc, options)
      res.json(result)
    })

    app.put('/users/admin', async (req, res)=>{
      const user = req.body;
      const filter = {email: user.email};
      const updateDoc = {$set:{role:'admin'}} 
      const result = await usersCollcectiion.updateOne(filter, updateDoc)
      res.json(result)
    })

    app.post('/create-payment-intent', async (req, res)=>{
      const paymentInfo = req.body;
      const amount = paymentInfo.price * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        currency:'usd',
        amount: amount,
        payment_method_types:['card']

      })
      res.json({clientSecret:paymentIntent.client_secret })
    })

 }
 finally{


    // await client.close();
 }

}

run().catch(console.dir)

app.get('/', (req, res) => {
  res.send('Hello Doctors portal')
})

app.listen(port, () => {
  console.log(`Listening at port  ${port}`)
})